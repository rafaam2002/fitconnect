import { EntityManager } from '@mikro-orm/core';

import { Company } from '../entities/Company';
import { Message } from '../entities/Message';
import { Subscription, SubscriptionStatus } from '../entities/Subscription';
import { User } from '../entities/User';
import { UserRole } from '../entities/UserRole';
import { CurrentUser, ServiceResponse } from '../types/common.type';
import { UserRoleEnum } from '../types/enums';
import { CompanyProps } from '../types/resolvers';
import {
  BadRequestError,
  ConflictError,
  createServiceResponse,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors.util';
import { sendPushNotification } from '../utils/notification.util';
import {
  createPictureUrl,
  getPresignedUrl,
} from '../utils/presigned-urls.util';

import { AuthService } from './auth.service';
import { BaseService } from './base.service';
import { EmailService } from './email.service';
import { S3Service } from './s3.service';

export interface AdminCompanyResponse {
  newUser: User;
  newFirstForumMessage: Message;
  newCompany: Company;
}

export class CompanyService extends BaseService {
  private readonly emailService: EmailService;
  private readonly authService: AuthService;

  private readonly s3Service: S3Service;

  constructor(em: EntityManager) {
    super(em);
    this.emailService = EmailService.getInstance();
    this.authService = new AuthService(em);
    this.s3Service = new S3Service(em);
  }

  /**
   * Obtener empresa por ID o lista de empresas con paginación
   */
  public async getCompanies(
    currentUser: CurrentUser,
    companyId?: string,
    page?: number,
    query?: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (companyId) {
      // Obtener empresa específica
      const company = await this.em.findOne(
        Company,
        { id: companyId },
        {
          populate: ['scheduleOptions', 'logo', 'pictures', 'companyConfig'],
          filters: false,
        }
      );

      if (!company) {
        throw new NotFoundError('Company');
      }

      return createServiceResponse(200, 'Company fetched successfully', true, {
        company,
      });
    } else {
      // Obtener lista de empresas
      const pageNumber = page || 1;
      const limit = 10;
      const offset = (pageNumber - 1) * limit;

      let where: any = {};
      if (query) {
        where = {
          $or: [{ name: { $ilike: `%${query}%` } }],
        };
      }

      const userWithPending = await this.em.findOne(
        User,
        { id: currentUser.id },
        {
          populate: ['pendingCompanies'],
          filters: false,
        }
      );

      const pendingCompanies = userWithPending
        ? userWithPending.pendingCompanies.getItems()
        : [];

      const [companies, totalItems] = await this.em.findAndCount(
        Company,
        where,
        {
          limit,
          offset,
          populate: ['scheduleOptions', 'logo'],
          filters: false,
        }
      );

      const companiesWithAmIPending = companies.map((company: Company) => {
        return {
          ...company,
          amIPending: pendingCompanies.some(
            (pendingCompany: Company) => pendingCompany.id === company.id
          ),
        };
      });

      const totalPages = Math.ceil(totalItems / limit);

      return createServiceResponse(
        200,
        'Companies fetched successfully',
        true,
        {
          companies: companiesWithAmIPending,
          totalItems,
          totalPages,
          currentPage: pageNumber,
        }
      );
    }
  }

  /**
   * Actualizar empresa y sus opciones de horario
   */
  public async updateCompany(
    currentUser: CurrentUser,
    companyId: string,
    companyData: any,
    scheduleOptions?: any
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const company = await this.em.findOne(
      Company,
      { id: companyId },
      {
        populate: ['scheduleOptions', 'companyConfig'],
      }
    );

    if (!company) {
      throw new NotFoundError('Company');
    }

    // Actualizar datos de la empresa y sus relaciones (companyConfig, scheduleOptions)
    this.em.assign(company, {
      ...companyData,
      ...(scheduleOptions ? { scheduleOptions } : {}),
    });

    this.em.persist(company);
    await this.em.flush();

    return createServiceResponse(200, 'Company updated successfully', true, {
      company,
    });
  }

  /**
   * Actualizar logo de la empresa
   */
  public async updateCompanyLogo(
    currentUser: CurrentUser,
    companyId: string,
    picture: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    // Verificar que el usuario esté actualizando su empresa activa
    if (currentUser.activeCompanyId !== companyId) {
      throw new ForbiddenError('You are not authorized to perform this action');
    }

    const companyRepo = this.em.getRepository(Company);
    const updateCompany = await companyRepo.findOne(
      { id: companyId },
      {
        populate: ['logo'],
      }
    );

    if (!updateCompany) {
      throw new NotFoundError('Company');
    }

    if (updateCompany.logo) {
      // Borrar logo antiguo de S3
      if (updateCompany.logo.name) {
        await this.s3Service.deleteObject(updateCompany.logo.name);
      }

      updateCompany.logo.name = picture;
      updateCompany.logo.url = await getPresignedUrl(picture);
    } else {
      updateCompany.logo = createPictureUrl(
        this.em,
        {
          id: companyId,
          name: picture,
          type: 'companyLogo',
        },
        await getPresignedUrl(picture)
      );
    }

    this.em.persist(updateCompany);
    await this.em.flush();

    return createServiceResponse(200, 'Company updated successfully', true, {
      company: updateCompany,
    });
  }

  /**
   * Crear nueva empresa
   */
  public async createCompany(
    currentUser: CurrentUser,
    companyData: any
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const user = await this.em.findOne(
      User,
      { id: currentUser.id },
      { populate: ['companies'], filters: false }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    const {
      newCompany,
      newUser: newAdminUser,
      newFirstForumMessage,
    } = this.createAdminCompany(this.em, user, companyData.company);

    this.em.persist([newCompany, newFirstForumMessage, newAdminUser]);
    await this.em.flush();

    const companyToken = this.authService.generateCompanyVerificationToken(
      newCompany.id
    );
    await this.emailService.sendCompanyVerificationEmail(
      companyToken,
      companyData,
      user
    );

    this.em.setFilterParams('companyContext', {
      companyId: newCompany.id,
    });

    const refreshedUser = await this.em.findOneOrFail(
      User,
      { id: user.id },
      {
        refresh: true,
        filters: false,
        populate: ['companies', 'companies.companyConfig'],
      }
    );

    const refreshedCompany = await this.em.findOneOrFail(
      Company,
      { id: newCompany.id },
      { populate: ['companyConfig'], filters: false }
    );

    return await this.authService.buildAuthResponseWithPermissions(
      refreshedUser,
      refreshedCompany,
      'Company created successfully'
    );
  }

  /**
   * Solicitar unirse a una empresa
   */
  public async requestJoinCompany(
    currentUser: CurrentUser,
    companyId?: string,
    companyCode?: string
  ): Promise<ServiceResponse> {
    this.em.setFilterParams('companyContext', {
      companyId: null,
    });

    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (!companyId && !companyCode) {
      throw new BadRequestError('Company ID or company code is required');
    }

    const company = await this.em.findOne(
      Company,
      { $or: [{ id: companyId }, { code: companyCode }] },
      { filters: false, populate: ['companyConfig'] }
    );

    if (!company) {
      throw new NotFoundError('Company');
    }

    const user = await this.em.findOne(
      User,
      { id: currentUser.id },
      {
        populate: ['companies', 'pendingCompanies'],
        filters: false,
      }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    // Verificar si ya es miembro
    const isMember = user.companies.contains(company);
    if (isMember) {
      throw new ConflictError('User is already a member of this company');
    }

    // Verificar si ya tiene solicitud pendiente
    const isPending = user.pendingCompanies.contains(company);
    if (isPending) {
      throw new ConflictError('User request is already pending');
    }

    if (company.companyConfig?.autoAcceptUsers)
      return await this.admitUserToCompany(
        currentUser,
        company.id,
        user.id,
        UserRoleEnum.STANDARD,
        false,
        true
      );

    user.pendingCompanies.add(company);

    await this.em.flush();

    // Enviar notificaciones a los ADMIN
    try {
      const adminRoles = await this.em.find(
        UserRole,
        {
          company: company.id,
          role: UserRoleEnum.ADMIN,
        },
        { populate: ['user.pushTokens'] }
      );

      for (const role of adminRoles) {
        const admin = role.user;
        if (admin?.pushTokens) {
          for (const tokenEntity of admin.pushTokens) {
            await sendPushNotification(
              tokenEntity.token,
              'Nueva solicitud de unión',
              `${user.fullName || user.nickname} quiere unirse a ${company.name}`,
              { type: 'join_request', userId: user.id, companyId: company.id }
            );
          }
        }
      }
    } catch (error) {
      console.error('Error sending push notifications:', error);
      // No lanzar error - las notificaciones son secundarias
    }

    return createServiceResponse(200, 'Request sent successfully', true);
  }

  // ============= MÉTODOS PRIVADOS =============

  public async admitUserToCompany(
    currentUser: CurrentUser,
    companyId: string,
    userId: string,
    role?: UserRoleEnum,
    sendNotification: boolean = true,
    isAutoAccept: boolean = false
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const company = await this.em.findOneOrFail(Company, { id: companyId });

    // Validaciones
    if (!isAutoAccept) {
      await this.validateAdminPermission(currentUser.id, companyId);
    }

    if (!currentUser.isSuperAdmin)
      await this.validateUserLimit(currentUser.id, companyId);

    // Obtener usuario
    const userToAdmit = isAutoAccept
      ? await this.em.findOneOrFail(
          User,
          { id: userId },
          { populate: ['pushTokens', 'pendingCompanies'] }
        )
      : await this.getPendingUser(userId, company);

    // Admitir usuario
    userToAdmit.pendingCompanies.remove(company);
    this.em.persist(
      this.em.create(UserRole, {
        user: userToAdmit,
        company,
        role: role || UserRoleEnum.STANDARD,
      })
    );
    await this.em.flush();

    // Notificar (fire-and-forget)
    if (sendNotification)
      this.notifyUserAdmission(userToAdmit, company.name, companyId);

    return createServiceResponse(200, 'User admitted successfully', true);
  }

  public createAdminCompany(
    em: EntityManager,
    user: User,
    company: CompanyProps
  ): AdminCompanyResponse {
    const newCompany = em.create(Company, company);

    // Create UserRole as ADMIN for the creator
    const newUserRole = em.create(UserRole, {
      user,
      company: newCompany,
      role: UserRoleEnum.ADMIN,
    });

    const firstForumMessage = em.create(Message, {
      sender: user,
      receiver: null,
      text: `Welcome to the forum`,
      isForumMessage: true,
      company: newCompany,
      isFixed: false,
    });

    user.activeCompanyId = newCompany.id;
    user.roles.add(newUserRole);

    return {
      newFirstForumMessage: firstForumMessage,
      newUser: user,
      newCompany,
    };
  }

  private async validateAdminPermission(
    userId: string,
    companyId: string
  ): Promise<void> {
    const userRole = await this.em.findOne(UserRole, {
      user: userId,
      company: companyId,
      role: UserRoleEnum.ADMIN,
    });

    if (!userRole) {
      throw new ForbiddenError('You are not authorized to perform this action');
    }
  }

  private async validateUserLimit(
    userId: string,
    companyId: string
  ): Promise<void> {
    const subscription = await this.em.findOne(
      Subscription,
      {
        user: userId,
        company: companyId,
        status: {
          $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
        },
      },
      { populate: ['plan'] }
    );

    const maxUsers = subscription?.plan?.metadata?.maxUsers;
    if (!maxUsers || maxUsers === 'unlimited' || maxUsers === 0) return;

    const limit = Number.parseInt(maxUsers, 10);
    if (Number.isNaN(limit)) return;

    const currentCount = await this.em.count(UserRole, { company: companyId });

    if (currentCount >= limit && limit !== 0) {
      throw new BadRequestError(
        `User limit reached. Your plan allows a maximum of ${limit} users.`
      );
    }
  }

  private async getPendingUser(
    userId: string,
    company: Company
  ): Promise<User> {
    const user = await this.em.findOne(
      User,
      { id: userId },
      { populate: ['pushTokens', 'pendingCompanies'] }
    );

    if (!user) {
      throw new NotFoundError('User to admit not found');
    }

    if (!user.pendingCompanies.contains(company)) {
      throw new BadRequestError('User is not in the pending list');
    }

    return user;
  }

  private async notifyUserAdmission(
    user: User,
    companyName: string,
    companyId: string
  ): Promise<void> {
    if (!user.pushTokens?.length) return;

    const notifications = user.pushTokens.map(token =>
      sendPushNotification(
        token.token,
        'Solicitud aceptada',
        `Has sido aceptado en ${companyName}`,
        { type: 'company_admission', companyId }
      ).catch(err => console.error('Push notification failed:', err))
    );

    await Promise.allSettled(notifications);
  }
}
