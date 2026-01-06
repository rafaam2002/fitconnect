import {EntityManager} from '@mikro-orm/core';
import {BaseService} from './BaseService.js';
import {User} from '../entities/User';
import {RefreshToken} from '../entities/RefreshToken';
import {Company} from '../entities/Company';
import {PermissionService} from './PermissionService';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import {GraphQLError} from 'graphql';
import {UserProviderType} from '../types/enums';
import {generateTempPassword, verifyGoogleToken} from '../utils/users';
import {changePasswordHtml} from '../utils/emailHtml';
import {ChangePasswordSchema} from '../validation/schemas';
import {CustomResponse} from "../graphql/resolvers/errors";

// ============= INTERFACES =============

export interface LoginInput {
    emailOrNickname: string;
    password: string;
}

export interface LoginWithCompanyInput {
    emailOrNickname: string;
    password: string;
    companyId: string;
}

export interface GoogleLoginInput {
    id_token: string;
}

export interface SelectCompanyInput {
    userId: string;
    companyId: string;
}

export interface UpdatePasswordInput {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export interface AuthResponse {
    success: boolean;
    code: string;
    message: string;
    data?: {
        user?: User;
        company?: Company;
        companies?: Company[];
        tokens?: {
            token: string;
            refreshToken: string;
        };
        subscription?: {
            hasActive: boolean;
            planName: string | null;
            status: string | null;
            isInTrial: boolean;
            trialEndsAt: Date | null;
        };
        permissions?: string[];
    };
}

interface TokenPair {
    token: string;
    refreshToken: string;
}

// ============= EMAIL TRANSPORTER =============

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS,
    },
});

// ============= AUTH SERVICE =============

export class AuthService extends BaseService {
    private permissionService: PermissionService;

    constructor(em: EntityManager) {
        super(em);
        this.permissionService = new PermissionService(em);
    }

    /**
     * Login inicial - devuelve empresas si el usuario pertenece a más de una
     */
    async login(input: LoginInput): Promise<AuthResponse> {
        const {emailOrNickname, password} = input;

        try {
            const user = await this.findUserByEmailOrNickname(emailOrNickname, [
                'password',
                'companies',
                'schedules.id',
                'schedules.startDate'
            ]);

            if (!user) {
                return CustomResponse(400, 'Invalid email/nickname or password', false);
            }

            const isMatch = await user.checkPassword(password);
            if (!isMatch) {
                return CustomResponse(400, 'Invalid email/nickname or password', false);
            }

            const companies = user.companies.getItems();

            // Si el usuario no tiene empresas
            if (companies.length === 0) {
                return CustomResponse(400, 'User has no associated companies', false);
            }

            // Si tiene solo una empresa, hacer login completo automáticamente
            if (companies.length === 1) {
                return await this.loginWithCompany({
                    emailOrNickname,
                    password,
                    companyId: companies[0].id
                });
            }

            // Si tiene múltiples empresas, devolver lista para que seleccione
            const tokens = await this.createTokensPair(user);

            return {
                success: true,
                code: '200',
                message: 'User needs to select company',
                data: {
                    user,
                    companies,
                    tokens,
                },
            };

        } catch (error) {
            console.error('Login error:', error);
            return CustomResponse(500, 'Login failed', false);
        }
    }

    /**
     * Login con empresa específica - incluye permisos
     */
    async loginWithCompany(input: LoginWithCompanyInput): Promise<AuthResponse> {
        const {emailOrNickname, password, companyId} = input;

        try {
            const user = await this.findUserByEmailOrNickname(emailOrNickname, [
                'password',
                'companies'
            ]);

            if (!user) {
                return CustomResponse(400, 'Invalid email/nickname or password', false);
            }

            const isMatch = await user.checkPassword(password);
            if (!isMatch) {
                return CustomResponse(400, 'Invalid email/nickname or password', false);
            }

            // Validar acceso a la empresa
            const company = await this.validateCompanyAccess(user, companyId);
            if (!company) {
                return CustomResponse(403, 'User does not belong to this company', false);
            }

            // Construir respuesta con permisos y tokens
            return await this.buildAuthResponseWithPermissions(
                user,
                company,
                'Login successful'
            );

        } catch (error) {
            console.error('Login with company error:', error);
            return CustomResponse(500, 'Login failed', false);
        }
    }

    /**
     * Seleccionar empresa después del login inicial
     */
    async selectCompany(input: SelectCompanyInput): Promise<AuthResponse> {
        const {userId, companyId} = input;

        try {
            const user = await this.em.findOne(User, {id: userId}, {
                populate: ['companies']
            });

            if (!user) {
                return CustomResponse(404, 'User not found', false);
            }

            // Validar acceso a la empresa
            const company = await this.validateCompanyAccess(user, companyId);
            if (!company) {
                return CustomResponse(403, 'User does not belong to this company', false);
            }

            // Construir respuesta con permisos y tokens
            return await this.buildAuthResponseWithPermissions(
                user,
                company,
                'Company selected successfully'
            );

        } catch (error) {
            console.error('Select company error:', error);
            return CustomResponse(500, 'Failed to select company', false);
        }
    }

    /**
     * Login con Google
     */
    async loginWithGoogle(input: GoogleLoginInput): Promise<AuthResponse> {
        const {id_token} = input;

        try {
            const googleData = await verifyGoogleToken(id_token);

            if (!googleData) {
                return CustomResponse(401, 'Invalid Google token', false);
            }

            const {email, name} = googleData;

            // Buscar o crear usuario
            let user = await this.findOrCreateGoogleUser(email!, name);

            const companies = user.companies.getItems();

            // Si no tiene empresas
            if (companies.length === 0) {
                const tokens = await this.createTokensPair(user);

                return {
                    success: true,
                    code: '200',
                    message: 'User logged in but has no companies',
                    data: {
                        user,
                        companies: [],
                        tokens,
                    },
                };
            }

            // Si tiene una empresa, login completo
            if (companies.length === 1) {
                return await this.buildAuthResponseWithPermissions(
                    user,
                    companies[0],
                    'Login successful'
                );
            }

            // Si tiene múltiples empresas
            const tokens = await this.createTokensPair(user);

            return {
                success: true,
                code: '200',
                message: 'User needs to select company',
                data: {
                    user,
                    companies,
                    tokens,
                },
            };

        } catch (error) {
            console.error('Google login error:', error);
            return CustomResponse(500, 'Google login failed', false);
        }
    }

    /**
     * Login con ID (para testing/desarrollo)
     */
    async loginWithId(userId: string): Promise<AuthResponse> {
        try {
            const user = await this.em.findOne(User, {id: userId}, {
                populate: ['companies']
            });

            if (!user) {
                return CustomResponse(404, 'User not found', false);
            }

            return await this.login({
                emailOrNickname: user.email!,
                password: process.env.DEFAULT_PASSWORD || '123456'
            });

        } catch (error) {
            console.error('Login with ID error:', error);
            return CustomResponse(500, 'Login failed', false);
        }
    }

    /**
     * Olvidé mi contraseña
     */
    async forgotPassword(email: string): Promise<AuthResponse> {
        try {
            const user = await this.em.findOne(User, {email});

            if (!user) {
                return CustomResponse(404, 'No user found with that email', false);
            }

            const resetToken = jwt.sign(
                {id: user.id},
                process.env.JWT_SECRET!,
                {expiresIn: '30m'}
            );

            console.log(`Reset token for ${email}: ${resetToken}`);

            // TODO: Enviar email con resetToken
            // await this.sendPasswordResetEmail(email, resetToken);

            return CustomResponse(200, 'Password reset email sent', true);

        } catch (error) {
            console.error('Forgot password error:', error);
            return CustomResponse(500, 'Failed to process password reset', false);
        }
    }

    /**
     * Actualizar contraseña
     */
    async updatePassword(
        userId: string,
        input: UpdatePasswordInput
    ): Promise<AuthResponse> {
        const {currentPassword, newPassword, confirmPassword} = input;

        try {
            // Validar con Zod
            ChangePasswordSchema.parse({
                currentPassword,
                newPassword,
                confirmPassword,
            });

            const user = await this.em.findOne(
                User,
                {id: userId},
                {populate: ['password']}
            );

            if (!user) {
                return CustomResponse(404, 'User not found', false);
            }

            const passwordCorrect = await bcrypt.compare(
                currentPassword,
                user.password || ''
            );

            if (!passwordCorrect) {
                return CustomResponse(400, 'Current password is incorrect', false);
            }

            user.password = await bcrypt.hash(newPassword, 10);
            await this.em.flush();

            return CustomResponse(200, 'Password changed successfully', true);

        } catch (error: any) {
            console.error('Update password error:', error);

            if (error.name === 'ZodError') {
                return CustomResponse(400, 'Validation error', false);
            }

            return CustomResponse(500, 'Failed to update password', false);
        }
    }

    /**
     * Enviar email para cambio de contraseña
     */
    async sendChangePasswordEmail(email: string): Promise<AuthResponse> {
        try {
            const tmpPassword = generateTempPassword(6);

            const payload = {
                email: email,
                purpose: 'reset-password',
                password: tmpPassword,
            };

            const token = jwt.sign(
                payload,
                process.env.JWT_SECRET!,
                {expiresIn: '30m'}
            );

            await transporter.sendMail({
                from: process.env.GMAIL_USER,
                to: email,
                subject: 'Change your password',
                html: changePasswordHtml(token, tmpPassword),
            });

            return CustomResponse(200, 'Change password email sent', true);

        } catch (error) {
            console.error('Send change password email error:', error);
            return CustomResponse(500, 'Failed to send email', false);
        }
    }

    /**
     * Obtener usuario actual con todas sus empresas y permisos
     */
    async getCurrentUser(userId: string): Promise<any> {
        const user = await this.em.findOne(User, {id: userId}, {
            populate: ['companies']
        });

        if (!user) {
            throw new GraphQLError('User not found', {
                extensions: {code: 'NOT_FOUND'}
            });
        }

        const companiesWithPermissions = await this.permissionService.getUserCompaniesWithPermissions(userId);

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            surname: user.surname,
            nickname: user.nickname,
            activeCompanyId: user.activeCompanyId,
            companies: companiesWithPermissions,
        };
    }

    /**
     * Refresh token
     */
    async refreshAccessToken(refreshTokenString: string): Promise<AuthResponse> {
        try {
            const refreshToken = await this.em.findOne(RefreshToken, {
                token: refreshTokenString
            }, {
                populate: ['user', 'user.companies']
            });

            if (!refreshToken) {
                return CustomResponse(401, 'Invalid refresh token', false);
            }

            if (refreshToken.expiresAt < new Date()) {
                return CustomResponse(401, 'Refresh token expired', false);
            }

            const user = refreshToken.user;
            const companyId = user.activeCompanyId;

            if (!companyId) {
                // Si no hay empresa activa, devolver token básico
                const token = this.generateAccessToken({id: user.id});

                return {
                    success: true,
                    code: '200',
                    message: 'Token refreshed',
                    data: {
                        tokens: {
                            token,
                            refreshToken: refreshTokenString,
                        },
                    },
                };
            }

            // Si hay empresa activa, incluir permisos
            const permissionsContext = await this.permissionService.getLoginPermissionsContext(
                user.id,
                companyId
            );

            const tokenPayload = {
                id: user.id,
                userId: user.id,
                email: user.email,
                companyId: companyId,
                permissions: permissionsContext.permissionNames,
            };

            const token = this.generateAccessToken(tokenPayload);

            return {
                success: true,
                code: '200',
                message: 'Token refreshed',
                data: {
                    tokens: {
                        token,
                        refreshToken: refreshTokenString,
                    },
                    permissions: permissionsContext.permissionNames,
                },
            };

        } catch (error) {
            console.error('Refresh token error:', error);
            return CustomResponse(500, 'Failed to refresh token', false);
        }
    }

    // ============= MÉTODOS PRIVADOS HELPER (ELIMINAN DUPLICACIÓN) =============

    /**
     * Buscar usuario por email o nickname
     */
    private async findUserByEmailOrNickname(
        emailOrNickname: string,
        populate: string[] = []
    ): Promise<User | null> {
        return await this.em.findOne(
            User,
            {
                $or: [
                    {email: emailOrNickname},
                    {nickname: emailOrNickname}
                ],
            },
            {
                populate: populate as any,
                filters: false,
            } as const
        );
    }

    /**
     * Buscar o crear usuario de Google
     */
    private async findOrCreateGoogleUser(email: string, name?: string): Promise<User> {
        let user = await this.em.findOne(
            User,
            {email},
            {populate: ['companies'], filters: false}
        );

        if (!user) {
            const newUser = this.em.create(User, {
                email,
                name,
                nickname: email.split('@')[0],
                provider: UserProviderType.GOOGLE,
                isActive: true,
                isBlocked: false,
                isVerified: true,
                fullName: name || ""
            });
            await this.em.persistAndFlush(newUser);

            // Volver a buscar para tener las relaciones cargadas
            user = await this.em.findOne(
                User,
                {email},
                {populate: ['companies'], filters: false}
            );

            if (!user) {
                throw new GraphQLError('Failed to create user', {
                    extensions: {code: 'INTERNAL_SERVER_ERROR'}
                });
            }
        }

        return user;
    }

    /**
     * Validar que el usuario tiene acceso a la empresa
     */
    private async validateCompanyAccess(user: User, companyId: string): Promise<Company | null> {
        const belongsToCompany = user.companies.getItems().some(c => c.id === companyId);

        if (!belongsToCompany) {
            return null;
        }

        const company = await this.em.findOne(Company, {id: companyId}, {filters: false});

        if (!company) {
            return null;
        }

        return company;
    }

    /**
     * Crear par de tokens (access + refresh)
     */
    private async createTokensPair(
        user: User,
        includePermissions: boolean = false,
        companyId?: string,
        permissionNames?: string[]
    ): Promise<TokenPair> {
        const tokenPayload: any = {
            id: user.id,
            userId: user.id,
            email: user.email,
        };

        if (includePermissions && companyId && permissionNames) {
            tokenPayload.companyId = companyId;
            tokenPayload.permissions = permissionNames;
        }

        const token = this.generateAccessToken(tokenPayload);
        const refreshTokenString = crypto.randomBytes(64).toString('hex');

        const refreshToken = this.em.create(RefreshToken, {
            user,
            token: refreshTokenString,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
        });

        await this.em.persistAndFlush(refreshToken);

        return {
            token,
            refreshToken: refreshTokenString,
        };
    }

    /**
     * Construir respuesta de autenticación completa con permisos
     */
    private async buildAuthResponseWithPermissions(
        user: User,
        company: Company,
        message: string
    ): Promise<AuthResponse> {
        // Obtener permisos del usuario en esta empresa
        const permissionsContext = await this.permissionService.getLoginPermissionsContext(
            user.id,
            company.id
        );

        // Crear tokens con permisos incluidos
        const tokens = await this.createTokensPair(
            user,
            true,
            company.id,
            permissionsContext.permissionNames
        );

        // Actualizar empresa activa
        user.activeCompanyId = company.id;
        await this.em.flush();

        // Agregar permisos y subscription al objeto user para retrocompatibilidad
        Object.assign(user, {
            subscription: {
                hasActive: permissionsContext.hasActiveSubscription,
                planName: permissionsContext.plan?.name || null,
                status: permissionsContext.subscriptionStatus,
                isInTrial: permissionsContext.isInTrial || false,
                trialEndsAt: permissionsContext.trialEndsAt || null,
            },
            permissions: permissionsContext.permissionNames,
        });

        return {
            success: true,
            code: '200',
            message,
            data: {
                user,
                company,
                tokens,
                subscription: {
                    hasActive: permissionsContext.hasActiveSubscription,
                    planName: permissionsContext.plan?.name || null,
                    status: permissionsContext.subscriptionStatus,
                    isInTrial: permissionsContext.isInTrial || false,
                    trialEndsAt: permissionsContext.trialEndsAt || null,
                },
                permissions: permissionsContext.permissionNames,
            },
        };
    }

    /**
     * Generar access token JWT
     */
    private generateAccessToken(payload: any): string {
        return jwt.sign(payload, process.env.JWT_SECRET!, {
            expiresIn: '30m',
        });
    }
}