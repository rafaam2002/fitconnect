import { EntityManager } from '@mikro-orm/core';

import { User } from '../entities/User';
import { UserWeight } from '../entities/UserWeight';
import { CurrentUser, ServiceResponse } from '../types/common.type';
import { UserRoleEnum } from '../types/enums';
import {
  createServiceResponse,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors.util';

import { BaseService } from './base.service';

/**
 * User Weight Service - Handles user weight tracking
 */
export class UserWeightService extends BaseService {
  constructor(em: EntityManager) {
    super(em);
  }

  public async getUserWeights(
    userId: string,
    dateRange?: [string, string],
    currentUser?: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (currentUser.contextRole === UserRoleEnum.STANDARD) {
      throw new ForbiddenError();
    }

    const user = await this.em.findOne(
      User,
      { id: userId },
      { populate: ['userWeights'] }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    return createServiceResponse(200, 'User weights found', true, {
      userWeights: user.userWeights,
    });
  }

  public async addUserWeight(
    weight: number,
    date: string,
    userId: string,
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (currentUser.contextRole === UserRoleEnum.STANDARD) {
      throw new ForbiddenError();
    }

    const userWeight = this.em.create(UserWeight, {
      weight,
      date,
      user: userId,
      company: currentUser.activeCompanyId!,
    });

    try {
      await this.em.persistAndFlush(userWeight);

      return createServiceResponse(200, 'Weight added successfully', true, {
        userWeight,
      });
    } catch (error) {
      console.error('Error adding weight:', error);
      throw new Error('Error adding weight');
    }
  }

  public async removeUserWeight(
    ids: string[],
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const userWeightRepo = this.em.getRepository(UserWeight);
    const userWeights = await userWeightRepo.find(
      { id: { $in: ids } },
      { populate: ['user'] }
    );

    if (userWeights.length === 0) {
      throw new NotFoundError('User weights');
    }

    for (const weight of userWeights) {
      if (
        weight.user.id !== currentUser.id &&
        currentUser.contextRole !== UserRoleEnum.BOSS
      ) {
        throw new ForbiddenError();
      }
    }

    await this.em.remove(userWeights).flush();

    return createServiceResponse(
      200,
      'User weights removed successfully',
      true,
      {
        userWeights,
      }
    );
  }
}
