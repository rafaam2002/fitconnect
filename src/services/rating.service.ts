import { EntityManager } from '@mikro-orm/core';

import { Company } from '../entities/Company';
import { Rating } from '../entities/Rating';
import { User } from '../entities/User';
import { CurrentUser, ServiceResponse } from '../types/common.type';
import {
  BadRequestError,
  createServiceResponse,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors.util';

import { BaseService } from './base.service';

export class RatingService extends BaseService {
  constructor(em: EntityManager) {
    super(em);
  }

  public async createOrUpdateRating(
    currentUser: CurrentUser,
    score: number,
    comment?: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (!currentUser.activeCompanyId) {
      throw new BadRequestError('No active company selected');
    }

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw new BadRequestError('Score must be an integer between 1 and 5');
    }

    const ratingRepo = this.em.getRepository(Rating);
    let rating = await ratingRepo.findOne({
      user: currentUser.id,
      company: currentUser.activeCompanyId,
    });

    if (rating) {
      rating.score = score;
      rating.comment = comment;
    } else {
      rating = this.em.create(Rating, {
        user: this.em.getReference(User, currentUser.id),
        company: this.em.getReference(Company, currentUser.activeCompanyId),
        score,
        comment,
      });
      this.em.persist(rating);
    }

    await this.em.flush();

    return createServiceResponse(200, 'Rating saved successfully', true, {
      rating,
    });
  }

  public async deleteRating(currentUser: CurrentUser): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (!currentUser.activeCompanyId) {
      throw new BadRequestError('No active company selected');
    }

    const rating = await this.em.findOne(Rating, {
      user: currentUser.id,
      company: currentUser.activeCompanyId,
    });

    if (!rating) {
      throw new NotFoundError('Rating');
    }

    this.em.remove(rating);
    await this.em.flush();

    return createServiceResponse(200, 'Rating deleted successfully', true);
  }

  public async getCompanyRatings(
    currentUser: CurrentUser,
    companyId?: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const targetCompanyId = companyId ?? currentUser.activeCompanyId;

    if (!targetCompanyId) {
      throw new BadRequestError('No active company selected');
    }

    const ratingRepo = this.em.getRepository(Rating);
    const ratings = await ratingRepo.find(
      { company: targetCompanyId },
      { populate: ['user'], orderBy: { created_at: 'desc' } }
    );

    const ratingsCount = ratings.length;
    const averageScore = ratingsCount
      ? ratings.reduce((sum, r) => sum + r.score, 0) / ratingsCount
      : 0;

    return createServiceResponse(200, 'Ratings fetched successfully', true, {
      ratings,
      averageScore,
      ratingsCount,
    });
  }

  public async getMyRating(
    currentUser: CurrentUser,
    companyId?: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const targetCompanyId = companyId ?? currentUser.activeCompanyId;

    if (!targetCompanyId) {
      throw new BadRequestError('No active company selected');
    }

    const rating = await this.em.findOne(Rating, {
      user: currentUser.id,
      company: targetCompanyId,
    });

    return createServiceResponse(200, 'Rating fetched successfully', true, {
      rating: rating ?? null,
    });
  }
}