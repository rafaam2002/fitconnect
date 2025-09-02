import {EntityManager, QueryOrder} from '@mikro-orm/core';
import {StripeCustomer} from '../entities/StripeCustomer';
import {PaymentMethod, PaymentMethodStatus, PaymentMethodType} from '../entities/PaymentMethod';
import {BaseService} from './BaseService.js';

interface AttachPaymentMethodInput {
    paymentMethodId: string; // pm_xxxxx from Stripe
    stripeCustomerId: string;
    setAsDefault?: boolean;
}

interface CreatePaymentMethodInput {
    stripeCustomerId: string;
    type: PaymentMethodType;
    card?: {
        number: string;
        exp_month: number;
        exp_year: number;
        cvc: string;
    };
    setAsDefault?: boolean;
}

export class PaymentMethodService extends BaseService {
    constructor(em: EntityManager) {
        super(em);
    }

    async attachPaymentMethod(input: AttachPaymentMethodInput): Promise<PaymentMethod> {
        const stripeCustomer = await this.em.findOne(StripeCustomer, {
            stripeCustomerId: input.stripeCustomerId,
            isActive: true
        });

        if (!stripeCustomer) {
            throw new Error('Stripe customer not found');
        }

        try {
            // Obtener detalles del payment method de Stripe
            const stripePaymentMethod = await this.stripe.paymentMethods.retrieve(input.paymentMethodId);

            // Verificar que no esté ya adjuntado a este customer
            const existingPaymentMethod = await this.em.findOne(PaymentMethod, {
                stripePaymentMethodId: input.paymentMethodId,
                stripeCustomer
            });

            if (existingPaymentMethod) {
                throw new Error('Payment method already attached to this customer');
            }

            // Verificar duplicados por fingerprint
            if (stripePaymentMethod.card?.fingerprint) {
                const duplicatePaymentMethod = await this.em.findOne(PaymentMethod, {
                    fingerprint: stripePaymentMethod.card.fingerprint,
                    stripeCustomer,
                    status: PaymentMethodStatus.ACTIVE
                });

                if (duplicatePaymentMethod) {
                    throw new Error('A payment method with the same card already exists');
                }
            }

            // Adjuntar a customer en Stripe
            await this.stripe.paymentMethods.attach(input.paymentMethodId, {
                customer: input.stripeCustomerId
            });

            // Si se debe establecer como default, actualizar en Stripe
            if (input.setAsDefault) {
                await this.stripe.customers.update(input.stripeCustomerId, {
                    invoice_settings: {
                        default_payment_method: input.paymentMethodId
                    }
                });

                // Desmarcar otros como default
                await this.em.nativeUpdate(PaymentMethod, {
                    stripeCustomer,
                    isDefault: true
                }, {
                    isDefault: false
                });
            }

            // Crear en base de datos
            const paymentMethodData = this.extractPaymentMethodData(stripePaymentMethod);
            const paymentMethod: PaymentMethod & any = this.em.create(PaymentMethod, {
                ...paymentMethodData,
                stripeCustomer,
                isDefault: input.setAsDefault || false
            });

            this.em.persist(paymentMethod);
            await this.em.flush();

            return paymentMethod;
        }  catch (error) {
            this.handleStripeError(error);
        }
    }

    async createPaymentMethod(input: CreatePaymentMethodInput): Promise<PaymentMethod> {
        const stripeCustomer = await this.em.findOne(StripeCustomer, {
            stripeCustomerId: input.stripeCustomerId,
            isActive: true
        });

        if (!stripeCustomer) {
            throw new Error('Stripe customer not found');
        }

        try {
            // Crear payment method en Stripe
            const stripePaymentMethod = await this.stripe.paymentMethods.create({
                type: input.type,
                card: input.card
            });

            // Adjuntar al customer
            return await this.attachPaymentMethod({
                paymentMethodId: stripePaymentMethod.id,
                stripeCustomerId: input.stripeCustomerId,
                setAsDefault: input.setAsDefault
            });
        } catch (error) {
            this.handleStripeError(error);
        }
    }

    async removePaymentMethod(paymentMethodId: string): Promise<void> {
        const paymentMethod = await this.em.findOne(PaymentMethod, {
            stripePaymentMethodId: paymentMethodId,
            status: PaymentMethodStatus.ACTIVE
        });

        if (!paymentMethod) {
            throw new Error('Payment method not found');
        }

        try {
            // Desadjuntar de Stripe
            await this.stripe.paymentMethods.detach(paymentMethodId);

            // Marcar como inactivo en BD
            paymentMethod.status = PaymentMethodStatus.INACTIVE;
            await this.em.flush();
        } catch (error) {
            this.handleStripeError(error);
        }
    }

    async setDefaultPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
        const paymentMethod = await this.em.findOne(PaymentMethod, {
            stripePaymentMethodId: paymentMethodId,
            status: PaymentMethodStatus.ACTIVE
        }, {
            populate: 'stripeCustomer' as any
        });

        if (!paymentMethod) {
            throw new Error('Payment method not found');
        }

        try {
            // Actualizar en Stripe
            await this.stripe.customers.update(paymentMethod.stripeCustomer.stripeCustomerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId
                }
            });

            // Desmarcar otros como default en BD
            await this.em.nativeUpdate(PaymentMethod, {
                stripeCustomer: paymentMethod.stripeCustomer,
                isDefault: true
            }, {
                isDefault: false
            });

            // Marcar este como default
            paymentMethod.isDefault = true;
            await this.em.flush();

            return paymentMethod;
        } catch (error) {
            this.handleStripeError(error);
        }
    }

    async listPaymentMethods(stripeCustomerId: string): Promise<PaymentMethod[]> {
        const stripeCustomer = await this.em.findOne(StripeCustomer, {
            stripeCustomerId,
            isActive: true
        });

        if (!stripeCustomer) {
            throw new Error('Stripe customer not found');
        }

        return await this.em.find(PaymentMethod, {
            stripeCustomer,
            status: PaymentMethodStatus.ACTIVE
        }, {
            orderBy: { isDefault: QueryOrder.DESC, createdAt: QueryOrder.ASC }
        });
    }

    async syncPaymentMethodFromStripe(paymentMethodId: string): Promise<PaymentMethod | null> {
        try {
            const stripePaymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);

            if (!stripePaymentMethod.customer) {
                // No está adjuntado a ningún customer
                return null;
            }

            const stripeCustomer = await this.em.findOne(StripeCustomer, {
                stripeCustomerId: stripePaymentMethod.customer as string
            });

            if (!stripeCustomer) {
                throw new Error('Stripe customer not found in database');
            }

            let paymentMethod: PaymentMethod | any = await this.em.findOne(PaymentMethod, {
                stripePaymentMethodId: paymentMethodId
            });

            const paymentMethodData = this.extractPaymentMethodData(stripePaymentMethod);

            if (!paymentMethod) {
                // Crear nuevo
                paymentMethod = this.em.create(PaymentMethod, {
                    ...paymentMethodData,
                    stripeCustomer
                });
            } else {
                // Actualizar existente
                Object.assign(paymentMethod, paymentMethodData);
            }

            this.em.persist(paymentMethod);
            await this.em.flush();

            return paymentMethod;
        } catch (error) {
            this.handleStripeError(error);
        }
    }

    private extractPaymentMethodData(stripePaymentMethod: any): Partial<PaymentMethod> {
        return {
            stripePaymentMethodId: stripePaymentMethod.id,
            type: stripePaymentMethod.type as PaymentMethodType,
            status: PaymentMethodStatus.ACTIVE,
            brand: stripePaymentMethod.card?.brand,
            last4: stripePaymentMethod.card?.last4,
            expiryMonth: stripePaymentMethod.card?.exp_month,
            expiryYear: stripePaymentMethod.card?.exp_year,
            fingerprint: stripePaymentMethod.card?.fingerprint,
            country: stripePaymentMethod.card?.country
        };
    }
}