import { EntityManager, FilterQuery, QueryOrder } from '@mikro-orm/core';

import { Plan, PlanInterval, PlanStatus } from '../entities/Plan';
import { ServiceResponse } from '../types/common.type';
import {
  BadRequestError,
  createServiceResponse,
  NotFoundError,
} from '../utils/errors.util';

import { BaseService } from './base.service';
import { PermissionService } from './permission.service';

export interface CreatePlanInput {
  name: string;
  description?: string;
  amount: number;
  currency?: string;
  interval: PlanInterval;
  intervalCount?: number;
  trialPeriodDays?: number;
  features?: string[];
  metadata?: Record<string, any>;
  companyId?: string;
}

interface UpdatePlanInput {
  id: string;
  name?: string;
  description?: string;
  features?: string[];
  metadata?: Record<string, any>;
  status?: PlanStatus;
  isActive: boolean;
}

export class PlanService extends BaseService {
  private permissionService: PermissionService;

  constructor(em: EntityManager) {
    super(em);
    this.permissionService = new PermissionService(em);
  }

  async createPlan(input: CreatePlanInput): Promise<ServiceResponse> {
    try {
      // Crear producto en Stripe
      const stripeProduct = await this.stripe.products.create({
        name: input.name,
        description: input.description,
        metadata: input.metadata || {},
      });

      // Crear precio en Stripe
      const stripePrice = await this.stripe.prices.create(
        {
          product: stripeProduct.id,
          unit_amount: input.amount,
          currency: input.currency || 'usd',
          recurring: {
            interval: input.interval,
            interval_count: input.intervalCount || 1,
            trial_period_days: input.trialPeriodDays,
          },
          metadata: input.metadata || {},
        },
        {
          idempotencyKey: this.generateIdempotencyKey(
            'plan',
            input.name,
            input.amount.toString()
          ),
        }
      );

      const {
        name,
        currency,
        description,
        amount,
        interval,
        intervalCount,
        trialPeriodDays,
        features,
        metadata,
        companyId,
      } = input;

      // Crear en base de datos
      const plan = this.em.create<Plan>(Plan, {
        stripePriceId: stripePrice.id,
        stripeProductId: stripeProduct.id,
        name,
        description,
        amount,
        currency: currency || 'EUR',
        interval,
        intervalCount: intervalCount || 1,
        trialPeriodDays,
        features,
        metadata,
        company: companyId!,
        status: PlanStatus.ACTIVE,
      });

      this.em.persist(plan);

      await this.em.flush();

      // Sincronizar permisos si existen en metadata
      if (metadata?.permissions) {
        await this.permissionService.syncPermissionsFromMetadata(
          plan.id,
          metadata
        );
      }

      return createServiceResponse(200, 'Plan has been created', true, plan);
    } catch (error) {
      this.handleStripeError(error);
    }
  }

  async updatePlan(input: UpdatePlanInput): Promise<ServiceResponse> {
    const plan = await this.em.findOne(Plan, { id: input.id });

    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    try {
      // Actualizar producto en Stripe
      if (input.name || input.description || input.metadata) {
        await this.stripe.products.update(plan.stripeProductId!, {
          name: input.name,
          description: input.description,
          metadata: input.metadata,
          active: input.status === PlanStatus.ACTIVE,
        });

        await this.stripe.prices.update(plan.stripePriceId, {
          active: input.status === PlanStatus.ACTIVE,
        });
      }

      // Actualizar en base de datos
      if (input.name) plan.name = input.name;
      if (input.description) plan.description = input.description;
      if (input.features) plan.features = input.features;
      if (input.metadata)
        plan.metadata = { ...plan.metadata, ...input.metadata };
      if (input.isActive !== undefined)
        plan.isActive = input.status === PlanStatus.ACTIVE;
      if (input.status) plan.status = input.status;

      await this.em.flush();

      // Sincronizar permisos si cambiaron
      if (input.metadata?.permissions) {
        await this.permissionService.syncPermissionsFromMetadata(
          plan.id,
          input.metadata
        );
      }

      return createServiceResponse(200, 'Plan has been updated', true, plan);
    } catch (error) {
      this.handleStripeError(error);
    }
  }

  async getPlan(planId: string): Promise<ServiceResponse> {
    if (!planId) {
      throw new BadRequestError('Plan Id is required');
    }

    const plan = await this.em.findOne(Plan, { id: planId });

    if (!plan) {
      throw new NotFoundError('Plan');
    }

    return createServiceResponse(200, 'Plan has been fetched', true, plan);
  }

  async getPlanByStripeId(stripePriceId: string): Promise<ServiceResponse> {
    const plan = this.em.findOne(Plan, { stripePriceId });

    if (!stripePriceId) {
      throw new BadRequestError('Stripe price Id is required');
    }

    if (!plan) {
      throw new NotFoundError('Plan');
    }

    return createServiceResponse(
      200,
      ' Stripe plan has been loaded',
      true,
      plan
    );
  }

  async getPlanByStripeProductId(
    stripeProductId: string
  ): Promise<ServiceResponse> {
    if (!stripeProductId) {
      throw new BadRequestError('Stripe product Id is required');
    }

    const plan = this.em.findOne(Plan, { stripeProductId });

    if (!plan) {
      throw new NotFoundError('Plan');
    }

    return createServiceResponse(
      200,
      ' Stripe plan has been loaded',
      true,
      plan
    );
  }

  async listPlans(onlyActive: boolean = true): Promise<ServiceResponse> {
    const where: FilterQuery<Plan> = onlyActive
      ? { status: PlanStatus.ACTIVE }
      : {};

    const plans = await this.em.find<Plan>(Plan, where, {
      orderBy: { amount: QueryOrder.ASC },
      populate: ['subscriptions'],
    });

    return createServiceResponse(200, 'Plans has been fetched', true, {
      plans,
    });
  }

  async deactivatePlan(planId: string): Promise<ServiceResponse> {
    const plan = await this.em.findOne(Plan, { id: planId });

    if (!plan) {
      throw new NotFoundError('Plan');
    }

    if (!plan.stripeProductId)
      throw new BadRequestError('Stripe product Id is required');

    try {
      // Desactivar precio en Stripe
      await this.stripe.prices.update(plan.stripePriceId, {
        active: false,
      });

      await this.stripe.products.update(plan.stripeProductId, {
        active: false,
      });

      // Actualizar en base de datos
      plan.isActive = false;
      plan.status = PlanStatus.INACTIVE;

      await this.em.flush();

      return createServiceResponse(
        200,
        'Plan has been deactivated',
        true,
        plan
      );
    } catch (error) {
      this.handleStripeError(error);
    }
  }

  async syncPlanFromStripe(stripePriceId: string): Promise<ServiceResponse> {
    try {
      const stripePrice = await this.stripe.prices.retrieve(stripePriceId);
      const stripeProduct = await this.stripe.products.retrieve(
        stripePrice.product as string
      );

      let plan = await this.em.findOne(Plan, { stripePriceId });

      if (!plan) {
        // Crear nuevo plan
        plan = this.em.create<Plan>(Plan, {
          stripePriceId: stripePrice.id,
          stripeProductId: stripeProduct.id,
          name: stripeProduct.name,
          description: stripeProduct.description || undefined,
          amount: stripePrice.unit_amount || 0,
          currency: stripePrice.currency,
          interval: stripePrice.recurring?.interval as PlanInterval,
          intervalCount: stripePrice.recurring?.interval_count || 1,
          trialPeriodDays:
            stripePrice.recurring?.trial_period_days || undefined,
          isActive: stripePrice.active,
          status: stripePrice.active ? PlanStatus.ACTIVE : PlanStatus.INACTIVE,
          metadata: stripeProduct.metadata,
        });
      } else {
        // Actualizar existente
        plan.name = stripeProduct.name;
        plan.description = stripeProduct.description || undefined;
        plan.isActive = stripePrice.active;
        plan.status = stripePrice.active
          ? PlanStatus.ACTIVE
          : PlanStatus.INACTIVE;
        plan.metadata = stripeProduct.metadata;
      }

      this.em.persist(plan);
      await this.em.flush();

      // Sincronizar permisos desde metadata
      if (stripeProduct.metadata?.permissions) {
        await this.permissionService.syncPermissionsFromMetadata(
          plan.id,
          stripeProduct.metadata
        );
      }

      return createServiceResponse(200, 'Plan has been synced', true, plan);
    } catch (error) {
      this.handleStripeError(error);
    }
  }

  // ============= MÉTODOS PARA WEBHOOKS =============

  /**
   * Sincronizar plan cuando el producto de Stripe cambia
   */
  async syncPlanFromProduct(stripeProductId: string): Promise<Plan | null> {
    try {
      console.log(`Syncing plan from product: ${stripeProductId}`);

      const product = await this.stripe.products.retrieve(stripeProductId);

      // Buscar plan existente por productId
      let { data: plan } = await this.getPlanByStripeProductId(stripeProductId);

      if (!plan) {
        // El plan podría no existir aún si el precio no se ha creado
        console.log(
          `No plan found for product ${stripeProductId}, waiting for price event`
        );
        return null;
      }

      // Actualizar información del producto
      plan.name = product.name;
      plan.description = product.description || undefined;
      plan.metadata = product.metadata;
      plan.isActive = product.active;

      this.em.persist(plan);
      await this.em.flush();

      // Sincronizar permisos desde metadata
      if (product.metadata?.permissions) {
        await this.permissionService.syncPermissionsFromMetadata(
          plan.id,
          product.metadata
        );
        console.log(
          `Synced permissions for plan ${plan.id} from product metadata`
        );
      }

      console.log(
        `Successfully synced plan ${plan.id} from product ${stripeProductId}`
      );
      return plan;
    } catch (error: any) {
      console.error(
        `Error syncing plan from product ${stripeProductId}:`,
        error.message
      );
      this.handleStripeError(error);
    }
  }

  /**
   * Archivar plan cuando el producto es eliminado
   */
  async archivePlanFromProduct(stripeProductId: string): Promise<void> {
    try {
      const { data: plan } =
        await this.getPlanByStripeProductId(stripeProductId);

      if (!plan) {
        console.log(`No plan found for deleted product ${stripeProductId}`);
        return;
      }

      plan.isActive = false;
      plan.status = PlanStatus.ARCHIVED;

      this.em.persist(plan);
      await this.em.flush();

      console.log(
        `Archived plan ${plan.id} due to product deletion ${stripeProductId}`
      );
    } catch (error: any) {
      console.error(
        `Error archiving plan from product ${stripeProductId}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Archivar plan cuando el precio es eliminado
   */
  async archivePlanFromPrice(stripePriceId: string): Promise<void> {
    try {
      const { data: plan } = await this.getPlanByStripeId(stripePriceId);

      if (!plan) {
        console.log(`No plan found for deleted price ${stripePriceId}`);
        return;
      }

      plan.isActive = false;
      plan.status = PlanStatus.ARCHIVED;

      this.em.persist(plan);
      await this.em.flush();

      console.log(
        `Archived plan ${plan.id} due to price deletion ${stripePriceId}`
      );
    } catch (error: any) {
      console.error(
        `Error archiving plan from price ${stripePriceId}:`,
        error.message
      );
      throw error;
    }
  }
}
