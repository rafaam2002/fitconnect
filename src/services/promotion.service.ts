import { EntityManager } from '@mikro-orm/core';

import { Promotion } from '../entities/Promotion';
import { CurrentUser, ServiceResponse } from '../types/common.type';
import { CreatePromotionInput, UpdatePromotionInput } from '../types/resolvers';
import {
  createServiceResponse,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors.util';

import { BaseService } from './base.service';

export class PromotionService extends BaseService {
  constructor(em: EntityManager) {
    super(em);
  }

  /**
   * Obtener todas las promociones de la empresa activa (panel admin)
   */
  public async getCompanyPromotions(
    currentUser: CurrentUser,
    includeInactive?: boolean
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    try {
      const promotions = await this.em.find(
        Promotion,
        includeInactive ? {} : { isActive: true },
        { orderBy: { isHero: 'desc', expiresAt: 'asc' } }
      );

      return createServiceResponse(200, 'Promotions found', true, {
        promotions,
      });
    } catch (error: any) {
      throw new InternalServerError(
        `Error fetching promotions ${error.message}`
      );
    }
  }

  /**
   * Obtener promociones activas y vigentes para la app (usuarios finales)
   */
  public async getActivePromotions(
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    try {
      const promotions = await this.em.find(
        Promotion,
        { isActive: true, expiresAt: { $gt: new Date() } },
        { orderBy: { isHero: 'desc', expiresAt: 'asc' } }
      );

      return createServiceResponse(200, 'Active promotions found', true, {
        promotions,
      });
    } catch (error: any) {
      throw new InternalServerError(
        `Error fetching promotions ${error.message}`
      );
    }
  }

  /**
   * Crear nueva promoción para la empresa activa
   */
  public async createPromotion(
    currentUser: CurrentUser,
    input: CreatePromotionInput
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    try {
      const promotion = this.em.create(Promotion, {
        title: input.title,
        description: input.description,
        discountTag: input.discountTag,
        originalPrice: input.originalPrice,
        newPrice: input.newPrice,
        expiresAt: new Date(input.expiresAt),
        accentColor: input.accentColor ?? null,
        isHero: input.isHero ?? false,
        isActive: input.isActive ?? true,
        company: currentUser.activeCompanyId!,
      });

      this.em.persist(promotion);
      await this.em.flush();

      return createServiceResponse(200, 'Promotion created', true, {
        promotion,
      });
    } catch {
      throw new InternalServerError('Error creating promotion');
    }
  }

  /**
   * Actualizar una promoción existente de la empresa activa
   */
  public async updatePromotion(
    currentUser: CurrentUser,
    id: string,
    input: UpdatePromotionInput
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const promotionRepo = this.em.getRepository(Promotion);
    const promotion = await promotionRepo.findOne({ id });

    if (!promotion) {
      throw new NotFoundError('Promotion');
    }

    const { expiresAt, ...rest } = input;

    this.em.assign(promotion, {
      ...rest,
      ...(expiresAt !== undefined && { expiresAt: new Date(expiresAt) }),
    });

    await this.em.flush();

    return createServiceResponse(200, 'Promotion updated', true, {
      promotion,
    });
  }

  /**
   * Eliminar una promoción de la empresa activa
   */
  public async deletePromotion(
    currentUser: CurrentUser,
    id: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const promotionRepo = this.em.getRepository(Promotion);
    const promotion = await promotionRepo.findOne({ id });

    if (!promotion) {
      throw new NotFoundError('Promotion');
    }

    this.em.remove(promotion);
    await this.em.flush();

    return createServiceResponse(200, 'Promotion deleted successfully', true);
  }
}
