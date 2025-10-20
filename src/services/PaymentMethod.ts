import {EntityManager, QueryOrder} from '@mikro-orm/core';
import {StripeCustomer} from '../entities/StripeCustomer';
import {PaymentMethod, PaymentMethodStatus} from '../entities/PaymentMethod';
import {BaseService} from './BaseService.js';

interface AttachPaymentMethodInput {
    paymentMethodId: string; // pm_xxxxx from Stripe
    stripeCustomerId: string;
    setAsDefault?: boolean;
}

interface CreateSetupIntentInput {
    stripeCustomerId: string;
    usage?: 'on_session' | 'off_session';
    metadata?: Record<string, any>;
}

interface ConfirmSetupIntentInput {
    setupIntentId: string;
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
        } catch (error) {
            this.handleStripeError(error);
        }
    }

    async createSetupIntent(input: CreateSetupIntentInput): Promise<{
        clientSecret: string;
        setupIntentId: string;
    }> {
        const stripeCustomer = await this.em.findOne(StripeCustomer, {
            stripeCustomerId: input.stripeCustomerId,
            isActive: true
        });

        if (!stripeCustomer) {
            throw new Error('Stripe customer not found');
        }

        try {
            // Crear Setup Intent en Stripe
            const setupIntent = await this.stripe.setupIntents.create({
                customer: input.stripeCustomerId,
                usage: input.usage, // Para pagos futuros
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never' // Solo métodos que no requieren redirect
                },
                metadata: {
                    userId: stripeCustomer.user.id,
                    ...input.metadata
                }
            }, {
                idempotencyKey: this.generateIdempotencyKey('setup_intent', input.stripeCustomerId)
            });

            return {
                clientSecret: setupIntent.client_secret!,
                setupIntentId: setupIntent.id
            };
        } catch (error) {
            this.handleStripeError(error);
        }
    }

    // ✅ NUEVO: Confirmar Setup Intent (seguro)
    async confirmSetupIntent(input: ConfirmSetupIntentInput): Promise<PaymentMethod> {
        try {
            // 1. Obtener el Setup Intent de Stripe
            const setupIntent = await this.stripe.setupIntents.retrieve(input.setupIntentId);

            if (setupIntent.status !== 'succeeded') {
                throw new Error(`Setup Intent not successful. Status: ${setupIntent.status}`);
            }

            if (!setupIntent.payment_method) {
                throw new Error('No payment method found in Setup Intent');
            }

            const newPaymentMethodId = setupIntent.payment_method as string;

            // 2. Obtener detalles del payment method recién creado por Stripe
            const stripePaymentMethod = await this.stripe.paymentMethods.retrieve(newPaymentMethodId);

            if (!stripePaymentMethod.customer) {
                throw new Error('Payment method is not attached to a customer');
            }

            // 3. Buscar customer en nuestra BD
            const stripeCustomer = await this.em.findOne(StripeCustomer, {
                stripeCustomerId: stripePaymentMethod.customer as string,
                isActive: true
            });

            if (!stripeCustomer) {
                throw new Error('Customer not found in database');
            }

            // 🔍 4. VERIFICAR SI YA EXISTE ESTE MÉTODO DE PAGO
            if (stripePaymentMethod.card?.fingerprint) {
                const existingPaymentMethod = await this.em.findOne(PaymentMethod, {
                    stripeCustomer,
                    fingerprint: stripePaymentMethod.card.fingerprint,
                    status: PaymentMethodStatus.ACTIVE
                });

                if (existingPaymentMethod) {
                    console.log('🔍 Duplicate payment method detected:', {
                        existing: existingPaymentMethod.displayName,
                        new: `${stripePaymentMethod.card.brand?.toUpperCase()} •••• ${stripePaymentMethod.card.last4}`
                    });

                    // 🗑️ ELIMINAR EL PAYMENT METHOD DUPLICADO DE STRIPE
                    try {
                        await this.stripe.paymentMethods.detach(newPaymentMethodId);
                        console.log('✅ Duplicate payment method removed from Stripe:', newPaymentMethodId);
                    } catch (detachError) {
                        console.error('⚠️ Failed to remove duplicate from Stripe:', detachError);
                        // Continuamos con el flujo aunque no se pueda eliminar
                    }

                    // ✅ ESTABLECER COMO DEFAULT SI SE SOLICITA
                    if (input.setAsDefault && !existingPaymentMethod.isDefault) {
                        await this.setDefaultPaymentMethodInternal(
                            existingPaymentMethod.stripePaymentMethodId,
                            stripeCustomer
                        );
                        existingPaymentMethod.isDefault = true;
                        await this.em.flush();
                    }

                    console.log('✅ Returning existing payment method instead of duplicate');
                    return existingPaymentMethod;
                }
            }

            // 5. Si no hay duplicados, crear el nuevo payment method en BD
            const paymentMethodData = this.extractPaymentMethodData(stripePaymentMethod);
            const paymentMethod = this.em.create(PaymentMethod, {
                ...paymentMethodData,
                stripeCustomer,
                isDefault: false
            });

            // Establecer como default si se solicita
            if (input.setAsDefault) {
                await this.setDefaultPaymentMethodInternal(newPaymentMethodId, stripeCustomer);
                paymentMethod.isDefault = true;
            }

            this.em.persist(paymentMethod);
            await this.em.flush();

            console.log('✅ New unique payment method added:', paymentMethod.displayName);
            return Promise.resolve(paymentMethod) as Promise<PaymentMethod>

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
            orderBy: {isDefault: QueryOrder.DESC, created_at: QueryOrder.ASC}
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
                stripeCustomer,
                fingerprint: stripePaymentMethod.card.fingerprint,
                status: PaymentMethodStatus.ACTIVE
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

    async validatePaymentMethod(paymentMethodId: string): Promise<{
        isValid: boolean;
        errors: string[];
        paymentMethod?: PaymentMethod;
    }> {
        const paymentMethod = await this.em.findOne(PaymentMethod, {
            stripePaymentMethodId: paymentMethodId
        });

        if (!paymentMethod) {
            return {
                isValid: false,
                errors: ['Payment method not found']
            };
        }

        const errors: string[] = [];

        // Verificar si está expirado
        if (paymentMethod.isExpired) {
            errors.push('Payment method is expired');
        }

        // Verificar si está activo
        if (paymentMethod.status !== PaymentMethodStatus.ACTIVE) {
            errors.push('Payment method is not active');
        }

        // Verificar en Stripe también
        try {
            const stripePaymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);

            if (!stripePaymentMethod.customer) {
                errors.push('Payment method is not attached to a customer in Stripe');
            }
        } catch (stripeError) {
            errors.push('Payment method not found in Stripe');
        }

        return {
            isValid: errors.length === 0,
            errors,
            paymentMethod
        };
    }

    // ✅ NUEVO: Obtener métodos de pago expirados
    async getExpiredPaymentMethods(stripeCustomerId: string): Promise<PaymentMethod[]> {
        const stripeCustomer = await this.em.findOne(StripeCustomer, {
            stripeCustomerId,
            isActive: true
        });

        if (!stripeCustomer) {
            throw new Error('Stripe customer not found');
        }

        return await this.em.find(PaymentMethod, {
            stripeCustomer: stripeCustomer.id,
            status: PaymentMethodStatus.EXPIRED
        });
    }

    // ✅ NUEVO: Limpiar métodos de pago expirados
    async cleanupExpiredPaymentMethods(stripeCustomerId: string): Promise<{
        cleaned: number;
        paymentMethods: PaymentMethod[];
    }> {
        const expiredPaymentMethods = await this.getExpiredPaymentMethods(stripeCustomerId);

        for (const paymentMethod of expiredPaymentMethods) {
            try {
                // Marcar como expirado (no eliminamos de Stripe)
                paymentMethod.status = PaymentMethodStatus.EXPIRED;
                paymentMethod.isDefault = false; // Si era default, ya no puede serlo
            } catch (error) {
                console.error(`Failed to cleanup expired payment method ${paymentMethod.stripePaymentMethodId}:`, error);
            }
        }

        await this.em.flush();

        return {
            cleaned: expiredPaymentMethods.length,
            paymentMethods: expiredPaymentMethods
        };
    }

    async getPaymentMethodsStats(stripeCustomerId: string): Promise<{
        total: number;
        active: number;
        expired: number;
        byBrand: Record<string, number>;
        hasDefault: boolean;
    }> {
        const stripeCustomer = await this.em.findOne(StripeCustomer, {
            stripeCustomerId,
            isActive: true
        });

        if (!stripeCustomer) {
            throw new Error('Stripe customer not found');
        }

        const paymentMethods = await this.em.find(PaymentMethod, {
            stripeCustomer
        });

        const active = paymentMethods.filter(pm => pm.status === PaymentMethodStatus.ACTIVE);
        const expired = paymentMethods.filter(pm => pm.status === PaymentMethodStatus.EXPIRED);
        const hasDefault = paymentMethods.some(pm => pm.isDefault);

        const byBrand: Record<string, number> = {};
        active.forEach(pm => {
            if (pm.brand) {
                byBrand[pm.brand] = (byBrand[pm.brand] || 0) + 1;
            }
        });

        return {
            total: paymentMethods.length,
            active: active.length,
            expired: expired.length,
            byBrand,
            hasDefault
        };
    }


    private async setDefaultPaymentMethodInternal(paymentMethodId: string, stripeCustomer: StripeCustomer): Promise<void> {
        // Actualizar en Stripe
        await this.stripe.customers.update(stripeCustomer.stripeCustomerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId
            }
        });

        // Desmarcar otros como default en BD
        await this.em.nativeUpdate(PaymentMethod, {
            stripeCustomer,
            isDefault: true
        }, {
            isDefault: false
        });
    }

    private extractPaymentMethodData(stripePaymentMethod: any): Partial<PaymentMethod> {
        return {
            stripePaymentMethodId: stripePaymentMethod.id,
            type: stripePaymentMethod.type as any,
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