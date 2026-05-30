import { EntityManager, FilterQuery } from '@mikro-orm/core';
import { SqlEntityManager } from '@mikro-orm/postgresql';

import { Company } from '../entities/Company';
import { Subscription, SubscriptionStatus } from '../entities/Subscription';
import { User } from '../entities/User';
import { UserRole } from '../entities/UserRole';
import { CurrentUser, ServiceResponse } from '../types/common.type';
import { UserRoleEnum } from '../types/enums';
import { UpdateUserProps, PlanFilterInput } from '../types/resolvers';
import {
  BadRequestError,
  createServiceResponse,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors.util';
import {
  createPictureUrl,
  getPresignedUrl,
} from '../utils/presigned-urls.util';
import { updateUserSchema } from '../validation/schemas';

import { AuthService } from './auth.service';
import { BaseService } from './base.service';
import { CompanyService } from './company.service';
import { CustomerService } from './customer.service';
import { EmailService } from './email.service';
import { S3Service } from './s3.service';

/**
 * User Service - Handles all user-related business logic
 */
export class UserService extends BaseService {
  private readonly emailService: EmailService;
  private readonly customerService: CustomerService;
  private readonly authService: AuthService;
  private readonly companyService: CompanyService;

  private readonly s3Service: S3Service;

  constructor(em: EntityManager) {
    super(em);
    this.emailService = EmailService.getInstance();
    this.customerService = new CustomerService(em);
    this.authService = new AuthService(em);
    this.companyService = new CompanyService(em);
    this.s3Service = new S3Service(em);
  }

  public async getUsers(
    currentUser: CurrentUser,
    query?: string,
    roleFilter?: string[],
    stateFilter?: string,
    page: number = 0,
    filterMe: boolean = true,
    planFilter?: PlanFilterInput
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const pagination = {
      limit: 50,
      offset: page * 50,
    };

    const where = await this.buildUserFilter(
      query,
      roleFilter,
      stateFilter,
      currentUser,
      planFilter
    );
    const userRepo = this.em.getRepository(User);

    const isPendingSearch = stateFilter === 'pending';

    try {
      const users =
        Object.keys(where).length > 0
          ? await userRepo.find(where, {
              ...pagination,
              filters: isPendingSearch ? { companyContext: false } : true,
            })
          : await userRepo.findAll(pagination);

      const filteredUsers = filterMe
        ? users.filter(user => user.id !== currentUser.id)
        : users;

      return createServiceResponse(200, 'Users found', true, {
        users: filteredUsers,
      });
    } catch (e: any) {
      throw new InternalServerError(`Error fetching users ${e.message}`);
    }
  }

  public async getMe(currentUser: CurrentUser): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError('No esta autorizado para acceder al recurso');
    }

    const authService = new AuthService(this.em);

    const userRepo = this.em.getRepository(User);
    const user = await userRepo.findOne(
      { id: currentUser.id },
      {
        populate: ['companies', 'companies.companyConfig'],
        filters: false, //!!currentUser.activeCompanyId,
      }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    const userCompanies = user.companies.getItems();
    const activeCompany = user.activeCompanyId
      ? userCompanies.find(c => c.id === user.activeCompanyId)
      : userCompanies[0];

    if (activeCompany) {
      return await authService.buildAuthResponseWithPermissions(
        user,
        activeCompany,
        'Login successful'
      );
    }

    return createServiceResponse(200, 'logging successfully', true, {
      user,
    });
  }

  public async setActiveCompany(
    companyId: string,
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const userRepo = this.em.getRepository(User);
    const user = await userRepo.findOne(
      { id: currentUser.id },
      {
        refresh: true,
        filters: false,
        populate: ['companies', 'companies.companyConfig'],
      }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    user.activeCompanyId = companyId;
    this.em.persist(user);

    const companyRepo = this.em.getRepository(Company);

    const company = await companyRepo.findOne(
      { id: companyId },
      {
        populate: ['companyConfig'],
        filters: {
          companyContext: false,
        },
      }
    );

    if (
      user.isSuperAdmin &&
      !user.roles.toArray().some(r => {
        const companyIdInRole =
          typeof r.company === 'string' ? r.company : r.company?.id;
        return companyIdInRole === companyId;
      })
    ) {
      this.em.persist(
        this.em.create(UserRole, {
          user: user,
          company,
          role: UserRoleEnum.ADMIN,
        })
      );
    }
    await this.em.flush();

    return await this.authService.buildAuthResponseWithPermissions(
      user,
      company as Company,
      'Company set successfully'
    );
  }

  public async findUser(
    id: string,
    currentUser: CurrentUser,
    options?: {
      includePermissions?: boolean;
    }
  ): Promise<ServiceResponse> {
    const userRepo = this.em.getRepository(User);
    const user = await userRepo.findOne(
      {
        id,
        ...(options?.includePermissions
          ? {
              subscriptions: {
                status: {
                  $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
                },
              },
            }
          : {}),
        $or: [
          { companies: { id: currentUser.activeCompanyId } },
          { pendingCompanies: { id: currentUser.activeCompanyId } },
        ],
      },
      {
        populate: [
          'pendingCompanies',
          ...((options?.includePermissions
            ? [
                'subscriptions',
                'subscriptions.plan',
                'subscriptions.plan.planPermissions',
                'subscriptions.plan.planPermissions.permission',
              ]
            : []) as any[]),
        ],
        filters: { companyContext: false }, //no se filtra porque debe traer usuarios pendientes (que no entran en el filtro)
      }
    );

    //debido a que no se filtra por companyContext, hay que asegurarse de que los roles solo incluyan los de la empresa activa (si es que tiene)
    if (user?.roles && typeof user.roles.set === 'function') {
      user.roles.set(
        user.roles
          .getItems()
          .filter(role => role.company.id === currentUser.activeCompanyId)
      );
    }

    if (!user) {
      throw new NotFoundError('User');
    }
    Object.assign(user, {
      isPending: user.pendingCompanies.length > 0,
    });

    return createServiceResponse(200, 'User found', true, {
      user,
    });
  }

  public async getPromotions(currentUser: CurrentUser): Promise<any> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const userRepo = this.em.getRepository(User);
    const user = await userRepo.findOne(
      { id: currentUser.id },
      { populate: ['promotions'] }
    );

    return user!.promotions;
  }

  public async createUser(
    em: SqlEntityManager,
    userData: any,
    companyData?: any
  ): Promise<ServiceResponse> {
    const { email, password, nickname, role } = userData;

    if (!email || !password || !nickname) {
      throw new BadRequestError('Please provide all required fields');
    }

    if (role === UserRoleEnum.ADMIN && !companyData?.name) {
      throw new BadRequestError('Admin users must provide a Company name');
    }

    const existingUser = await this.em.findOne(
      User,
      {
        $or: [{ email }, { nickname }],
      },
      {
        filters: false,
      }
    );

    if (existingUser) {
      throw new BadRequestError('User already exists');
    }

    let newUser: User = this.em.create(User, userData);

    try {
      if (role === UserRoleEnum.ADMIN) {
        const { newUser: adminUser, newFirstForumMessage } =
          this.companyService.createAdminCompany(em, newUser, companyData);

        this.em.persist([newFirstForumMessage]);
        newUser = adminUser;

        if (newUser.activeCompanyId) {
          const companyToken =
            this.authService.generateCompanyVerificationToken(
              newUser.activeCompanyId
            );
          await this.emailService.sendCompanyVerificationEmail(
            companyToken,
            companyData,
            newUser
          );
        } else {
          throw new Error('Company not created, activeCompanyId is null');
        }
      }

      this.em.persist(newUser);
      await this.em.flush();

      const stripeData = {
        userId: newUser.id,
        phoneNumber: 123456789,
        name: newUser.nickname,
        email: newUser.email,
      };
      await this.customerService.createCustomer(stripeData);

      let tokens: any = null;
      if (this.authService) {
        tokens = await this.authService.createTokensPair(newUser);
      }

      const emailToken = this.authService.generateEmailVerificationToken(email);
      await this.emailService.sendVerificationEmail(email, emailToken);

      return createServiceResponse(200, 'User created successfully', true, {
        user: newUser,
        tokens,
        isNewUser: true,
      });
    } catch (error: any) {
      if (error.code === 'EAUTH') {
        throw new Error(`Error sending verification email: ${error.message}`);
      }
      throw new InternalServerError(
        `Error creating user: ${error?.message || error?.name || 'Unknown error'}`
      );
    }
  }

  public async updateUser(
    userUpdates: UpdateUserProps,
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (
      currentUser.id !== userUpdates.id &&
      currentUser.contextRole !== UserRoleEnum.ADMIN
    ) {
      throw new ForbiddenError();
    }

    const user = await this.em.findOne(
      User,
      { id: userUpdates.id },
      {
        populate: ['companies'],
      }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    try {
      updateUserSchema.parse(userUpdates);
    } catch (error: any) {
      throw new BadRequestError(error.message);
    }

    const oldEmail = user.email;

    if (oldEmail !== userUpdates.email) {
      const existingEmail = await this.em.findOne(User, {
        email: userUpdates.email,
      });
      if (existingEmail && existingEmail.id !== userUpdates.id) {
        throw new BadRequestError('Email already exists');
      }
    }

    const existingNickname = await this.em.find(User, {
      nickname: userUpdates.nickname,
    });
    if (existingNickname.length > 1) {
      throw new BadRequestError('Nickname already exists');
    }
    Object.assign(user, {
      name: userUpdates.name ?? user.name,
      email: userUpdates.email ?? user.email,
      surname: userUpdates.surname ?? user.surname,
      nickname: userUpdates.nickname ?? user.nickname,
      phoneNumber: userUpdates.phoneNumber ?? user.phoneNumber,
      isActive: userUpdates.isActive ?? user.isActive,
      isBlocked: userUpdates.isBlocked ?? user.isBlocked,
    });
    if (userUpdates.role) {
      if (user.roles.length > 0) {
        user.roles[0].role = userUpdates.role;
      } else {
        const activeCompanyId = currentUser.activeCompanyId;
        if (activeCompanyId) {
          const company = await this.em.findOne(Company, {
            id: activeCompanyId,
          });
          if (company) {
            const newUserRole = this.em.create(UserRole, {
              user,
              company,
              role: userUpdates.role,
            });
            user.roles.add(newUserRole);
          }
        }
      }
    }

    try {
      this.em.persist(user);
      await this.em.flush();
      if (user.stripeCustomerId) {
        const stripeData = {
          stripeCustomerId: user.stripeCustomerId,
          email: user.email,
          name: user.name ?? user.email,
          phoneNumber: user.phoneNumber,
        };
        await this.customerService.updateCustomer(stripeData);
      }

      return createServiceResponse(200, 'User updated successfully', true, {
        user,
      });
    } catch (error) {
      console.error('Error updating user: ', error);
      throw new Error('Error updating user');
    }
  }

  public async updateUserPicture(
    userId: string,
    pictureName: string,
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (
      currentUser.id !== userId &&
      currentUser.contextRole !== UserRoleEnum.ADMIN
    ) {
      throw new ForbiddenError();
    }

    const userRepo = this.em.getRepository(User);
    const user = await userRepo.findOne({ id: userId });

    if (!user) {
      throw new NotFoundError('User');
    }

    const url = await getPresignedUrl(pictureName);

    if (user.pictureUrl) {
      // Borrar imagen antigua de S3 antes de actualizar
      if (user.pictureUrl.name) {
        await this.s3Service.deleteObject(user.pictureUrl.name);
      }

      user.pictureUrl.name = pictureName;
      user.pictureUrl.url = url;
    } else {
      user.pictureUrl = createPictureUrl(
        this.em,
        {
          id: userId,
          name: pictureName,
          type: 'user',
        },
        url
      );
    }

    try {
      this.em.persist(user);
      await this.em.flush();

      return createServiceResponse(
        200,
        'User picture updated successfully',
        true,
        {
          user,
        }
      );
    } catch (error) {
      console.error('Error updating user picture:', error);
      throw new Error('Error updating user picture');
    }
  }

  public async sendEmailVerification(
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const token = this.authService.generateEmailVerificationToken(
      currentUser.email
    );
    await this.emailService.sendVerificationEmail(currentUser.email, token);

    return createServiceResponse(200, 'Verification email sent', true);
  }

  public async getAdminStats(
    em: SqlEntityManager,
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (currentUser.contextRole !== UserRoleEnum.ADMIN) {
      throw new ForbiddenError();
    }

    const knex = em.getKnex();

    const result = await knex('user as u')
      .join('user_role as ur', 'u.id', 'ur.user_id')
      .where('ur.company_id', currentUser.activeCompanyId)
      .select([
        knex.raw('COUNT(DISTINCT u.id) as totalusers'), // DISTINCT por si acaso hay duplicados por joins
        knex.raw(
          'COUNT(DISTINCT CASE WHEN u.is_blocked = true THEN u.id END) as blockedusers'
        ),
        knex.raw(
          'COUNT(DISTINCT CASE WHEN u.is_active = false THEN u.id END) as notactiveusers'
        ),
        knex.raw(
          "COUNT(DISTINCT CASE WHEN u.created_at >= NOW() - INTERVAL '30 days' THEN u.id END) as newusers"
        ),
        // Subconsulta para los pendientes
        knex.raw(
          `(
          SELECT COUNT(*) 
          FROM user_pending_companies 
          WHERE company_id = ?
        ) as pendingusers`,
          [currentUser.activeCompanyId ?? null] // Esto asegura que nunca sea undefined
        ),
      ]);

    const stats = {
      users: {
        totalUsers: result[0].totalusers,
        blockedUsers: result[0].blockedusers,
        notActiveUsers: result[0].notactiveusers,
        newUsers: result[0].newusers,
        pendingUsers: result[0].pendingusers,
      },
      schedules: 0,
      polls: 0,
      plans: 0,
      subscriptions: 0,
      transactions: 0,
      notifications: 0,
    };

    return createServiceResponse(200, 'Stats found', true, { stats });
  }

  public async getUsersByPermissions(
    permissions: string[],
    extraWhere?: FilterQuery<User>
  ) {
    const users = await this.em.find(
      User,
      {
        ...((extraWhere ?? {}) as object),
        subscriptions: {
          status: {
            $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
          },
          plan: {
            planPermissions: {
              permission: {
                name: { $in: permissions },
              },
            },
          },
        },
      },
      {
        populate: [
          'subscriptions',
          'subscriptions.plan',
          'subscriptions.plan.planPermissions',
          'subscriptions.plan.planPermissions.permission',
        ],
      }
    );
    return users;
  }

  public async deleteUser(
    userId: string,
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (currentUser.id !== userId) {
      throw new ForbiddenError('Solo puedes borrar tu propia cuenta');
    }

    const user = await this.em.findOne(
      User,
      { id: userId },
      { filters: false }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    try {
      this.em.remove(user);
      await this.em.flush();

      return createServiceResponse(200, 'User deleted successfully', true);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Error deleting user');
    }
  }

  private async buildUserFilter(
    query?: string,
    roleFilter?: string[],
    stateFilter?: string,
    currentUser?: CurrentUser,
    planFilter?: PlanFilterInput
  ): Promise<FilterQuery<User>> {
    const where: FilterQuery<User> = {};

    if (query) {
      where.$or = [
        { nickname: { $ilike: `${query}%` } },
        { name: { $ilike: `${query}%` } },
        { surname: { $ilike: `${query}%` } },
        { email: { $ilike: `${query}%` } },
      ];
    }

    if (roleFilter) {
      // @ts-ignore
      where.roles = { role: { $in: roleFilter } };
    }

    if (stateFilter) {
      switch (stateFilter) {
        case 'inactive':
          where.isActive = false;
          break;
        case 'blocked':
          where.isBlocked = true;
          break;
        case 'notVerified':
          where.isVerified = false;
          break;
        case 'new':
          where.created_at = {
            $gte: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
          };
          break;
        case 'pending':
          if (currentUser?.activeCompanyId) {
            where.pendingCompanies = { id: currentUser.activeCompanyId };
          }
          break;
      }
    }

    if (planFilter) {
      if (planFilter.condition === 'with') {
        where.subscriptions = {
          plan: planFilter.id,
          status: {
            $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
          },
        };
      } else {
        const activeSubUsers = await this.em.getRepository(Subscription).find(
          {
            plan: planFilter.id,
            status: {
              $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
            },
          },
          { fields: ['user.id'] }
        );
        const activeUserIds = activeSubUsers.map(sub => sub.user.id);
        if (activeUserIds.length > 0) {
          where.id = { $nin: activeUserIds };
        }
      }
    }

    return where;
  }
}
