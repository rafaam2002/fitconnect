import { EntityManager, QueryOrder } from '@mikro-orm/core';
import { BaseService } from './base.service';
import { User } from '../entities/User';
import { Subscription, SubscriptionStatus } from '../entities/Subscription';
import { StripeCustomer } from '../entities/StripeCustomer';
import { PaymentMethod, PaymentMethodStatus } from '../entities/PaymentMethod';
import { Plan } from '../entities/Plan';
import {
  BadRequestError,
  ConflictError,
  createServiceResponse,
  InternalServerError,
  NotFoundError,
} from '../utils/errors.util';
import { ServiceResponse } from '../types/common.type';

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
  constructor(em: EntityManager) {
    super(em);
  }

  /**
   * Crear suscripción en Stripe
   */
  public async createSubscription(
    input: CreateSubscriptionInput
  ): Promise<ServiceResponse> {
    // Validaciones de entrada
    if (!input.userId || !input.planId || !input.companyId) {
      throw new BadRequestError('User ID, Plan ID and Company ID are required');
    }

    if (input.quantity && input.quantity <= 0) {
      throw new BadRequestError('Quantity must be greater than 0');
    }

    if (input.trialPeriodDays !== undefined && input.trialPeriodDays < 0) {
      throw new BadRequestError('Trial period days cannot be negative');
    }

    // Buscar usuario y plan
    const user = await this.em.findOne(User, { id: input.userId });
    if (!user) {
      throw new NotFoundError('User');
    }

    const plan = await this.em.findOne(Plan, {
      id: input.planId,
      isActive: true,
    });
    if (!plan) {
      throw new NotFoundError('Plan not found or inactive');
    }

    // Buscar customer de Stripe
    const stripeCustomer = await this.em.findOne(StripeCustomer, {
      user,
      isActive: true,
    });

    if (!stripeCustomer) {
      throw new BadRequestError(
        'Stripe customer not found. Please create a customer first'
      );
    }

    // Verificar suscripción duplicada al mismo plan
    const existingSubscription = await this.em.findOne(Subscription, {
      user,
      plan,
      status: {
        $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
      },
    });

    if (existingSubscription) {
      throw new ConflictError(
        'User already has an active subscription to this plan'
      );
    }

    // Validar método de pago si se proporciona
    let paymentMethod: PaymentMethod | null = null;
    if (input.paymentMethodId) {
      paymentMethod = await this.em.findOne(PaymentMethod, {
        stripePaymentMethodId: input.paymentMethodId,
        stripeCustomer,
        status: PaymentMethodStatus.ACTIVE,
      });

      if (!paymentMethod) {
        throw new NotFoundError('Payment method not found or inactive');
      }
    }
    try {
      // Crear suscripción en Stripe
      const stripeSubscriptionData: any = {
        customer: stripeCustomer.stripeCustomerId,
        items: [
          {
            price: plan.stripePriceId,
            quantity: input.quantity || 1,
          },
        ],
        metadata: {
          userId: user.id,
          planId: plan.id,
          ...input.metadata,
        },
      };

      // Configurar método de pago por defecto
      if (paymentMethod) {
        stripeSubscriptionData.default_payment_method = input.paymentMethodId;
      }

      // Configurar período de prueba personalizado
      if (input.trialPeriodDays !== undefined) {
        if (input.trialPeriodDays > 0) {
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + input.trialPeriodDays);
          stripeSubscriptionData.trial_end = Math.floor(
            trialEnd.getTime() / 1000
          );
        } else {
          stripeSubscriptionData.trial_period_days = 0;
        }
      }

      const stripeSubscription = await this.stripe.subscriptions.create(
        stripeSubscriptionData,
        {
          idempotencyKey: this.generateIdempotencyKey(
            'subscription',
            user.id,
            plan.id
          ),
        }
      );

      // Crear en base de datos
      const subscription = this.em.create(Subscription, {
        stripeSubscriptionId: stripeSubscription.id,
        user,
        stripeCustomer,
        plan,
        defaultPaymentMethod: paymentMethod,
        status: stripeSubscription.status as SubscriptionStatus,
        currentPeriodStart: new Date(
          stripeSubscription.current_period_start * 1000
        ),
        currentPeriodEnd: new Date(
          stripeSubscription.current_period_end * 1000
        ),
        trialStart: stripeSubscription.trial_start
          ? new Date(stripeSubscription.trial_start * 1000)
          : undefined,
        trialEnd: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000)
          : undefined,
        quantity: stripeSubscription.items.data[0]?.quantity || 1,
        metadata: stripeSubscription.metadata,
        company: input.companyId,
        isInTrial: false,
        isPastDue: false,
      });

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

    const updatedStripeSubscription = await this.stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        pause_collection: {
          behavior: 'void',
        },
      }
    );

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
        subscriptions.find(sub => sub.isActive) || null;

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

  /**
   * Sincronizar suscripción desde Stripe
   */
  public async syncSubscriptionFromStripe(
    stripeSubscriptionId: string
  ): Promise<ServiceResponse> {
    if (!stripeSubscriptionId) {
      throw new BadRequestError('Stripe subscription ID is required');
    }
    const stripeSubscription =
      await this.stripe.subscriptions.retrieve(stripeSubscriptionId);

    // Buscar customer en BD
    const stripeCustomer = await this.em.findOne(
      StripeCustomer,
      {
        stripeCustomerId: stripeSubscription.customer as string,
      },
      {
        populate: ['user'] as any,
      }
    );

    if (!stripeCustomer) {
      throw new NotFoundError('Stripe customer not found in database');
    }

    // Buscar plan en BD
    const plan = await this.em.findOne(Plan, {
      stripePriceId: stripeSubscription.items.data[0].price.id,
    });

    if (!plan) {
      throw new NotFoundError('Plan not found in database');
    }
    try {
      let subscription = await this.em.findOne(Subscription, {
        stripeSubscriptionId,
      });

      if (!subscription) {
        // Crear nueva suscripción
        subscription = this.em.create<Subscription>(Subscription, {
          stripeSubscriptionId,
          user: stripeCustomer.user,
          stripeCustomer,
          plan,
          status: stripeSubscription.status as SubscriptionStatus,
          currentPeriodStart: new Date(
            stripeSubscription.current_period_start * 1000
          ),
          currentPeriodEnd: new Date(
            stripeSubscription.current_period_end * 1000
          ),
          trialStart: stripeSubscription.trial_start
            ? new Date(stripeSubscription.trial_start * 1000)
            : undefined,
          trialEnd: stripeSubscription.trial_end
            ? new Date(stripeSubscription.trial_end * 1000)
            : undefined,
          canceledAt: stripeSubscription.canceled_at
            ? new Date(stripeSubscription.canceled_at * 1000)
            : undefined,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          endedAt: stripeSubscription.ended_at
            ? new Date(stripeSubscription.ended_at * 1000)
            : undefined,
          quantity: stripeSubscription.items.data[0]?.quantity || 1,
          metadata: stripeSubscription.metadata,
        } as Subscription);
      } else {
        // Actualizar existente
        subscription.status = stripeSubscription.status as SubscriptionStatus;
        subscription.currentPeriodStart = new Date(
          stripeSubscription.current_period_start * 1000
        );
        subscription.currentPeriodEnd = new Date(
          stripeSubscription.current_period_end * 1000
        );
        subscription.cancelAtPeriodEnd =
          stripeSubscription.cancel_at_period_end;
        subscription.canceledAt = stripeSubscription.canceled_at
          ? new Date(stripeSubscription.canceled_at * 1000)
          : undefined;
        subscription.endedAt = stripeSubscription.ended_at
          ? new Date(stripeSubscription.ended_at * 1000)
          : undefined;
        subscription.quantity =
          stripeSubscription.items.data[0]?.quantity || subscription.quantity;
        subscription.metadata = stripeSubscription.metadata;
      }

      this.em.persist(subscription!);
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
}
