import crypto from 'node:crypto';

import { EntityManager } from '@mikro-orm/core';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { Company } from '../entities/Company';
import { RefreshToken } from '../entities/RefreshToken';
import { User } from '../entities/User';
import { EmailConfig, ServiceResponse, TokenPair } from '../types/common.type';
import { UserProviderType } from '../types/enums';
import {
  BadRequestError,
  createServiceResponse,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../utils/errors.util';
import { changePasswordHtml } from '../utils/templates.util';
import { generateTempPassword, verifyGoogleToken } from '../utils/users';
import { ChangePasswordSchema } from '../validation/schemas';

import { BaseService } from './base.service';
import { EmailService } from './email.service';
import { PermissionService } from './permission.service';

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

// ============= AUTH SERVICE =============
/**
 * Service para manejar operaciones de usuarios
 *
 * @remarks
 * Este servicio maneja autenticación, generación de Tokens
 * para la entidad User. Login por OAuth.
 *
 * @example
 * ```typescript
 * const user = await login(loginInput);
 * ```
 */
export class AuthService extends BaseService {
  private readonly permissionService: PermissionService;
  private readonly emailService: EmailService;
  private readonly jwtSecret: string;
  private readonly accessTokenExpiry: jwt.SignOptions['expiresIn'] = '1d';
  private readonly refreshTokenExpiry: number = 30 * 24 * 60 * 60 * 1000;

  constructor(em: EntityManager) {
    super(em);
    this.permissionService = new PermissionService(em);
    this.emailService = this.emailService = EmailService.getInstance();

    this.jwtSecret = process.env.JWT_SECRET!;

    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
  }

  /**
   * Login inicial - devuelve empresas si el usuario pertenece a más de una
   */
  async login(input: LoginInput): Promise<ServiceResponse> {
    const { emailOrNickname, password } = input;

    const user = await this.findUserByEmailOrNickname(emailOrNickname, [
      'password',
      'companies',
      'companies.companyConfig',
    ]);

    if (!user) {
      throw new ValidationError('Invalid email/nickname or password');
    }

    const isMatch = await user.checkPassword(password);
    if (!isMatch) {
      throw new ValidationError('Invalid email/nickname or password');
    }

    const companies = user.companies.getItems();

    // Si el usuario no tiene empresas (puede logearse sin empresa)
    // if (companies.length === 0) {
    //   throw new ValidationError('User has no associated companies');
    // }

    // Si tiene solo una empresa, hacer login completo automáticamente
    // if (companies.length === 1) {
    //   const data = await this.loginWithCompany({
    //     emailOrNickname,
    //     password,
    //     companyId: companies[0].id,
    //   });
    // }

    if (!user.activeCompanyId && companies.length > 0) {
      //si el usuario tiene empresas pero no esta activo en ninguna, se activa en la primera
      //(este caso en realidad nunca puede pasar, pero con los mocks de los seeders si pasa)
      user.activeCompanyId = companies[0].id;
      this.em.persist(user);
      await this.em.flush();
    }

    // Si tiene múltiples empresas, devolver lista para que seleccione
    const tokens: TokenPair = await this.createTokensPair(user);
    const data = {
      user,
      companies,
      tokens,
    };

    const activeCompany = companies.find(c => c.id === user.activeCompanyId);

    // si tiene empresa hace login con permisos, si no login normal
    return activeCompany
      ? await this.buildAuthResponseWithPermissions(
          user,
          activeCompany,
          'Login successful'
        )
      : createServiceResponse(200, 'logging successfully', true, data);
  }

  /**
   * Login con empresa específica - incluye permisos
   */
  async loginWithCompany(
    input: LoginWithCompanyInput
  ): Promise<ServiceResponse> {
    const { emailOrNickname, password, companyId } = input;

    const user = await this.findUserByEmailOrNickname(emailOrNickname, [
      'password',
      'companies',
    ]);

    if (!user) {
      throw new BadRequestError('Invalid email/nickname or password');
    }

    const isMatch = await user.checkPassword(password);
    if (!isMatch) {
      throw new BadRequestError('Invalid email/nickname or password');
    }

    // Validar acceso a la empresa
    const company = await this.validateCompanyAccess(user, companyId);
    if (!company) {
      throw new ForbiddenError('User does not belong to this company');
    }

    // Construir respuesta con permisos y tokens
    return await this.buildAuthResponseWithPermissions(
      user,
      company,
      'Login successful'
    );
  }

  /**
   * Seleccionar empresa después del login inicial
   */
  async selectCompany(input: SelectCompanyInput): Promise<ServiceResponse> {
    const { userId, companyId } = input;
    const user = await this.em.findOne(
      User,
      { id: userId },
      {
        populate: ['companies'],
      }
    );

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Validar acceso a la empresa
    const company = await this.validateCompanyAccess(user, companyId);
    if (!company) {
      throw new ForbiddenError('User does not belong to this company');
    }

    // Construir respuesta con permisos y tokens
    return await this.buildAuthResponseWithPermissions(
      user,
      company,
      'Company selected successfully'
    );
  }

  /**
   * Login con Google
   */
  async loginWithGoogle(input: GoogleLoginInput): Promise<ServiceResponse> {
    const { id_token } = input;

    const googleData = await verifyGoogleToken(id_token);

    if (!googleData) {
      throw new UnauthorizedError('Invalid Google token');
    }

    const { email, name } = googleData;

    // Buscar o crear usuario
    let user = await this.findOrCreateGoogleUser(email!, name);

    const companies = user.companies.getItems();

    // Si no tiene empresas
    if (companies.length === 0) {
      const tokens = await this.createTokensPair(user);

      return createServiceResponse(
        200,
        'User logged in but has no companies',
        true,
        {
          user,
          companies: [],
          tokens,
        }
      );
    }

    if (!user.activeCompanyId && companies.length > 0) {
      //si el usuario tiene empresas pero no esta activo en ninguna, se activa en la primera
      //(este caso en realidad nunca puede pasar, pero con los mocks de los seeders si pasa)
      user.activeCompanyId = companies[0].id;
      this.em.persist(user);
      await this.em.flush();
    }

    // Si tiene múltiples empresas, devolver lista para que seleccione
    const tokens: TokenPair = await this.createTokensPair(user);
    const data = {
      user,
      companies,
      tokens,
    };

    const activeCompany = companies.find(c => c.id === user.activeCompanyId);

    // si tiene empresa hace login con permisos, si no login normal
    return activeCompany
      ? await this.buildAuthResponseWithPermissions(
          user,
          activeCompany,
          'Login successful'
        )
      : createServiceResponse(200, 'logging successfully', true, data);
  }

  /**
   * Login con ID (para testing/desarrollo)
   */
  async loginWithId(userId: string): Promise<ServiceResponse> {
    const user = await this.em.findOne(
      User,
      { id: userId },
      {
        populate: ['companies'],
      }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    return await this.login({
      emailOrNickname: user.email!,
      password: process.env.DEFAULT_PASSWORD || '123456',
    });
  }

  /**
   * Olvidé mi contraseña
   */
  async forgotPassword(email: string): Promise<ServiceResponse> {
    const user = await this.em.findOne(User, { email });

    if (!user) {
      throw new NotFoundError('User');
    }

    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '30m',
    });

    console.log(`Reset token for ${email}: ${resetToken}`);

    return createServiceResponse(200, 'Password reset email sent', true);
  }

  /**
   * Actualizar contraseña
   */
  async updatePassword(
    userId: string,
    input: UpdatePasswordInput
  ): Promise<ServiceResponse> {
    const { currentPassword, newPassword, confirmPassword } = input;

    // Validar con Zod
    ChangePasswordSchema.parse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    const user = await this.em.findOne(
      User,
      { id: userId },
      { populate: ['password'] }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    const passwordCorrect = await bcrypt.compare(
      currentPassword,
      user.password || ''
    );

    if (!passwordCorrect) {
      throw new ValidationError('Current password is incorrect');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.em.flush();

    return createServiceResponse(200, 'Password changed successfully', true);
  }

  /**
   * Enviar email para cambio de contraseña
   */
  async sendChangePasswordEmail(email: string): Promise<ServiceResponse> {
    const tmpPassword = generateTempPassword(6);

    const payload = {
      email: email,
      purpose: 'reset-password',
      password: tmpPassword,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: '30m',
    });

    const config: EmailConfig = {
      from: process.env.GMAIL_USER!,
      to: email,
      subject: 'Change your password',
      html: changePasswordHtml(token, tmpPassword),
    };

    await this.emailService.sendEmail(config);

    return createServiceResponse(200, 'Change password email sent', true);
  }

  /**
   * Obtener usuario actual con todas sus empresas y permisos
   */
  async getCurrentUser(userId: string): Promise<ServiceResponse> {
    const user = await this.em.findOne(
      User,
      { id: userId },
      {
        populate: ['companies'],
      }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    const companiesWithPermissions =
      await this.permissionService.getUserCompaniesWithPermissions(userId);

    return createServiceResponse(200, 'User was fetched successfully', true, {
      id: user.id,
      email: user.email,
      name: user.name,
      surname: user.surname,
      nickname: user.nickname,
      activeCompanyId: user.activeCompanyId,
      companies: companiesWithPermissions,
    });
  }

  // ============= MÉTODOS PRIVADOS HELPER (ELIMINAN DUPLICACIÓN) =============

  public generateAccessToken(payload: string | Record<string, any>): string {
    // Si el payload es un string (userId), crear objeto con estructura básica
    const tokenPayload =
      typeof payload === 'string' ? { id: payload, userId: payload } : payload;

    return jwt.sign(tokenPayload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry,
    });
  }

  /**
   * Generar refresh token y persistirlo en la base de datos
   * @param user - Usuario para el cual generar el refresh token
   * @returns El string del refresh token generado
   */
  public async generateRefreshToken(user: User): Promise<string> {
    const tokenString = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiry);

    const refreshToken = this.em.create(RefreshToken, {
      user,
      token: tokenString,
      expiresAt,
    });

    this.em.persist(refreshToken);
    await this.em.flush();

    return tokenString;
  }

  /**
   * Crear par de tokens (access + refresh)
   */
  /**
   * Crear par de tokens (access + refresh) - MÉTODO PRINCIPAL UNIFICADO
   * @param user - Usuario para el cual generar los tokens
   * @param includePermissions - Si incluir permisos en el access token
   * @param companyId - ID de la empresa para incluir en el token
   * @param permissionNames - Lista de permisos para incluir en el token
   */
  async createTokensPair(
    user: User,
    includePermissions: boolean = false,
    companyId?: string,
    permissionNames?: string[]
  ): Promise<TokenPair> {
    // Construir payload del access token
    const tokenPayload: any = {
      id: user.id,
      userId: user.id,
      email: user.email,
    };

    // Agregar permisos si se solicitan
    if (includePermissions && companyId && permissionNames) {
      tokenPayload.companyId = companyId;
      tokenPayload.permissions = permissionNames;
    }

    // Generar ambos tokens usando los métodos reutilizables
    const token = this.generateAccessToken(tokenPayload);
    const refreshToken = await this.generateRefreshToken(user);

    return {
      token,
      refreshToken,
    };
  }

  /**
   * Generate email verification token
   */
  public generateEmailVerificationToken(email: string): string {
    return jwt.sign({ id: email }, this.jwtSecret, {
      expiresIn: '30d',
    });
  }

  /**
   * Generate company verification token
   */
  public generateCompanyVerificationToken(companyId: string): string {
    return jwt.sign({ id: companyId }, this.jwtSecret, {
      expiresIn: '30d',
    });
  }

  /**
   * Verify JWT token
   */
  public verifyToken(token: string): { id: string } {
    try {
      return jwt.verify(token, this.jwtSecret) as { id: string };
    } catch (error: any) {
      throw new UnauthorizedError(`Invalid or expired token ${error.message}`);
    }
  }

  /**
   * Validate refresh token and generate new access token
   */
  public async refreshAccessToken(
    inputToken: string
  ): Promise<ServiceResponse> {
    if (!inputToken) {
      throw new ValidationError('Refresh token is required');
    }

    const storedRefreshToken = await this.em.findOne(
      RefreshToken,
      { token: inputToken },
      { populate: ['user'] }
    );

    if (!storedRefreshToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (storedRefreshToken.expiresAt < new Date()) {
      this.em.remove(storedRefreshToken);
      await this.em.flush();
      throw new UnauthorizedError('Refresh token expired');
    }

    const { user } = storedRefreshToken;

    // Generar nuevo par de tokens (Rotación)
    // Esto usa generateAccessToken internamente
    const tokens = await this.createTokensPair(user);

    // Eliminar el token antiguo (completar rotación)
    this.em.remove(storedRefreshToken);
    await this.em.flush();

    return createServiceResponse(200, 'Token refreshed successfully', true, {
      tokens,
    });
  }

  // ============= TOKEN VERIFICATION & MANAGEMENT =============

  /**
   * Revoke refresh token
   */
  public async revokeRefreshToken(tokenString: string): Promise<void> {
    const refreshToken = await this.em.findOne(RefreshToken, {
      token: tokenString,
    });

    if (refreshToken) {
      this.em.remove(refreshToken);
      await this.em.flush();
    }
  }

  /**
   * Revoke all user refresh tokens
   */
  public async revokeAllUserTokens(userId: string): Promise<void> {
    const tokens = await this.em.find(RefreshToken, { user: userId });
    this.em.remove(tokens);
    await this.em.flush();
  }

  /**
   * Construir respuesta de autenticación completa con permisos
   */
  public async buildAuthResponseWithPermissions(
    user: User,
    company: Company,
    message: string
  ): Promise<ServiceResponse> {
    // Obtener permisos del usuario en esta empresa
    const permissionsContext =
      await this.permissionService.getLoginPermissionsContext(
        user,
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

     const debugPermissions = [
       // 'users:create',
       'users:read',
       // 'users:update',
       // 'users:delete',
       'users:manage',
       'schedules:create',
       'schedules:read',
       'schedules:update',
       'schedules:delete',
       'schedules:manage',
       'payments:create',
       'payments:read',
       'payments:update',
       'payments:delete',
       'payments:manage',
       'settings:create',
       'settings:read',
       'settings:update',
       'settings:delete',
       'settings:manage',
       'promotions:create',
       'promotions:read',
       'promotions:update',
       'promotions:delete',
       'promotions:manage',
       'chats:create',
       'chats:read',
       'chats:update',
       'chats:delete',
       'chats:manage',
       'polls:create',
       'polls:read',
       'polls:update',
       'polls:delete',
       'polls:manage',
       'workouts:create',
       'workouts:read',
       'workouts:update',
       'workouts:delete',
       'workouts:manage',
       'user_weights:create',
       'user_weights:read',
       'user_weights:update',
       'user_weights:delete',
       'user_weights:manage',
       'plans:create',
       'plans:read',
       'plans:update',
       'plans:delete',
       'plans:manage',
       'products:create',
       'products:read',
       'products:update',
       'products:delete',
       'products:manage',
       'stats:create',
       'stats:read',
       'stats:update',
       'stats:delete',
       'stats:manage',
     ];



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

    return createServiceResponse(200, message, true, {
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
      permissions: debugPermissions //permissionsContext.permissionNames,
    });
  }

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
        $or: [{ email: emailOrNickname }, { nickname: emailOrNickname }],
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
  private async findOrCreateGoogleUser(
    email: string,
    name?: string
  ): Promise<User> {
    let user = await this.em.findOne(
      User,
      { email },
      { populate: ['companies', 'companies.companyConfig'], filters: false }
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
        fullName: name || '',
      });
      this.em.persist(newUser);
      await this.em.flush();

      // Volver a buscar para tener las relaciones cargadas
      user = await this.em.findOne(
        User,
        { email },
        { populate: ['companies'], filters: false }
      );

      if (!user) {
        throw new InternalServerError('Failed to create user');
      }
    }

    return user;
  }

  /**
   * Validar que el usuario tiene acceso a la empresa
   */
  private async validateCompanyAccess(
    user: User,
    companyId: string
  ): Promise<Company | null> {
    const belongsToCompany = user.companies
      .getItems()
      .some(c => c.id === companyId);

    if (!belongsToCompany) {
      return null;
    }

    const company = await this.em.findOne(
      Company,
      { id: companyId },
      { filters: false }
    );

    if (!company) {
      return null;
    }

    return company;
  }

}
