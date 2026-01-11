import { EntityManager, FilterQuery } from '@mikro-orm/core';
import { User } from '../entities/User';
import { UserRoleEnum } from '../types/enums';
import {
  BadRequestError,
  createServiceResponse,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors.util';
import { updateUserSchema } from '../validation/schemas';
import {
  createPictureUrl,
  getPresignedUrl,
} from '../utils/presigned-urls.util';
import { EmailService } from './email.service';
import { CurrentUser, ServiceResponse } from '../types/common.type';
import { BaseService } from './base.service';
import { CustomerService } from './customer.service';
import { AuthService } from './auth.service';
import { SqlEntityManager } from '@mikro-orm/postgresql';
import { CompanyService } from './company.service';

/**
 * User Service - Handles all user-related business logic
 */
export class UserService extends BaseService {
  private emailService: EmailService;
  private customerService: CustomerService;
  private authService: AuthService;
  private companyService: CompanyService;

  constructor(em: EntityManager) {
    super(em);
    this.emailService = EmailService.getInstance();
    this.customerService = new CustomerService(em);
    this.authService = new AuthService(em);
    this.companyService = new CompanyService(em);
  }

  public async getUsers(
    currentUser: CurrentUser,
    query?: string,
    roleFilter?: string[],
    stateFilter?: string,
    page: number = 0
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const pagination = {
      limit: 50,
      offset: page * 50,
    };

    const where = this.buildUserFilter(
      query,
      roleFilter,
      stateFilter,
      currentUser
    );
    const userRepo = this.em.getRepository(User);

    try {
      const users =
        Object.keys(where).length > 0
          ? await userRepo.find(where, pagination)
          : await userRepo.findAll(pagination);

      const filteredUsers = users.filter(user => user.id !== currentUser.id);

      return createServiceResponse(200, 'Users found', true, {
        users: filteredUsers,
      });
    } catch (error) {
      throw new InternalServerError('Error fetching users');
    }
  }

  public async getMe(currentUser: CurrentUser): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError('No esta autorizado para acceder al recurso');
    }

    const userRepo = this.em.getRepository(User);
    const user = await userRepo.findOne(
      { id: currentUser.id },
      {
        populate: ['schedules.id', 'schedules.startDate', 'companies'],
      }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    return createServiceResponse(200, 'User found', true, {
      user,
      companies: user.companies.getItems(),
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
      { populate: ['schedules.id', 'schedules.startDate'] }
    );

    const userForCompanies = await userRepo.findOne(
      { id: currentUser.id },
      { filters: false }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    user.activeCompanyId = companyId;
    await this.em.persistAndFlush(user);

    return createServiceResponse(200, 'Company set successfully', true, {
      user,
      companies: userForCompanies!.companies.getItems(),
    });
  }

  public async findUser(id: string): Promise<ServiceResponse> {
    const userRepo = this.em.getRepository(User);
    const user = await userRepo.findOne(
      { id },
      { populate: ['pendingCompanies'] }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    return createServiceResponse(200, 'User found', true, {
      user: {
        ...user,
        isPending: user.pendingCompanies.length > 0,
      },
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

    if (role === UserRoleEnum.BOSS && !companyData?.name) {
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
      if (role === UserRoleEnum.BOSS) {
        const {
          newCompany,
          newUser: adminUser,
          newFirstForumMessage,
          newScheduleOptions,
        } = this.companyService.createAdminCompany(em, newUser, companyData);

        await this.em.persistAndFlush([
          newCompany,
          newFirstForumMessage,
          newScheduleOptions,
        ]);

        newUser = adminUser;

        const companyToken = this.authService.generateCompanyVerificationToken(
          newCompany.id
        );
        await this.emailService.sendCompanyVerificationEmail(
          companyToken,
          companyData,
          newUser
        );
      }

      await this.em.persistAndFlush(newUser);

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
      });
    } catch (error: any) {
      if (error.code === 'EAUTH') {
        throw new Error(`Error sending verification email: ${error.message}`);
      }
      throw new InternalServerError(`Error creating user: ${error.name}`);
    }
  }

  public async updateUser(
    userId: string,
    fields: any,
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (
      currentUser.id !== userId &&
      currentUser.contextRole !== UserRoleEnum.BOSS
    ) {
      throw new ForbiddenError();
    }

    const user = await this.em.findOne(User, { id: userId });

    if (!user) {
      throw new NotFoundError('User');
    }

    const oldEmail = user.email;

    Object.assign(user, {
      name: fields.name ?? user.name,
      email: fields.email ?? user.email,
      surname: fields.surname ?? user.surname,
      nickname: fields.nickname ?? user.nickname,
      phoneNumber: fields.phoneNumber ?? user.phoneNumber,
      isActive: fields.isActive ?? user.isActive,
      isBlocked: fields.isBlocked ?? user.isBlocked,
    });

    try {
      updateUserSchema.parse(user);
    } catch (error: any) {
      throw new BadRequestError(error.message);
    }

    if (oldEmail !== fields.email) {
      const existingEmail = await this.em.findOne(User, {
        email: fields.email,
      });
      if (existingEmail && existingEmail.id !== userId) {
        throw new BadRequestError('Email already exists');
      }
    }

    const existingNickname = await this.em.find(User, {
      nickname: fields.nickname,
    });
    if (existingNickname.length > 1) {
      throw new BadRequestError('Nickname already exists');
    }

    try {
      await this.em.persistAndFlush(user);
      const stripeData = {
        stripeCustomerId: user.stripeCustomerId!,
        email: user.email,
        name: user.name ?? user.email,
        phoneNumber: user.phoneNumber,
      };
      await this.customerService.updateCustomer(stripeData);

      return createServiceResponse(200, 'User updated successfully', true, {
        user,
      });
    } catch (error) {
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
      currentUser.contextRole !== UserRoleEnum.BOSS
    ) {
      throw new ForbiddenError();
    }

    const userRepo = this.em.getRepository(User);
    const user = await userRepo.findOne({ id: userId });

    if (!user) {
      throw new NotFoundError('User');
    }

    const url = await getPresignedUrl(pictureName);

    if (!user.pictureUrl) {
      user.pictureUrl = await createPictureUrl(
        this.em,
        {
          id: userId,
          name: pictureName,
          type: 'user',
        },
        url
      );
    } else {
      user.pictureUrl.name = pictureName;
      user.pictureUrl.url = url;
    }

    try {
      await this.em.persistAndFlush(user);

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

    if (currentUser.contextRole !== UserRoleEnum.BOSS) {
      throw new ForbiddenError();
    }

    const knex = em.getKnex();

    const result = await knex('user as u').select([
      knex.raw('COUNT(u.id) as totalusers'),
      knex.raw(
        'COUNT(CASE WHEN u.is_blocked = true THEN 1 END) as blockedusers'
      ),
      knex.raw(
        'COUNT(CASE WHEN u.is_active = false THEN 1 END) as notactiveusers'
      ),
      knex.raw(
        "COUNT(CASE WHEN u.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as newusers"
      ),
    ]);

    const pendingUsers = await this.em.count(User, {
      pendingCompanies: { id: currentUser.activeCompanyId! },
    });

    const stats = {
      users: {
        totalUsers: result[0].totalusers,
        blockedUsers: result[0].blockedusers,
        notActiveUsers: result[0].notactiveusers,
        newUsers: result[0].newusers,
        pendingUsers,
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

  private buildUserFilter(
    query?: string,
    roleFilter?: string[],
    stateFilter?: string,
    currentUser?: CurrentUser
  ): FilterQuery<User> {
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
        case 'notActive':
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
            $gte: new Date(Date.now() - 31 * 60 * 60 * 1000),
          };
          break;
        case 'pending':
          if (currentUser?.activeCompanyId) {
            where.pendingCompanies = { id: currentUser.activeCompanyId };
          }
          break;
      }
    }

    return where;
  }
}
