import {EntityManager, QueryOrder} from '@mikro-orm/core';
import {BaseService} from './base.service';
import {Transaction, TransactionStatus, TransactionType} from "../entities/Transaction";
import {User} from "../entities/User";
import {PaymentMethod, PaymentMethodStatus} from "../entities/PaymentMethod";
import {StripeCustomer} from "../entities/StripeCustomer";

interface CreateChargeInput {
    userId: string;
    amount: number;
    currency?: string;
    paymentMethodId?: string;
    description?: string;
    metadata?: Record<string, any>;
}

interface RefundTransactionInput {
    transactionId: string;
    amount?: number;
    reason?: string;
    metadata?: Record<string, any>;
}

export class TransactionService extends BaseService {
    constructor(em: EntityManager) {
        super(em);
    }

    async createCharge(input: CreateChargeInput): Promise<Transaction> {
        const user = await this.em.findOne(User, { id: input.userId });
        if (!user) {
            throw new Error('User not found');
        }

        let paymentMethod: PaymentMethod | null = null;
        if (input.paymentMethodId) {
            paymentMethod = await this.em.findOne(PaymentMethod, {
                stripePaymentMethodId: input.paymentMethodId,
                status: PaymentMethodStatus.ACTIVE
            },{
                populate: ['stripeCustomer'] as any
            });

            if (!paymentMethod) {
                throw new Error('Payment method not found or inactive');
            }
        }

        try {
            // Crear PaymentIntent en Stripe
            const paymentIntent: any = await this.stripe.paymentIntents.create({
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never'
                },
                amount: input.amount,
                currency: input.currency || 'eur',
                payment_method: input.paymentMethodId,
                customer: paymentMethod?.stripeCustomer.stripeCustomerId,
                description: input.description,
                confirm: !!input.paymentMethodId,
                metadata: {
                    userId: user.id,
                    ...input.metadata
                }
            }, {
                idempotencyKey: this.generateIdempotencyKey('charge', user.id, input.amount.toString())
            });

            // Crear transacción en BD
            const transaction = this.em.create<Transaction>(Transaction, {
                stripePaymentIntentId: paymentIntent.id,
                stripeChargeId: paymentIntent.latest_charge,
                user,
                paymentMethod,
                type: TransactionType.CHARGE,
                status: this.mapStripeStatusToTransactionStatus(paymentIntent.status),
                amount: input.amount,
                currency: input.currency || 'usd',
                description: input.description,
                metadata: paymentIntent.metadata,
                company: user.activeCompanyId!,
                amountRefunded: 0,
            });

            this.em.persist(transaction);
            await this.em.flush();

            return transaction;
        } catch (error) {
            this.handleStripeError(error);
        }
    }

    async refundTransaction(input: RefundTransactionInput): Promise<Transaction> {
        const originalTransaction = await this.em.findOne(Transaction, {
            id: input.transactionId,
            status: TransactionStatus.SUCCEEDED
        }, {
            populate: ['user', 'paymentMethod']
        });

        if (!originalTransaction) {
            throw new Error('Original transaction not found or not eligible for refund');
        }

        if (!originalTransaction.stripeChargeId) {
            throw new Error('No Stripe charge ID found for this transaction');
        }

        const refundAmount = input.amount || originalTransaction.amount;

        if (refundAmount > originalTransaction.amount) {
            throw new Error('Refund amount cannot exceed the net amount of the original transaction');
        }

        try {
            // Crear reembolso en Stripe
            const stripeRefund = await this.stripe.refunds.create({
                charge: originalTransaction.stripeChargeId,
                amount: refundAmount,
                reason: input.reason as any,
                metadata: {
                    originalTransactionId: originalTransaction.id,
                    ...input.metadata
                }
            }, {
                idempotencyKey: this.generateIdempotencyKey('refund', originalTransaction.id, refundAmount.toString())
            });

            // Crear transacción de reembolso
            const refundTransaction = this.em.create<Transaction>(Transaction, {
                stripeChargeId: stripeRefund.charge as string,
                user: originalTransaction.user,
                paymentMethod: originalTransaction.paymentMethod,
                type: TransactionType.REFUND,
                status: TransactionStatus.SUCCEEDED,
                amount: refundAmount,
                currency: originalTransaction.currency,
                description: `Refund for transaction ${originalTransaction.id}`,
                metadata: stripeRefund.metadata,
                company: originalTransaction.user.activeCompanyId!,
                amountRefunded: originalTransaction.amountRefunded,
            });

            // Actualizar transacción original
            originalTransaction.amountRefunded += refundAmount;

            if (originalTransaction.amountRefunded >= originalTransaction.amount) {
                originalTransaction.status = TransactionStatus.REFUNDED;
            } else {
                originalTransaction.status = TransactionStatus.PARTIALLY_REFUNDED;
            }

            this.em.persist(refundTransaction);
            await this.em.flush();

            return refundTransaction;
        } catch (error) {
            this.handleStripeError(error);
        }
    }

    async getTransaction(transactionId: string): Promise<Transaction | null> {
        return await this.em.findOne(Transaction, { id: transactionId }, {
            populate: ['user', 'paymentMethod', 'subscription']
        });
    }

    async listUserTransactions(userId: string, limit: number = 50): Promise<Transaction[]> {
        const user = await this.em.findOne(User, { id: userId });
        if (!user) {
            throw new Error('User not found');
        }

        return await this.em.find(Transaction, { user }, {
            populate: ['paymentMethod', 'subscription'],
            orderBy: { created_at: QueryOrder.ASC },
            limit
        } as any);
    }

    async syncTransactionFromStripe(stripeChargeId: string): Promise<Transaction | null> {
        try {
            const stripeCharge = await this.stripe.charges.retrieve(stripeChargeId);

            // Buscar si ya existe
            let transaction = await this.em.findOne(Transaction, {
                stripeChargeId
            });

            // Buscar usuario por customer ID
            const stripeCustomer = await this.em.findOne<StripeCustomer>(StripeCustomer, {
                stripeCustomerId: stripeCharge.customer as string
            }, {
                populate: ['user'] as any
            });

            if (!stripeCustomer) {
                console.warn(`Stripe customer not found for charge: ${stripeChargeId}`);
                return null;
            }

            // Buscar método de pago
            let paymentMethod: PaymentMethod | null = null;
            if (stripeCharge.payment_method) {
                paymentMethod = await this.em.findOne(PaymentMethod, {
                    stripePaymentMethodId: stripeCharge.payment_method as string
                });
            }

            if (!transaction) {
                // Crear nueva transacción
                transaction = this.em.create<Transaction>(Transaction, {
                    stripeChargeId,
                    stripePaymentIntentId: stripeCharge.payment_intent as string,
                    user: stripeCustomer.user,
                    paymentMethod,
                    type: TransactionType.CHARGE,
                    status: this.mapStripeStatusToTransactionStatus(stripeCharge.status),
                    amount: stripeCharge.amount,
                    amountRefunded: stripeCharge.amount_refunded,
                    currency: stripeCharge.currency,
                    description: stripeCharge.description,
                    failureReason: stripeCharge.failure_message,
                    metadata: stripeCharge.metadata,
                    company: stripeCustomer.user.activeCompanyId!
                });
            } else {
                // Actualizar existente
                transaction.status = this.mapStripeStatusToTransactionStatus(stripeCharge.status);
                transaction.amountRefunded = stripeCharge.amount_refunded;
                transaction.failureReason = stripeCharge.failure_message ?? 'Fallo en la transaccion';
                transaction.metadata = stripeCharge.metadata;
            }

            this.em.persist(transaction);
            await this.em.flush();

            return transaction;
        } catch (error) {
            this.handleStripeError(error);
        }
    }

    private mapStripeStatusToTransactionStatus(stripeStatus: string): TransactionStatus {
        switch (stripeStatus) {
            case 'succeeded':
                return TransactionStatus.SUCCEEDED;
            case 'pending':
                return TransactionStatus.PENDING;
            case 'failed':
                return TransactionStatus.FAILED;
            case 'canceled':
                return TransactionStatus.CANCELED;
            default:
                return TransactionStatus.PENDING;
        }
    }
}