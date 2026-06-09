import { EntityManager, QueryOrder } from '@mikro-orm/core';

import { Customer } from '../entities/Customer';
import { PaymentMethod, PaymentMethodStatus } from '../entities/PaymentMethod';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../entities/Transaction';
import { User } from '../entities/User';
import { ServiceResponse } from '../types/common.type';
import {
  BadRequestError,
  createServiceResponse,
  InternalServerError,
  NotFoundError,
} from '../utils/errors.util';

import { BaseService } from './base.service';

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

  /**
   * Crear cargo (charge) en Stripe
   */
  public async createCharge(
    input: CreateChargeInput
  ): Promise<ServiceResponse> {
    const user = await this.em.findOne(User, { id: input.userId });
    if (!user) {
      throw new NotFoundError('User');
    }

    // Validar amount
    if (!input.amount || input.amount <= 0) {
      throw new BadRequestError('Amount must be greater than 0');
    }

    let paymentMethod: PaymentMethod | null = null;
    if (input.paymentMethodId) {
      paymentMethod = await this.em.findOne(
        PaymentMethod,
        {
          stripePaymentMethodId: input.paymentMethodId,
          status: PaymentMethodStatus.ACTIVE,
        },
        {
          populate: ['customer'],
        }
      );

      if (!paymentMethod) {
        throw new NotFoundError('Payment method not found or inactive');
      }
    }

    try {
      // Crear PaymentIntent en Stripe
      const paymentIntent: any = await this.stripe.paymentIntents.create(
        {
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never',
          },
          amount: input.amount,
          currency: input.currency || 'eur',
          payment_method: input.paymentMethodId,
          customer: paymentMethod?.customer.customerId,
          description: input.description,
          confirm: !!input.paymentMethodId,
          metadata: {
            userId: user.id,
            ...input.metadata,
          },
        },
        {
          idempotencyKey: this.generateIdempotencyKey(
            'charge',
            user.id,
            input.amount.toString()
          ),
        }
      );

      // Crear transacción en BD
      const transaction = this.em.create<Transaction>(Transaction, {
        stripePaymentIntentId: paymentIntent.id,
        stripeChargeId: paymentIntent.latest_charge,
        user,
        paymentMethod,
        type: TransactionType.CHARGE,
        status: this.mapStripeStatusToTransactionStatus(paymentIntent.status),
        amount: input.amount,
        currency: input.currency || 'eur',
        description: input.description,
        metadata: paymentIntent.metadata,
        company: user.activeCompanyId!,
        amountRefunded: 0,
      });

      this.em.persist(transaction);
      await this.em.flush();

      return createServiceResponse(200, 'Charge created successfully', true, {
        transaction,
      });
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      this.handleStripeError(error);
    }
  }

  /**
   * Reembolsar transacción
   */
  public async refundTransaction(
    input: RefundTransactionInput
  ): Promise<ServiceResponse> {
    const originalTransaction = await this.em.findOne(
      Transaction,
      {
        id: input.transactionId,
        status: TransactionStatus.SUCCEEDED,
      },
      {
        populate: ['user', 'paymentMethod'],
      }
    );

    if (!originalTransaction) {
      throw new NotFoundError(
        'Original transaction not found or not eligible for refund'
      );
    }

    if (!originalTransaction.stripeChargeId) {
      throw new BadRequestError(
        'No Stripe charge ID found for this transaction'
      );
    }

    const refundAmount = input.amount || originalTransaction.amount;

    if (refundAmount > originalTransaction.amount) {
      throw new BadRequestError(
        'Refund amount cannot exceed the net amount of the original transaction'
      );
    }

    if (refundAmount <= 0) {
      throw new BadRequestError('Refund amount must be greater than 0');
    }

    try {
      // Crear reembolso en Stripe
      const stripeRefund = await this.stripe.refunds.create(
        {
          charge: originalTransaction.stripeChargeId,
          amount: refundAmount,
          reason: input.reason as any,
          metadata: {
            originalTransactionId: originalTransaction.id,
            ...input.metadata,
          },
        },
        {
          idempotencyKey: this.generateIdempotencyKey(
            'refund',
            originalTransaction.id,
            refundAmount.toString()
          ),
        }
      );

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
        amountRefunded: 0,
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

      return createServiceResponse(
        200,
        'Transaction refunded successfully',
        true,
        {
          transaction: refundTransaction,
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
   * Obtener transacción por ID
   */
  public async getTransaction(transactionId: string): Promise<ServiceResponse> {
    const transaction = await this.em.findOne(
      Transaction,
      { id: transactionId },
      {
        populate: ['user', 'paymentMethod', 'subscription'],
      }
    );

    if (!transaction) {
      throw new NotFoundError('Transaction');
    }

    return createServiceResponse(
      200,
      'Transaction fetched successfully',
      true,
      {
        transaction,
      }
    );
  }

  /**
   * Listar transacciones de usuario
   */
  public async listUserTransactions(
    userId: string,
    limit: number = 50
  ): Promise<ServiceResponse> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new NotFoundError('User');
    }

    if (limit <= 0 || limit > 100) {
      throw new BadRequestError('Limit must be between 1 and 100');
    }

    try {
      const transactions = await this.em.find(Transaction, { user }, {
        populate: ['paymentMethod', 'subscription'],
        orderBy: { created_at: QueryOrder.DESC },
        limit,
      } as any);

      return createServiceResponse(
        200,
        'Transactions listed successfully',
        true,
        {
          transactions,
        }
      );
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      throw new InternalServerError('Error listing transactions');
    }
  }

  /**
   * Obtener transacciones por estado
   */
  public async getTransactionsByStatus(
    userId: string,
    status: TransactionStatus,
    limit: number = 50
  ): Promise<ServiceResponse> {
    if (limit <= 0 || limit > 100) {
      throw new BadRequestError('Limit must be between 1 and 100');
    }

    try {
      const transactions = await this.em.find(
        Transaction,
        {
          user: userId,
          status,
        },
        {
          populate: ['paymentMethod', 'subscription'],
          orderBy: { created_at: QueryOrder.DESC },
          limit,
        }
      );

      return createServiceResponse(
        200,
        'Transactions listed successfully',
        true,
        {
          transactions,
        }
      );
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      throw new InternalServerError('Error fetching transactions by status');
    }
  }

  /**
   * Obtener transacciones exitosas
   */
  public async getSuccessfulTransactions(
    userId: string,
    limit: number = 50
  ): Promise<ServiceResponse> {
    return await this.getTransactionsByStatus(
      userId,
      TransactionStatus.SUCCEEDED,
      limit
    );
  }

  /**
   * Obtener transacciones fallidas
   */
  public async getFailedTransactions(
    userId: string,
    limit: number = 50
  ): Promise<ServiceResponse> {
    return await this.getTransactionsByStatus(
      userId,
      TransactionStatus.FAILED,
      limit
    );
  }

  /**
   * Obtener resumen de transacciones de usuario
   */
  public async getUserTransactionsSummary(
    userId: string
  ): Promise<ServiceResponse> {
    try {
      const allTransactions = await this.em.find(Transaction, {
        user: userId,
      });

      const summary = {
        totalTransactions: allTransactions.length,
        successfulTransactions: allTransactions.filter(
          (t: Transaction) => t.status === TransactionStatus.SUCCEEDED
        ).length,
        failedTransactions: allTransactions.filter(
          (t: Transaction) => t.status === TransactionStatus.FAILED
        ).length,
        totalAmount: allTransactions
          .filter((t: Transaction) => t.status === TransactionStatus.SUCCEEDED)
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0),
        totalRefunded: allTransactions.reduce(
          (sum: number, t: Transaction) => sum + t.amountRefunded,
          0
        ),
        lastTransaction:
          [...allTransactions].sort(
            (a: Transaction, b: Transaction) =>
              b.created_at.getTime() - a.created_at.getTime()
          )[0] || null,
      };

      return createServiceResponse(200, 'Summary loaded successfully', true, {
        summary,
      });
    } catch (error: any) {
      throw new InternalServerError(
        `Error fetching user transactions summary ${error.message}`
      );
    }
  }

  /**
   * Reintentar transacción fallida
   */
  public async retryFailedTransaction(
    transactionId: string
  ): Promise<ServiceResponse> {
    const originalTransaction = await this.em.findOne(
      Transaction,
      { id: transactionId },
      { populate: ['user', 'paymentMethod'] }
    );

    if (!originalTransaction) {
      throw new NotFoundError('Transaction');
    }

    if (originalTransaction.status !== TransactionStatus.FAILED) {
      throw new BadRequestError('Transaction is not in failed state');
    }

    try {
      const newTransaction = await this.createCharge({
        userId: originalTransaction.user.id,
        amount: originalTransaction.amount,
        currency: originalTransaction.currency,
        paymentMethodId:
          originalTransaction.paymentMethod?.stripePaymentMethodId,
        description: `Retry of failed transaction ${originalTransaction.id}`,
        metadata: {
          ...originalTransaction.metadata,
          retryOf: originalTransaction.id,
          retryAttempt: (originalTransaction.metadata?.retryAttempt || 0) + 1,
        },
      });

      return createServiceResponse(
        200,
        'Transaction retry initiated successfully',
        true,
        {
          transaction: newTransaction,
        }
      );
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      throw new InternalServerError('Error retrying failed transaction');
    }
  }

  /**
   * Marcar transacción como reconciliada
   */
  public async markTransactionAsReconciled(
    transactionId: string,
    reconciledBy?: string
  ): Promise<ServiceResponse> {
    const transaction = await this.em.findOne(Transaction, {
      id: transactionId,
    });

    if (!transaction) {
      throw new NotFoundError('Transaction');
    }

    try {
      // Actualizar metadata para marcar como reconciliado
      transaction.metadata = {
        ...transaction.metadata,
        reconciledAt: new Date().toISOString(),
        reconciledBy: reconciledBy || 'system',
      };

      await this.em.flush();

      return createServiceResponse(
        200,
        'Transaction reconciled successfully',
        true,
        {
          transaction,
        }
      );
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new InternalServerError('Error marking transaction as reconciled');
    }
  }

  /**
   * Sincronizar transacción desde Stripe
   */
  public async syncTransactionFromStripe(
    stripeChargeId: string
  ): Promise<ServiceResponse> {
    const stripeCharge = await this.stripe.charges.retrieve(stripeChargeId);

    // Buscar si ya existe
    let transaction = await this.em.findOne(Transaction, {
      stripeChargeId,
    });

    // Buscar usuario por customer ID
    const customer = await this.em.findOne<Customer>(
      Customer,
      {
        customerId: stripeCharge.customer as string,
      },
      {
        populate: ['user'] as any,
      }
    );

    if (!customer) {
      throw new NotFoundError('Stripe customer not found for this charge');
    }

    try {
      // Buscar método de pago
      let paymentMethod: PaymentMethod | null = null;
      if (stripeCharge.payment_method) {
        paymentMethod = await this.em.findOne(PaymentMethod, {
          stripePaymentMethodId: stripeCharge.payment_method,
        });
      }

      if (transaction) {
        // Actualizar existente
        transaction.status = this.mapStripeStatusToTransactionStatus(
          stripeCharge.status
        );
        transaction.amountRefunded = stripeCharge.amount_refunded;
        transaction.failureReason =
          stripeCharge.failure_message ?? 'Failed transaction';
        transaction.metadata = stripeCharge.metadata;
      } else {
        // Crear nueva transacción
        transaction = this.em.create<Transaction>(Transaction, {
          stripeChargeId,
          stripePaymentIntentId: stripeCharge.payment_intent as string,
          user: customer.user,
          paymentMethod,
          type: TransactionType.CHARGE,
          status: this.mapStripeStatusToTransactionStatus(stripeCharge.status),
          amount: stripeCharge.amount,
          amountRefunded: stripeCharge.amount_refunded,
          currency: stripeCharge.currency,
          description: stripeCharge.description,
          failureReason: stripeCharge.failure_message,
          metadata: stripeCharge.metadata,
          company: customer.user.activeCompanyId!,
        });
      }

      this.em.persist(transaction);
      await this.em.flush();

      return createServiceResponse(
        200,
        'Transaction synchronized successfully',
        true,
        {
          transaction,
        }
      );
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.handleStripeError(error);
    }
  }

  // ============= MÉTODOS PRIVADOS =============

  /**
   * Mapear estado de Stripe ha estado de transacción
   */
  private mapStripeStatusToTransactionStatus(
    stripeStatus: string
  ): TransactionStatus {
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
