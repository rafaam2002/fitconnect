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
            const user = await this.em.findOne(
                User,
                {
                    $or: [
                        {email: emailOrNickname},
                        {nickname: emailOrNickname}
                    ],
                },
                {
                    populate: ['password', 'companies', "schedules.id", "schedules.startDate"],
                    filters: false,
                } as const
            );

            if (!user) {
                return CustomResponse(400, 'Invalid email/nickname or password', false)
            }

            const isMatch = await user.checkPassword(password);

            if (!isMatch) {
                return CustomResponse(400, 'Invalid email/nickname or password', false)
            }

            const companies = user.companies.getItems();

            // Si el usuario no tiene empresas
            if (companies.length === 0) {
                return {
                    success: false,
                    code: '400',
                    message: 'User has no associated companies',
                };
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
            const token = this.generateAccessToken({id: user.id});
            const refreshTokenString = crypto.randomBytes(64).toString('hex');
            const refreshToken = this.em.create(RefreshToken, {
                user,
                token: refreshTokenString,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            await this.em.persistAndFlush(refreshToken);

            return {
                success: true,
                code: '200',
                message: 'User needs to select company',
                data: {
                    user,
                    companies,
                    tokens: {
                        token,
                        refreshToken: refreshTokenString,
                    },
                },
            };

        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                code: '500',
                message: 'Login failed',
            };
        }
    }

    /**
     * Login con empresa específica - incluye permisos
     */
    async loginWithCompany(input: LoginWithCompanyInput): Promise<AuthResponse> {
        const {emailOrNickname, password, companyId} = input;

        try {
            const user = await this.em.findOne(
                User,
                {
                    $or: [
                        {email: emailOrNickname},
                        {nickname: emailOrNickname}
                    ],
                },
                {
                    populate: ['password', 'companies'],
                    filters: false,
                } as const
            );

            if (!user) {
                return CustomResponse(400, 'Invalid email/nickname or password', false)
            }

            const passwordCorrect = await user.checkPassword(password);

            if (!passwordCorrect) {
                return {
                    success: false,
                    code: '400',
                    message: 'Invalid email/nickname or password',
                };
            }

            // Verificar que el usuario pertenece a la empresa
            const belongsToCompany = user.companies.getItems().some(c => c.id === companyId);
            if (!belongsToCompany) {
                return {
                    success: false,
                    code: '403',
                    message: 'User does not belong to this company',
                };
            }

            const company = await this.em.findOne(Company, {id: companyId}, {filters: false});
            if (!company) {
                return {
                    success: false,
                    code: '404',
                    message: 'Company not found',
                };
            }

            // Obtener permisos del usuario en esta empresa
            const permissionsContext = await this.permissionService.getLoginPermissionsContext(
                user.id,
                companyId
            );

            // Generar tokens con permisos incluidos
            const tokenPayload = {
                id: user.id,
                userId: user.id,
                email: user.email,
                companyId: companyId,
                permissions: permissionsContext.permissionNames,
                subscriptionStatus: permissionsContext.subscriptionStatus
            };

            const token = this.generateAccessToken(tokenPayload);
            const refreshTokenString = crypto.randomBytes(64).toString('hex');
            const refreshToken = this.em.create(RefreshToken, {
                user,
                token: refreshTokenString,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            await this.em.persistAndFlush(refreshToken);

            // Actualizar empresa activa del usuario
            user.activeCompanyId = companyId;
            await this.em.flush();

            Object.assign(user, {
                subscription: {
                    hasActive: permissionsContext.hasActiveSubscription,
                    planName: permissionsContext.plan?.name || null,
                    status: permissionsContext.subscriptionStatus,
                    isInTrial: permissionsContext.isInTrial || false,
                    trialEndsAt: permissionsContext.trialEndsAt || null,
                },
                permissions: permissionsContext.permissionNames,
            })
            return {
                success: true,
                code: '200',
                message: 'Login successful',
                data: {
                    user,
                    company,
                    tokens: {
                        token,
                        refreshToken: refreshTokenString,
                    },
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

        } catch (error) {
            console.error('Login with company error:', error);
            return {
                success: false,
                code: '500',
                message: 'Login failed',
            };
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
                return {
                    success: false,
                    code: '404',
                    message: 'User not found',
                };
            }

            const belongsToCompany = user.companies.getItems().some(c => c.id === companyId);
            if (!belongsToCompany) {
                return {
                    success: false,
                    code: '403',
                    message: 'User does not belong to this company',
                };
            }

            const company = await this.em.findOne(Company, {id: companyId});
            if (!company) {
                return {
                    success: false,
                    code: '404',
                    message: 'Company not found',
                };
            }

            // Obtener permisos
            const permissionsContext = await this.permissionService.getLoginPermissionsContext(
                userId,
                companyId
            );

            const tokenPayload = {
                id: user.id,
                userId: user.id,
                email: user.email,
                companyId: companyId,
                permissions: permissionsContext.permissionNames,
                subscriptionStatus: permissionsContext.subscriptionStatus
            };

            const token = this.generateAccessToken(tokenPayload);
            const refreshTokenString = crypto.randomBytes(64).toString('hex');
            const refreshToken = this.em.create(RefreshToken, {
                user,
                token: refreshTokenString,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            await this.em.persistAndFlush(refreshToken);

            user.activeCompanyId = companyId;
            await this.em.flush();

            return {
                success: true,
                code: '200',
                message: 'Company selected successfully',
                data: {
                    user,
                    company,
                    tokens: {
                        token,
                        refreshToken: refreshTokenString,
                    },
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

        } catch (error) {
            console.error('Select company error:', error);
            return {
                success: false,
                code: '500',
                message: 'Failed to select company',
            };
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
                return {
                    success: false,
                    code: '401',
                    message: 'Invalid Google token',
                };
            }

            const {email, name} = googleData;

            let user = await this.em.findOne(
                User,
                {email},
                {populate: ['companies'], filters: false}
            );

            // Si no existe, crear usuario
            if (!user) {
                const newUser = this.em.create(User, {
                    email,
                    name,
                    nickname: email!.split('@')[0] as string,
                    provider: UserProviderType.GOOGLE,
                    isActive: true,
                    isBlocked: false,
                    isVerified: true,
                    fullName: name && name || ""
                });
                await this.em.persistAndFlush(newUser);
            }

            user = await this.em.findOne(
                User,
                {email},
                {populate: ['companies'], filters: false}
            );

            if (!user) {
                throw new GraphQLError('User not found', {
                    extensions: {code: 'NOT_FOUND'}
                });
            }
            const companies = user.companies.getItems();

            // Si no tiene empresas
            if (companies.length === 0) {
                const token = this.generateAccessToken({id: user.id});
                const refreshTokenString = crypto.randomBytes(64).toString('hex');
                const refreshToken = this.em.create(RefreshToken, {
                    user,
                    token: refreshTokenString,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                });

                await this.em.persistAndFlush(refreshToken);

                return {
                    success: true,
                    code: '200',
                    message: 'User logged in but has no companies',
                    data: {
                        user,
                        companies: [],
                        tokens: {
                            token,
                            refreshToken: refreshTokenString,
                        },
                    },
                };
            }

            // Si tiene una empresa, login completo
            if (companies.length === 1) {
                const companyId = companies[0].id;
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
                const refreshTokenString = crypto.randomBytes(64).toString('hex');
                const refreshToken = this.em.create(RefreshToken, {
                    user,
                    token: refreshTokenString,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                });

                await this.em.persistAndFlush(refreshToken);

                user.activeCompanyId = companyId;
                await this.em.flush();

                return {
                    success: true,
                    code: '200',
                    message: 'Login successful',
                    data: {
                        user,
                        company: companies[0],
                        tokens: {
                            token,
                            refreshToken: refreshTokenString,
                        },
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

            // Si tiene múltiples empresas
            const token = this.generateAccessToken({id: user.id});
            const refreshTokenString = crypto.randomBytes(64).toString('hex');
            const refreshToken = this.em.create(RefreshToken, {
                user,
                token: refreshTokenString,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            await this.em.persistAndFlush(refreshToken);

            return {
                success: true,
                code: '200',
                message: 'User needs to select company',
                data: {
                    user,
                    companies,
                    tokens: {
                        token,
                        refreshToken: refreshTokenString,
                    },
                },
            };

        } catch (error) {
            console.error('Google login error:', error);
            return {
                success: false,
                code: '500',
                message: 'Google login failed',
            };
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
                return {
                    success: false,
                    code: '404',
                    message: 'User not found',
                };
            }

            // Usar password por defecto
            return await this.login({
                emailOrNickname: user.email!,
                password: process.env.DEFAULT_PASSWORD || '123456'
            });

        } catch (error) {
            console.error('Login with ID error:', error);
            return {
                success: false,
                code: '500',
                message: 'Login failed',
            };
        }
    }

    /**
     * Olvidé mi contraseña
     */
    async forgotPassword(email: string): Promise<AuthResponse> {
        try {
            const user = await this.em.findOne(User, {email});

            if (!user) {
                return {
                    success: false,
                    code: '404',
                    message: 'No user found with that email',
                };
            }

            const resetToken = jwt.sign(
                {id: user.id},
                process.env.JWT_SECRET!,
                {expiresIn: '30m'}
            );

            console.log(`Reset token for ${email}: ${resetToken}`);

            // Aquí puedes enviar el email con el resetToken
            // await this.sendPasswordResetEmail(email, resetToken);

            return {
                success: true,
                code: '200',
                message: 'Password reset email sent',
            };

        } catch (error) {
            console.error('Forgot password error:', error);
            return {
                success: false,
                code: '500',
                message: 'Failed to process password reset',
            };
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
                return {
                    success: false,
                    code: '404',
                    message: 'User not found',
                };
            }

            const passwordCorrect = await bcrypt.compare(
                currentPassword,
                user.password || ''
            );

            if (!passwordCorrect) {
                return {
                    success: false,
                    code: '400',
                    message: 'Current password is incorrect',
                };
            }

            user.password = await bcrypt.hash(newPassword, 10);
            await this.em.flush();

            return {
                success: true,
                code: '200',
                message: 'Password changed successfully',
            };

        } catch (error: any) {
            console.error('Update password error:', error);

            if (error.name === 'ZodError') {
                return {
                    success: false,
                    code: '400',
                    message: 'Validation error',
                };
            }

            return {
                success: false,
                code: '500',
                message: 'Failed to update password',
            };
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

            return {
                success: true,
                code: '200',
                message: 'Change password email sent',
            };

        } catch (error) {
            console.error('Send change password email error:', error);
            return {
                success: false,
                code: '500',
                message: 'Failed to send email',
            };
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
                return {
                    success: false,
                    code: '401',
                    message: 'Invalid refresh token',
                };
            }

            if (refreshToken.expiresAt < new Date()) {
                return {
                    success: false,
                    code: '401',
                    message: 'Refresh token expired',
                };
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
            return {
                success: false,
                code: '500',
                message: 'Failed to refresh token',
            };
        }
    }

    // ============= HELPERS PRIVADOS =============

    private generateAccessToken(payload: any): string {
        return jwt.sign(payload, process.env.JWT_SECRET!, {
            expiresIn: '30m',
        });
    }
}