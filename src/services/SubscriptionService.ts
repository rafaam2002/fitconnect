import {EntityManager, QueryOrder} from '@mikro-orm/core';
import {BaseService} from './BaseService.js';
import {User} from "../entities/User";
import {Subscription, SubscriptionStatus} from "../entities/Subscription";
import {StripeCustomer} from "../entities/StripeCustomer";
import {PaymentMethod, PaymentMethodStatus} from "../entities/PaymentMethod";
import {Plan} from "../entities/Plan";

interface CreateSubscriptionInput {
    userId: string;
    planId: string;
    paymentMethodId?: string;
    trialPeriodDays?: number;
    quantity?: number;
    metadata?: Record<string, any>;
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

    async createSubscription(input: CreateSubscriptionInput): Promise<Subscription> {
        // Buscar usuario y plan
        const user = await this.em.findOne(User, { id: input.userId });
        if (!user) {
            throw new Error('User not found');
        }

        const plan = await this.em.findOne(Plan, { id: input.planId, isActive: true });
        if (!plan) {
            throw new Error('Plan not found or inactive');
        }

        // Buscar customer de Stripe
        const stripeCustomer = await this.em.findOne(StripeCustomer, {
            user,
            isActive: true
        });

        if (!stripeCustomer) {
            throw new Error('Stripe customer not found. Please create a customer first.');
        }

        // Verificar suscripción duplicada al mismo plan
        const existingSubscription = await this.em.findOne(Subscription, {
            user,
            plan,
            status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] }
        });

        if (existingSubscription) {
            throw new Error('User already has an active subscription to this plan');
        }

        // Validar método de pago si se proporciona
        let paymentMethod: PaymentMethod | null = null;
        if (input.paymentMethodId) {
            paymentMethod = await this.em.findOne(PaymentMethod, {
                stripePaymentMethodId: input.paymentMethodId,
                stripeCustomer,
                status: PaymentMethodStatus.ACTIVE
            });

            if (!paymentMethod) {
                throw new Error('Payment method not found or inactive');
            }
        }

        try {
            // Crear suscripción en Stripe
            const stripeSubscriptionData: any = {
                customer: stripeCustomer.stripeCustomerId,
                items: [{
                    price: plan.stripePriceId,
                    quantity: input.quantity || 1
                }],
                metadata: {
                    userId: user.id,
                    planId: plan.id,
                    ...input.metadata
                }
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
                    stripeSubscriptionData.trial_end = Math.floor(trialEnd.getTime() / 1000);
                } else {
                    stripeSubscriptionData.trial_period_days = 0;
                }
            }

            const stripeSubscription = await this.stripe.subscriptions.create(
                stripeSubscriptionData,
                {
                    idempotencyKey: this.generateIdempotencyKey('subscription', user.id, plan.id)
                }
            );

            // Crear en base de datos
            const subscription = this.em.create<Subscription>(Subscription, {
                stripeSubscriptionId: stripeSubscription.id,
                user,
                stripeCustomer,
                plan,
                defaultPaymentMethod: paymentMethod,
                status: stripeSubscription.status as SubscriptionStatus,
                currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
                currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
                trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : undefined,
                trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : undefined,
                quantity: stripeSubscription.items.data[0]?.quantity || 1,
                metadata: stripeSubscription.metadata
            });

            this.em.persist(subscription);
            await this.em.flush();

            return subscription;
        } catch (error) {
            this.handleStripeError(error);
        }
    }

    async updateSubscription(input: UpdateSubscriptionInput): Promise<Subscription> {
        const subscription = await this.em.findOne(Subscription, {
            id: input.subscriptionId
        }, {
            populate: ['user', 'plan', 'stripeCustomer']
        });

        if (!subscription) {
            throw new Error('Subscription not found');
        }

        try {
            const updateData: any = {};

            // Cambiar plan
            if (input.planId) {
                const newPlan = await this.em.findOne(Plan, { id: input.planId, isActive: true });
                if (!newPlan) {
                    throw new Error('New plan not found or inactive');
                }

                updateData.items = [{
                    id: (await this.stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)).items.data[0].id,
                    price: newPlan.stripePriceId,
                    quantity: input.quantity || subscription.quantity || 1
                }];

                // Actualizar referencia en BD
                subscription.plan = newPlan;
            }

            // Cambiar cantidad
            if (input.quantity && !input.planId) {
                const stripeSubscription = await this.stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
                updateData.items = [{
                    id: stripeSubscription.items.data[0].id,
                    quantity: input.quantity
                }];
            }

            // Cambiar método de pago por defecto
            if (input.paymentMethodId) {
                const paymentMethod = await this.em.findOne(PaymentMethod, {
                    stripePaymentMethodId: input.paymentMethodId,
                    stripeCustomer: subscription.stripeCustomer,
                    status: PaymentMethodStatus.ACTIVE
                });

                if (!paymentMethod) {
                    throw new Error('Payment method not found or inactive');
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
            subscription.status = updatedStripeSubscription.status as SubscriptionStatus;
            subscription.currentPeriodStart = new Date(updatedStripeSubscription.current_period_start * 1000);
            subscription.currentPeriodEnd = new Date(updatedStripeSubscription.current_period_end * 1000);
            subscription.quantity = updatedStripeSubscription.items.data[0]?.quantity || subscription.quantity;

            await this.em.flush();

            return subscription;
        } catch (error) {
            this.handleStripeError(error);
        }
    }

    async cancelSubscription(input: CancelSubscriptionInput): Promise<Subscription> {
        const subscription: Subscription = await this.em.findOne(Subscription, {
            id: input.subscriptionId
        });

        if (!subscription) {
            throw new Error('Subscription not found');
        }

        if (!subscription.isActive) {
            throw new Error('Subscription is not active');
        }

        try {
            let updatedStripeSubscription;

            if (input.cancelAtPeriodEnd) {
                // Cancelar al final del período actual
                updatedStripeSubscription = await this.stripe.subscriptions.update(
                    subscription.stripeSubscriptionId,
                    {
                        cancel_at_period_end: true,
                        metadata: {
                            ...subscription.metadata,
                            cancellation_reason: input.cancellationReason
                        }
                    }
                );
            } else {
                // Cancelar inmediatamente
                await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
                    metadata: {
                        cancellation_reason: input.cancellationReason
                    }
                });

                updatedStripeSubscription = await this.stripe.subscriptions.cancel(
                    subscription.stripeSubscriptionId
                );
            }

            // Actualizar en BD
            subscription.status = updatedStripeSubscription.status as SubscriptionStatus;
            subscription.cancelAtPeriodEnd = updatedStripeSubscription.cancel_at_period_end;
            subscription.canceledAt = updatedStripeSubscription.canceled_at ?
                new Date(updatedStripeSubscription.canceled_at * 1000) : undefined;
            subscription.endedAt = updatedStripeSubscription.ended_at ?
                new Date(updatedStripeSubscription.ended_at * 1000) : undefined;

            if (input.cancellationReason) {
                subscription.metadata = {
                    ...subscription.metadata,
                    cancellation_reason: input.cancellationReason
                };
            }

            await this.em.flush();

            return subscription;
        } catch (error) {
            this.handleStripeError(error);
        }
    }

    async pauseSubscription(subscriptionId: string): Promise<Subscription> {
        const subscription = await this.em.findOne(Subscription, { id: subscriptionId });

        if (!subscription) {
            throw new Error('Subscription not found');
        }

        try {
            const updatedStripeSubscription = await this.stripe.subscriptions.update(
                subscription.stripeSubscriptionId,
                {
                    pause_collection: {
                        behavior: 'void'
                    }
                }
            );

            subscription.status = SubscriptionStatus.PAUSED;
            await this.em.flush();

            return subscription;
        } catch (error) {
            this.handleStripeError(error);
        }
    }

    async resumeSubscription(subscriptionId: string): Promise<Subscription> {
        const subscription = await this.em.findOne(Subscription, { id: subscriptionId });

        if (!subscription) {
            throw new Error('Subscription not found');
        }

        try {
            const updatedStripeSubscription = await this.stripe.subscriptions.update(
                subscription.stripeSubscriptionId,
                {
                    pause_collection: undefined
                }
            );

            subscription.status = updatedStripeSubscription.status as SubscriptionStatus;
            await this.em.flush();

            return subscription;
        } catch (error) {
            this.handleStripeError(error);
        }
    }

    async getSubscription(subscriptionId: string): Promise<Subscription | null> {
        return await this.em.findOne(Subscription, { id: subscriptionId }, {
            populate: ['user', 'plan', 'stripeCustomer', 'defaultPaymentMethod']
        });
    }

    async listUserSubscriptions(userId: string): Promise<Subscription[]> {
        const user = await this.em.findOne(User, { id: userId });
        if (!user) {
            throw new Error('User not found');
        }

        return await this.em.find(Subscription, { user }, {
            populate: ['plan', 'defaultPaymentMethod'],
            orderBy: { createdAt: QueryOrder.DESC }
        }as any);
    }

    async syncSubscriptionFromStripe(stripeSubscriptionId: string): Promise<Subscription | null> {
        try {
            const stripeSubscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);

            // Buscar customer en BD
            const stripeCustomer = await this.em.findOne(StripeCustomer, {
                stripeCustomerId: stripeSubscription.customer as string
            }, {
                populate: ['user'] as any
            });

            if (!stripeCustomer) {
                throw new Error('Stripe customer not found in database');
            }

            // Buscar plan en BD
            const plan = await this.em.findOne(Plan, {
                stripePriceId: stripeSubscription.items.data[0].price.id
            });

            if (!plan) {
                throw new Error('Plan not found in database');
            }

            let subscription: Subscription = await this.em.findOne(Subscription, {
                stripeSubscriptionId
            });

            if (!subscription) {
                // Crear nueva suscripción
                subscription = this.em.create<Subscription>(Subscription, {
                    stripeSubscriptionId,
                    user: stripeCustomer.user,
                    stripeCustomer,
                    plan,
                    status: stripeSubscription.status as SubscriptionStatus,
                    currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
                    currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
                    trialStart: stripeSubscription.trial_start ?
                        new Date(stripeSubscription.trial_start * 1000) : undefined,
                    trialEnd: stripeSubscription.trial_end ?
                        new Date(stripeSubscription.trial_end * 1000) : undefined,
                    canceledAt: stripeSubscription.canceled_at ?
                        new Date(stripeSubscription.canceled_at * 1000) : undefined,
                    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
                    endedAt: stripeSubscription.ended_at ?
                        new Date(stripeSubscription.ended_at * 1000) : undefined,
                    quantity: stripeSubscription.items.data[0]?.quantity || 1,
                    metadata: stripeSubscription.metadata
                });
            } else {
                // Actualizar existente
                subscription.status = stripeSubscription.status as SubscriptionStatus;
                subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
                subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
                subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
                subscription.canceledAt = stripeSubscription.canceled_at ?
                    new Date(stripeSubscription.canceled_at * 1000) : undefined;
                subscription.endedAt = stripeSubscription.ended_at ?
                    new Date(stripeSubscription.ended_at * 1000) : undefined;
                subscription.quantity = stripeSubscription.items.data[0]?.quantity || subscription.quantity;
                subscription.metadata = stripeSubscription.metadata;
            }

            this.em.persist(subscription);
            await this.em.flush();

            return subscription;
        } catch (error) {
            this.handleStripeError(error);
        }
    }
}