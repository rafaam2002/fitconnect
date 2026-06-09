import { EntityManager, QueryOrder } from '@mikro-orm/core';
import { EntityManager as EM } from '@mikro-orm/postgresql';
import moment from 'moment';
import Stripe from 'stripe';

import { Customer } from '../entities/Customer';
import { PaymentMethod, PaymentMethodStatus } from '../entities/PaymentMethod';
import { Plan } from '../entities/Plan';
import { Subscription, SubscriptionStatus } from '../entities/Subscription';
import { User } from '../entities/User';
import {
  CurrentUser,
  EmailConfig,
  ServiceResponse,
} from '../types/common.type';
import { UserRoleEnum } from '../types/enums';
import {
  BadRequestError,
  ConflictError,
  createServiceResponse,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
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
      const plan = await this.getActivePlanOrFail(input.planId);
      const customer = await this.getOrCreateAdminCustomer(user);

      // Validaciones de negocio
      await this.validateNoDuplicateSubscription(user, plan);
      const paymentMethod = await this.getPaymentMethodIfProvided(
        input.paymentMethodId,
        customer
      );

      // Crear en Stripe
      const stripeSubData = this.buildStripeSubscriptionData(
        customer,
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
        customer,
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
        populate: ['user', 'plan', 'customer'],
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
        customer: subscription.customer,
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
        populate: ['user', 'plan', 'customer', 'defaultPaymentMethod'],
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
      const customer = await this.getCustomerOrFail(
        stripeSub.customer as string
      );
      const plan = await this.getPlanByPriceIdOrFail(priceId);

      // Buscar o crear suscripción
      let subscription = await this.em.findOne(Subscription, {
        stripeSubscriptionId,
      });
      const mappedData = this.mapStripeSubscriptionData(stripeSub);

      if (subscription) {
        this.em.assign(subscription, mappedData);
      } else {
        subscription = this.em.create(Subscription, {
          stripeSubscriptionId,
          user: customer.user,
          customer,
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

  /**
   * Obtener estadísticas de suscripciones activas del mes calendario actual agrupadas por plan
   */
  public async getSubscriptionsStats(
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    try {
      const SubscriptionRepo = this.em.getRepository(Subscription);

      // Rango de fechas para el mes calendario actual
      // const startOfMonth = moment().startOf('month').toDate();
      // const endOfMonth = moment().endOf('month').toDate();

      // Consultar suscripciones activas creadas en el mes actual, seleccionando solo plan.id y plan.name
      const subscriptions = await SubscriptionRepo.find(
        {
          status: SubscriptionStatus.ACTIVE,
          // created_at: { $gte: startOfMonth, $lte: endOfMonth },
        },
        { fields: ['plan.id', 'plan.name'] }
      );

      // Agrupar en un Map por plan para eficiencia O(N)
      const grouped = new Map<string, { planName: string; count: number }>();

      for (const sub of subscriptions) {
        const plan = sub.plan;
        if (!plan) continue;

        const existing = grouped.get(plan.id);
        if (existing) {
          existing.count += 1;
        } else {
          grouped.set(plan.id, { planName: plan.name, count: 1 });
        }
      }

      const stats = Array.from(grouped.entries()).map(([planId, data]) => ({
        planId,
        planName: data.planName,
        count: data.count,
      }));

      return createServiceResponse(
        200,
        'Subscription stats calculated successfully',
        true,
        {
          stats,
        }
      );
    } catch (error: any) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new InternalServerError('Error calculating subscription stats');
    }
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

  private async getActivePlanOrFail(planId: string): Promise<Plan> {
    const plan = await this.em.findOne(
      Plan,
      { id: planId, isActive: true },
      { filters: { companyContext: false } }
    );
    if (!plan) {
      throw new NotFoundError('Plan not found or inactive');
    }
    return plan;
  }

  private async getOrCreateAdminCustomer(user: User): Promise<Customer> {
    const sqlEm = this.em as unknown as EM;

    let customer = await sqlEm
      .createQueryBuilder(Customer, 'sc')
      .join('sc.user', 'u')
      .join('u.roles', 'r')
      .join('sc.paymentMethods', 'pm')
      .where({ 'r.role': UserRoleEnum.ADMIN })
      .getSingleResult();

    if (customer) {
      await this.em.populate(customer, [
        'paymentMethods',
        'user',
        'user.roles',
      ]);
      return customer;
    }

    await this.customerService.createCustomer({
      userId: user.id,
      email: user.email,
      name: user.name || 'Usuario',
      phone: user.phoneNumber || '+34 1234 45 67 89',
    });

    // Re-fetch después de crear
    return this.getOrCreateAdminCustomer(user);
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
      throw new ConflictError(
        'User already has an active subscription to this plan'
      );
    }
  }

  private async getPaymentMethodIfProvided(
    paymentMethodId: string | undefined,
    customer: Customer
  ): Promise<PaymentMethod | null> {
    if (!paymentMethodId) return null;

    const paymentMethod = await this.em.findOne(PaymentMethod, {
      stripePaymentMethodId: paymentMethodId,
      customer,
      status: PaymentMethodStatus.ACTIVE,
    });

    if (!paymentMethod) {
      throw new NotFoundError('Payment method not found or inactive');
    }

    return paymentMethod;
  }

  private buildStripeSubscriptionData(
    customer: Customer,
    plan: Plan,
    user: User,
    input: CreateSubscriptionInput,
    paymentMethod: PaymentMethod | null
  ): Stripe.SubscriptionCreateParams {
    const data: Stripe.SubscriptionCreateParams = {
      customer: customer.customerId,
      default_payment_method:
        paymentMethod?.stripePaymentMethodId ??
        customer.paymentMethods[0]?.stripePaymentMethodId,
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

  // ============= HELPERS =============

  private createSubscriptionEntity(
    stripeSub: Stripe.Subscription,
    user: User,
    customer: Customer,
    plan: Plan,
    paymentMethod: PaymentMethod | null,
    companyId: string
  ): Subscription {
    return this.em.create(Subscription, {
      stripeSubscriptionId: stripeSub.id,
      user,
      customer,
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

  private stripeTimestampToDate(
    timestamp: number | null | undefined
  ): Date | undefined {
    return timestamp ? new Date(timestamp * 1000) : undefined;
  }

  private async getCustomerOrFail(customerId: string): Promise<Customer> {
    const customer = await this.em.findOne(
      Customer,
      { customerId },
      { populate: ['user'] as any }
    );

    if (!customer) {
      throw new NotFoundError('Stripe customer not found in database');
    }

    return customer;
  }

  private async getPlanByPriceIdOrFail(priceId: string): Promise<Plan> {
    const plan = await this.em.findOne(Plan, { stripePriceId: priceId });

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
