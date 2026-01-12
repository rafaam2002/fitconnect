import { EntityManager } from '@mikro-orm/core';

import { Company } from '../entities/Company';
import { Message } from '../entities/Message';
import { ScheduleOptions } from '../entities/ScheduleOptions';
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

export interface AdminCompanyResponse {
  newCompany: Company;
  newScheduleOptions: {
    company: Company;
    maxActiveReservations: number;
    maxAdvanceBookingDays: number;
    sameDayBookingAllowed: boolean;
    fullOpenHours: number;
  };
  newUser: User;
  newFirstForumMessage: Message;
}

export class CompanyService extends BaseService {
  private emailService: EmailService;
  private authService: AuthService;

  constructor(em: EntityManager) {
    super(em);
    this.emailService = EmailService.getInstance();
    this.authService = new AuthService(em);
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

    if (!companyId) {
      throw new BadRequestError('Company id is required');
    }

    if (companyId) {
      // Obtener empresa específica
      const company = await this.em.findOne(
        Company,
        { id: companyId },
        {
          populate: ['scheduleOptions'],
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
          populate: ['scheduleOptions'],
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
        populate: ['scheduleOptions'],
      }
    );

    if (!company) {
      throw new NotFoundError('Company');
    }

    // Actualizar datos de la empresa
    Object.assign(company, companyData);

    // Actualizar o crear scheduleOptions
    if (scheduleOptions) {
      if (company.scheduleOptions) {
        Object.assign(company.scheduleOptions, scheduleOptions);
      } else {
        company.scheduleOptions = this.em.create(ScheduleOptions, {
          ...scheduleOptions,
          company: company,
        });
      }
    }

    await this.em.persistAndFlush(company);

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
    const updateCompany = await companyRepo.findOne({ id: companyId });

    if (!updateCompany) {
      throw new NotFoundError('Company');
    }

    if (!updateCompany.logo) {
      updateCompany.logo = await createPictureUrl(
        this.em,
        {
          id: companyId,
          name: picture,
          type: 'companyLogo',
        },
        await getPresignedUrl(picture)
      );
    } else {
      updateCompany.logo.url = await getPresignedUrl(picture);
    }

    await this.em.persistAndFlush(updateCompany);

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
      { populate: ['companies'] }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    const {
      newCompany,
      newUser: newAdminUser,
      newFirstForumMessage,
      newScheduleOptions,
    } = this.createAdminCompany(this.em, user, companyData.company);

    await this.em.persistAndFlush([
      newCompany,
      newFirstForumMessage,
      newScheduleOptions,
      newAdminUser,
    ]);

    const companyToken = this.authService.generateCompanyVerificationToken(
      newCompany.id
    );
    await this.emailService.sendCompanyVerificationEmail(
      companyToken,
      companyData,
      user
    );

    return createServiceResponse(201, 'Company created successfully', true, {
      company: newCompany,
      user: newAdminUser,
    });
  }

  /**
   * Solicitar unirse a una empresa
   */
  public async requestJoinCompany(
    currentUser: CurrentUser,
    companyId: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const company = await this.em.findOne(
      Company,
      { id: companyId },
      { filters: false }
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
    const isMember = await user.companies.contains(company);
    if (isMember) {
      throw new ConflictError('User is already a member of this company');
    }

    // Verificar si ya tiene solicitud pendiente
    const isPending = await user.pendingCompanies.contains(company);
    if (isPending) {
      throw new ConflictError('User request is already pending');
    }

    user.pendingCompanies.add(company);
    await this.em.persistAndFlush(user);

    // Enviar notificaciones a los BOSS
    try {
      const bossRoles = await this.em.find(
        UserRole,
        {
          company: company.id,
          role: UserRoleEnum.BOSS,
        },
        { populate: ['user.pushTokens'] }
      );

      for (const role of bossRoles) {
        const boss = role.user;
        if (boss && boss.pushTokens) {
          for (const tokenEntity of boss.pushTokens) {
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

  /**
   * Admitir usuario a la empresa (solo BOSS)
   */
  public async admitUserToCompany(
    currentUser: CurrentUser,
    companyId: string,
    userId: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const company = await this.em.findOne(Company, { id: companyId });
    if (!company) {
      throw new NotFoundError('Company');
    }

    // Verificar que el usuario actual es BOSS de la empresa
    const currentUserRole = await this.em.findOne(UserRole, {
      user: currentUser.id,
      company: company.id,
      role: UserRoleEnum.BOSS,
    });

    if (!currentUserRole) {
      throw new ForbiddenError('You are not authorized to perform this action');
    }

    const userToAdmit = await this.em.findOne(
      User,
      { id: userId },
      { populate: ['pushTokens', 'pendingCompanies', 'companies'] }
    );

    if (!userToAdmit) {
      throw new NotFoundError('User to admit not found');
    }

    // Verificar que el usuario está en la lista de pendientes
    const isPending = userToAdmit.pendingCompanies.contains(company);
    if (!isPending) {
      throw new BadRequestError('User is not in the pending list');
    }

    // Mover de pendientes a miembros
    userToAdmit.pendingCompanies.remove(company);
    userToAdmit.companies.add(company);

    // Crear UserRole para el nuevo miembro (default STANDARD)
    const newUserRole = new UserRole(
      userToAdmit,
      company,
      UserRoleEnum.STANDARD
    );
    this.em.persist(newUserRole);

    await this.em.persistAndFlush(userToAdmit);

    // Enviar notificación al usuario admitido
    try {
      if (userToAdmit.pushTokens) {
        for (const tokenEntity of userToAdmit.pushTokens) {
          await sendPushNotification(
            tokenEntity.token,
            'Solicitud aceptada',
            `Has sido aceptado en ${company.name}`,
            { type: 'company_admission', companyId: company.id }
          );
        }
      }
    } catch (error) {
      console.error('Error sending push notifications:', error);
      // No lanzar error - las notificaciones son secundarias
    }

    return createServiceResponse(200, 'User admitted successfully', true);
  }

  public createAdminCompany(
    em: EntityManager,
    user: User,
    company: CompanyProps
  ): AdminCompanyResponse {
    const newCompany = em.create(Company, company);

    user.companies.add(newCompany);
    const firstForumMessage = em.create(Message, {
      sender: user,
      receiver: null,
      text: `Welcome to the forum`,
      isForumMessage: true,
      company: newCompany,
      isFixed: false,
    });

    const scheduleOptions = em.create(ScheduleOptions, {
      company: newCompany,
      maxActiveReservations: 1,
      maxAdvanceBookingDays: 1,
      sameDayBookingAllowed: false,
      fullOpenHours: 0,
    });
    return {
      newCompany,
      newScheduleOptions: scheduleOptions,
      newFirstForumMessage: firstForumMessage,
      newUser: user,
    };
  }
}
