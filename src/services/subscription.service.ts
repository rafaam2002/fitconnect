import { EntityManager, QueryOrder } from '@mikro-orm/core';
import { EntityManager as EM } from '@mikro-orm/postgresql';
import moment from 'moment';
import Stripe from 'stripe';

import { PaymentMethod, PaymentMethodStatus } from '../entities/PaymentMethod';
import { Plan } from '../entities/Plan';
import { StripeCustomer } from '../entities/StripeCustomer';
import { Subscription, SubscriptionStatus } from '../entities/Subscription';
import { User } from '../entities/User';
import { UserRole } from '../entities/UserRole';
import { EmailConfig, ServiceResponse } from '../types/common.type';
import { UserRoleEnum } from '../types/enums';
import {
  BadRequestError,
  ConflictError,
  createServiceResponse,
  InternalServerError,
  NotFoundError,
} from '../utils/errors.util';
import { sendSubscriptionExpiryWarning } from '../utils/templates.util';

import { BaseService } from './base.service';
import { CustomerService } from './customer.service';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';

interface CreateSubscriptionInput {
  userId: string;
  planId: string;
  paymentMethodId?: string;
  trialPeriodDays?: number;
  quantity?: number;
  metadata?: Record<string, any>;
  companyId: string;
}

interface UpdateSubscriptionInput {
  subscriptionId: string;
  planId?: string;
  quantity?: number;
  paymentMethodId?: string;
  metadata?: Record<string, any>;
}

interface CancelSubscriptionInput {
  subscriptionId: string;
  cancelAtPeriodEnd?: boolean;
  cancellationReason?: string;
}

export class SubscriptionService extends BaseService {
  private readonly customerService: CustomerService;
  private readonly emailService: EmailService;
  private readonly notificationService: NotificationService;

  constructor(em: EntityManager) {
    super(em);

    this.customerService = new CustomerService(em);
    this.emailService = new EmailService();
    this.notificationService = new NotificationService(em);
  }

  // ============= VALIDACIONES =============

  public async createSubscription(
    input: CreateSubscriptionInput
  ): Promise<ServiceResponse> {
    this.validateCreateSubscriptionInput(input);

    try {
      // Obtener entidades requeridas
      const user = await this.getUserOrFail(input.userId);
      const plan = await this.getActivePlanOrFail(input.planId, input.userId);
      const stripeCustomer = await this.getOrCreateAdminStripeCustomer(user);

      // Validaciones de negocio
      await this.validateNoDuplicateSubscription(user, plan);
      const paymentMethod = await this.getPaymentMethodIfProvided(
        input.paymentMethodId,
        stripeCustomer
      );

      // Crear en Stripe
      const stripeSubData = this.buildStripeSubscriptionData(
        stripeCustomer,
        plan,
        user,
        input,
        paymentMethod
      );
      const stripeSub = await this.stripe.subscriptions.create(stripeSubData, {
        idempotencyKey: this.generateIdempotencyKey(
          'subscription',
          user.id,
          plan.id
        ),
      });

      // Persistir en BD
      const subscription = this.createSubscriptionEntity(
        stripeSub,
        user,
        stripeCustomer,
        plan,
        paymentMethod,
        input.companyId
      );
      this.em.persist(subscription);
      await this.em.flush();

      return createServiceResponse(
        200,
        'Subscription created successfully',
        true,
        {
          subscription,
        }
      );
    } catch (error: any) {
      if (
        error instanceof NotFoundError ||
        error instanceof BadRequestError ||
        error instanceof ConflictError
      ) {
        throw error;
      }
      this.handleStripeError(error);
    }
  }

  // ============= OBTENCIÓN DE ENTIDADES =============

  /**
   * Actualizar suscripción
   */
  public async updateSubscription(
    input: UpdateSubscriptionInput
  ): Promise<ServiceResponse> {
    if (!input.subscriptionId) {
      throw new BadRequestError('Subscription ID is required');
    }

    if (input.quantity && input.quantity <= 0) {
      throw new BadRequestError('Quantity must be greater than 0');
    }

    const subscription = await this.em.findOne(
      Subscription,
      {
        id: input.subscriptionId,
      },
      {
        populate: ['user', 'plan', 'stripeCustomer'],
      }
    );

    if (!subscription) {
      throw new NotFoundError('Subscription');
    }

    const updateData: any = {};

    // Cambiar plan
    if (input.planId) {
      const newPlan = await this.em.findOne(Plan, {
        id: input.planId,
        isActive: true,
      });
      if (!newPlan) {
        throw new NotFoundError('New plan not found or inactive');
      }

      const stripeSubscriptionData = await this.stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      updateData.items = [
        {
          id: stripeSubscriptionData.items.data[0].id,
          price: newPlan.stripePriceId,
          quantity: input.quantity || subscription.quantity || 1,
        },
      ];

      // Actualizar referencia en BD
      subscription.plan = newPlan;
    }

    // Cambiar cantidad
    if (input.quantity && !input.planId) {
      const stripeSubscriptionData = await this.stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );
      updateData.items = [
        {
          id: stripeSubscriptionData.items.data[0].id,
          quantity: input.quantity,
        },
      ];
    }

    // Cambiar método de pago por defecto
    if (input.paymentMethodId) {
      const paymentMethod = await this.em.findOne(PaymentMethod, {
        stripePaymentMethodId: input.paymentMethodId,
        stripeCustomer: subscription.stripeCustomer,
        status: PaymentMethodStatus.ACTIVE,
      });

      if (!paymentMethod) {
        throw new NotFoundError('Payment method not found or inactive');
      }

      updateData.default_payment_method = input.paymentMethodId;
      subscription.defaultPaymentMethod = paymentMethod;
    }

    // Metadatos
    if (input.metadata) {
      updateData.metadata = { ...subscription.metadata, ...input.metadata };
      subscription.metadata = updateData.metadata;
    }

    // Actualizar en Stripe
    const updatedStripeSubscription = await this.stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      updateData
    );

    // Actualizar campos en BD
    subscription.status =
      updatedStripeSubscription.status as SubscriptionStatus;
    subscription.currentPeriodStart = new Date(
      updatedStripeSubscription.current_period_start * 1000
    );
    subscription.currentPeriodEnd = new Date(
      updatedStripeSubscription.current_period_end * 1000
    );
    subscription.quantity =
      updatedStripeSubscription.items.data[0]?.quantity ||
      subscription.quantity;

    await this.em.flush();

    return createServiceResponse(
      200,
      'Subscription updated successfully',
      true,
      {
        subscription,
      }
    );
  }

  /**
   * Cancelar suscripción
   */
  public async cancelSubscription(
    input: CancelSubscriptionInput
  ): Promise<ServiceResponse> {
    if (!input.subscriptionId) {
      throw new BadRequestError('Subscription ID is required');
    }

    const subscription = await this.em.findOne(Subscription, {
      id: input.subscriptionId,
    });

    if (!subscription) {
      throw new NotFoundError('Subscription');
    }

    if (!subscription.isActive) {
      throw new BadRequestError('Subscription is not active');
    }

    let updatedStripeSubscription;

    if (input.cancelAtPeriodEnd) {
      // Cancelar al final del período actual
      updatedStripeSubscription = await this.stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
          metadata: {
            ...subscription.metadata,
            cancellation_reason: input.cancellationReason ?? '',
          },
        }
      );
    } else {
      // Cancelar inmediatamente
      await this.stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          metadata: {
            cancellation_reason: input.cancellationReason ?? '',
          },
        }
      );

      updatedStripeSubscription = await this.stripe.subscriptions.cancel(
        subscription.stripeSubscriptionId
      );
    }

    // Actualizar en BD
    subscription.status =
      updatedStripeSubscription.status as SubscriptionStatus;
    subscription.cancelAtPeriodEnd =
      updatedStripeSubscription.cancel_at_period_end;
    subscription.canceledAt = updatedStripeSubscription.canceled_at
      ? new Date(updatedStripeSubscription.canceled_at * 1000)
      : undefined;
    subscription.endedAt = updatedStripeSubscription.ended_at
      ? new Date(updatedStripeSubscription.ended_at * 1000)
      : undefined;

    if (input.cancellationReason) {
      subscription.metadata = {
        ...subscription.metadata,
        cancellation_reason: input.cancellationReason,
      };
    }

    await this.em.flush();

    return createServiceResponse(
      200,
      'Subscription cancelled successfully',
      true,
      {
        subscription,
      }
    );
  }

  /**
   * Pausar suscripción
   */
  public async pauseSubscription(
    subscriptionId: string
  ): Promise<ServiceResponse> {
    if (!subscriptionId) {
      throw new BadRequestError('Subscription ID is required');
    }

    const subscription = await this.em.findOne(Subscription, {
      id: subscriptionId,
    });

    if (!subscription) {
      throw new NotFoundError('Subscription');
    }

    if (!subscription.isActive) {
      throw new BadRequestError('Subscription is not active');
    }

    subscription.status = SubscriptionStatus.PAUSED as SubscriptionStatus;
    await this.em.flush();

    return createServiceResponse(
      200,
      'Subscription paused successfully',
      true,
      {
        subscription,
      }
    );
  }

  /**
   * Reanudar suscripción
   */
  public async resumeSubscription(
    subscriptionId: string
  ): Promise<ServiceResponse> {
    if (!subscriptionId) {
      throw new BadRequestError('Subscription ID is required');
    }

    const subscription = await this.em.findOne(Subscription, {
      id: subscriptionId,
    });

    if (!subscription) {
      throw new NotFoundError('Subscription');
    }

    if (subscription.status !== SubscriptionStatus.PAUSED) {
      throw new BadRequestError('Subscription is not paused');
    }
    try {
      const updatedStripeSubscription = await this.stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          pause_collection: null as any,
        }
      );

      subscription.status =
        updatedStripeSubscription.status as SubscriptionStatus;
      await this.em.flush();

      return createServiceResponse(
        200,
        'Subscription resumed successfully',
        true,
        {
          subscription,
        }
      );
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      this.handleStripeError(error);
    }
  }

  /**
   * Obtener suscripción por ID
   */
  public async getSubscription(
    subscriptionId: string
  ): Promise<ServiceResponse> {
    if (!subscriptionId) {
      throw new BadRequestError('Subscription ID is required');
    }

    const subscription = await this.em.findOne(
      Subscription,
      { id: subscriptionId },
      {
        populate: ['user', 'plan', 'stripeCustomer', 'defaultPaymentMethod'],
      }
    );

    if (!subscription) {
      throw new NotFoundError('Subscription');
    }

    return createServiceResponse(
      200,
      'Subscription fetched successfully',
      true,
      {
        subscription,
      }
    );
  }

  // ============= CONSTRUCCIÓN DE DATOS =============

  /**
   * Listar suscripciones de usuario
   */
  public async listUserSubscriptions(userId: string): Promise<ServiceResponse> {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new NotFoundError('User');
    }

    const subscriptions = await this.em.find(Subscription, { user }, {
      populate: ['plan', 'defaultPaymentMethod'],
      orderBy: { created_at: QueryOrder.DESC },
    } as any);

    return createServiceResponse(
      200,
      'User subscriptions fetched successfully',
      true,
      {
        subscriptions,
      }
    );
  }

  /**
   * Obtener suscripción activa de usuario
   */
  public async getActiveSubscription(userId: string): Promise<ServiceResponse> {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new NotFoundError('User');
    }
    try {
      const subscriptions = await this.em.find(Subscription, { user }, {
        populate: ['plan', 'defaultPaymentMethod'],
        orderBy: { created_at: QueryOrder.DESC },
      } as any);

      const activeSubscription =
        subscriptions.find(sub => sub.isActive) ?? null;

      return createServiceResponse(
        200,
        'Active subscription fetched successfully',
        true,
        {
          subscription: activeSubscription,
        }
      );
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      throw new InternalServerError('Error fetching active subscription');
    }
  }

  public async syncSubscriptionFromStripe(
    stripeSubscriptionId: string
  ): Promise<ServiceResponse> {
    if (!stripeSubscriptionId) {
      throw new BadRequestError('Stripe subscription ID is required');
    }

    try {
      const stripeSub =
        await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
      const priceId = stripeSub.items.data[0].price.id;

      // Obtener dependencias
      const stripeCustomer = await this.getStripeCustomerOrFail(
        stripeSub.customer as string
      );
      const plan = await this.getPlanByPriceIdOrFail(priceId);

      // Buscar o crear suscripción
      let subscription = await this.em.findOne(
        Subscription,
        {
          stripeSubscriptionId,
        },
        { filters: false }
      );
      const mappedData = this.mapStripeSubscriptionData(stripeSub);

      if (subscription) {
        this.em.assign(subscription, mappedData);
      } else {
        subscription = this.em.create(Subscription, {
          stripeSubscriptionId,
          user: stripeCustomer.user,
          stripeCustomer,
          plan,
          ...mappedData,
        } as Subscription);
      }

      this.em.persist(subscription);
      await this.em.flush();

      return createServiceResponse(
        200,
        'Subscription synchronized successfully',
        true,
        {
          subscription,
        }
      );
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      this.handleStripeError(error);
    }
  }

  public async notifyExpiringSubscriptions(): Promise<void> {
    const tomorrow = moment().add(1, 'days');
    const from = tomorrow.startOf('days').toDate();
    const to = tomorrow.endOf('days').toDate();

    // Traemos suscripciones activas que vencen mañana
    const expiringSubscriptions = await this.em.find(
      Subscription,
      {
        status: SubscriptionStatus.ACTIVE,
        endedAt: { $gte: from, $lte: to },
      },
      {
        populate: ['user', 'user.pushTokens'],
        filters: false,
      }
    );

    if (!expiringSubscriptions.length) {
      console.log('[CRON] Ninguna suscripción expira mañana.');
      return;
    }

    console.log(
      `[CRON] Found ${expiringSubscriptions.length} subscripciones expiran mañana.`
    );

    await Promise.allSettled(
      expiringSubscriptions.map(subscription => this.notifyUser(subscription))
    );
  }

  private validateCreateSubscriptionInput(
    input: CreateSubscriptionInput
  ): void {
    if (!input.userId || !input.planId || !input.companyId) {
      throw new BadRequestError('User ID, Plan ID and Company ID are required');
    }

    if (input.quantity && input.quantity <= 0) {
      throw new BadRequestError('Quantity must be greater than 0');
    }

    if (input.trialPeriodDays !== undefined && input.trialPeriodDays < 0) {
      throw new BadRequestError('Trial period days cannot be negative');
    }
  }

  private async getUserOrFail(userId: string): Promise<User> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  private async getActivePlanOrFail(
    planId: string,
    userId: string
  ): Promise<Plan> {
    const user = await this.em.findOne(User, { id: userId });
    let query = undefined;

    if (user?.roles.exists((u: UserRole) => u.role === UserRoleEnum.ADMIN)) {
      query = { filters: false };
    }

    const plan = await this.em.findOne(
      Plan,
      { id: planId, isActive: true },
      query
    );

    if (!plan) {
      throw new NotFoundError('Plan not found or inactive');
    }
    return plan;
  }

  private async getOrCreateAdminStripeCustomer(
    user: User
  ): Promise<StripeCustomer> {
    const sqlEm = this.em as unknown as EM;

    let stripeCustomer = await sqlEm
      .createQueryBuilder(StripeCustomer, 'sc')
      .join('sc.user', 'u')
      .join('u.roles', 'r')
      .join('sc.paymentMethods', 'pm')
      .where({ 'r.role': UserRoleEnum.ADMIN })
      .getSingleResult();

    if (stripeCustomer) {
      await this.em.populate(stripeCustomer, [
        'paymentMethods',
        'user',
        'user.roles',
      ]);
      return stripeCustomer;
    }

    await this.customerService.createCustomer({
      userId: user.id,
      email: user.email,
      name: user.name || 'Usuario',
      phone: user.phoneNumber || '+34 1234 45 67 89',
    });

    // Re-fetch después de crear
    return this.getOrCreateAdminStripeCustomer(user);
  }

  private async validateNoDuplicateSubscription(
    user: User,
    plan: Plan
  ): Promise<void> {
    const existing = await this.em.findOne(Subscription, {
      user,
      plan,
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
    });

    if (existing) {
      throw new ConflictError('El usuario ya tiene un plan activo');
    }
  }

  private async getPaymentMethodIfProvided(
    paymentMethodId: string | undefined,
    stripeCustomer: StripeCustomer
  ): Promise<PaymentMethod | null> {
    if (!paymentMethodId) return null;

    const paymentMethod = await this.em.findOne(PaymentMethod, {
      stripePaymentMethodId: paymentMethodId,
      stripeCustomer,
      status: PaymentMethodStatus.ACTIVE,
    });

    if (!paymentMethod) {
      throw new NotFoundError('Payment method not found or inactive');
    }

    return paymentMethod;
  }

  private buildStripeSubscriptionData(
    stripeCustomer: StripeCustomer,
    plan: Plan,
    user: User,
    input: CreateSubscriptionInput,
    paymentMethod: PaymentMethod | null
  ): Stripe.SubscriptionCreateParams {
    const data: Stripe.SubscriptionCreateParams = {
      customer: stripeCustomer.stripeCustomerId,
      default_payment_method:
        paymentMethod?.stripePaymentMethodId ??
        stripeCustomer.paymentMethods[0]?.stripePaymentMethodId,
      items: [{ price: plan.stripePriceId, quantity: input.quantity || 1 }],
      metadata: {
        userId: user.id,
        planId: plan.id,
        ...input.metadata,
      },
    };

    if (input.trialPeriodDays === undefined) return data;

    if (input.trialPeriodDays > 0) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + input.trialPeriodDays);
      data.trial_end = Math.floor(trialEnd.getTime() / 1000);
    } else {
      data.trial_period_days = 0;
    }

    return data;
  }

  private createSubscriptionEntity(
    stripeSub: Stripe.Subscription,
    user: User,
    stripeCustomer: StripeCustomer,
    plan: Plan,
    paymentMethod: PaymentMethod | null,
    companyId: string
  ): Subscription {
    return this.em.create(Subscription, {
      stripeSubscriptionId: stripeSub.id,
      user,
      stripeCustomer,
      plan,
      defaultPaymentMethod: paymentMethod,
      company: companyId,
      status: stripeSub.status as SubscriptionStatus,
      currentPeriodStart: this.stripeTimestampToDate(
        stripeSub.current_period_start
      )!,
      currentPeriodEnd: this.stripeTimestampToDate(
        stripeSub.current_period_end
      )!,
      trialStart: this.stripeTimestampToDate(stripeSub.trial_start),
      trialEnd: this.stripeTimestampToDate(stripeSub.trial_end),
      quantity: stripeSub.items.data[0]?.quantity || 1,
      metadata: stripeSub.metadata,
      isInTrial: false,
      isPastDue: false,
    });
  }

  // ============= HELPERS =============

  private stripeTimestampToDate(
    timestamp: number | null | undefined
  ): Date | undefined {
    return timestamp ? new Date(timestamp * 1000) : undefined;
  }

  private async getStripeCustomerOrFail(
    customerId: string
  ): Promise<StripeCustomer> {
    const customer = await this.em.findOne(
      StripeCustomer,
      { stripeCustomerId: customerId },
      {
        populate: ['user'] as any,
        filters: false,
      }
    );

    if (!customer) {
      throw new NotFoundError('Stripe customer not found in database');
    }

    return customer;
  }

  private async getPlanByPriceIdOrFail(priceId: string): Promise<Plan> {
    const plan = await this.em.findOne(
      Plan,
      { stripePriceId: priceId },
      { filters: false }
    );

    if (!plan) {
      throw new NotFoundError('Plan not found in database');
    }

    return plan;
  }

  private mapStripeSubscriptionData(
    stripeSub: Stripe.Subscription
  ): Partial<Subscription> {
    const item = stripeSub.items.data[0];

    return {
      status: stripeSub.status as SubscriptionStatus,
      currentPeriodStart: this.stripeTimestampToDate(
        stripeSub.current_period_start
      )!,
      currentPeriodEnd: this.stripeTimestampToDate(
        stripeSub.current_period_end
      )!,
      trialStart: this.stripeTimestampToDate(stripeSub.trial_start),
      trialEnd: this.stripeTimestampToDate(stripeSub.trial_end),
      canceledAt: this.stripeTimestampToDate(stripeSub.canceled_at),
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      endedAt: this.stripeTimestampToDate(stripeSub.ended_at),
      quantity: item?.quantity || 1,
      metadata: stripeSub.metadata,
    };
  }

  private async notifyUser(subscription: Subscription): Promise<void> {
    const { user } = subscription;

    const expiryDate = subscription.endedAt?.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const config: EmailConfig = {
      from: process.env.GMAIL_USER!,
      to: user.email!,
      subject: 'Change your password',
      html: sendSubscriptionExpiryWarning(
        expiryDate || moment().format('YYYY-MM-DD')
      ),
    };
    // Email y push en paralelo
    await Promise.allSettled([
      this.emailService.sendEmail(config),
      this.notificationService.sendToUser(
        user.id,
        '⚠️ Suscripción por vencer',
        `Tu suscripción vence el ${expiryDate}. Contacta con el administrador para renovarla.`
      ),
    ]);
  }
}
