import { EntityManager, QueryOrder } from '@mikro-orm/core';

import { Invoice } from '../entities/Invoice';
import { PaymentMethod, PaymentMethodStatus } from '../entities/PaymentMethod';
import { Subscription } from '../entities/Subscription';
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
import { PaymentProcessor } from './payment-processor.interface';
import { StripeConnectService } from './stripe.connect.service';

// Porcentaje de comisión que te quedas en cada cobro de cliente a empresa (5%)
const PLATFORM_FEE_PERCENT = 0.05;

export interface CreateChargeInput {
  userId: string;
  amount: number;
  currency?: string;
  paymentMethodId?: string;
  invoiceId?: string;
  subscriptionId?: string;
  description?: string;
  metadata?: Record<string, any>;
  companyId?: string;
}

export interface RefundTransactionInput {
  transactionId: string;
  amount?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * TransactionService
 *
 * Registra y gestiona todos los movimientos de dinero del sistema.
 * Delega la ejecución real del cobro/reembolso al PaymentProcessor inyectado,
 * manteniendo en BD el registro canónico de cada operación.
 *
 */
export class TransactionService extends BaseService {
  constructor(em: EntityManager, paymentProcessor: PaymentProcessor) {
    super(em, paymentProcessor);
  }

  // ─────────────────────────────────────────────
  // COBROS
  // ─────────────────────────────────────────────

  /**
   * Ejecuta un cargo usando el PaymentProcessor configurado y persiste
   * la transacción resultante en la BD.
   *
   * Si amount = 0 → registra en BD sin llamar al procesador.
   * Si companyId está presente → el cobro va a la cuenta Stripe del admin
   *   y tu comisión (PLATFORM_FEE_PERCENT) se retiene automáticamente.
   * Si no hay companyId → el cobro va a tu cuenta master (suscripción del admin).
   */
  public async createCharge(
    input: CreateChargeInput
  ): Promise<ServiceResponse> {
    if (input.amount < 0) {
      throw new BadRequestError('Amount cannot be negative');
    }

    const user = await this.resolveUser(input.userId);
    const paymentMethod = await this.resolvePaymentMethod(
      input.paymentMethodId
    );
    const invoice = await this.resolveInvoice(input.invoiceId);
    const subscription = await this.resolveSubscription(input.subscriptionId);

    // ── Plan gratuito: registrar en BD sin cobrar ──────────────────────────
    if (input.amount === 0) {
      const transaction = await this.createPendingTransaction(
        input,
        user,
        paymentMethod,
        invoice,
        subscription
      );
      transaction.status = TransactionStatus.SUCCEEDED;
      transaction.metadata = {
        ...transaction.metadata,
        free: true,
        note: 'Free plan — no charge required',
      };
      await this.em.flush();
      return createServiceResponse(200, 'Free transaction recorded', true, {
        transaction,
      });
    }

    // ── Plan de pago: cobrar via procesador ───────────────────────────────
    const transaction = await this.createPendingTransaction(
      input,
      user,
      paymentMethod,
      invoice,
      subscription
    );

    if (!paymentMethod?.externalToken) {
      return createServiceResponse(
        200,
        'Charge created in pending state',
        true,
        { transaction }
      );
    }

    await this.executeCharge(
      input,
      user,
      transaction,
      paymentMethod.externalToken
    );
    await this.em.flush();

    return this.buildChargeResponse(transaction);
  }

  // ─────────────────────────────────────────────
  // PRIVADOS — createCharge
  // ─────────────────────────────────────────────

  public async refundTransaction(
    input: RefundTransactionInput
  ): Promise<ServiceResponse> {
    const originalTransaction = await this.em.findOne(
      Transaction,
      {
        id: input.transactionId,
        status: TransactionStatus.SUCCEEDED,
      },
      { populate: ['user', 'paymentMethod'] }
    );

    if (!originalTransaction) {
      throw new NotFoundError(
        'Original transaction not found or not eligible for refund'
      );
    }

    const netAmount =
      originalTransaction.amount - originalTransaction.amountRefunded;
    const refundAmount = input.amount ?? netAmount;

    if (refundAmount <= 0) {
      throw new BadRequestError('Refund amount must be greater than 0');
    }
    if (refundAmount > netAmount) {
      throw new BadRequestError(
        'Refund amount cannot exceed the net refundable amount'
      );
    }

    // Crear transacción de reembolso en estado PENDING
    const refundTransaction = this.em.create<Transaction>(Transaction, {
      user: originalTransaction.user,
      paymentMethod: originalTransaction.paymentMethod,
      type: TransactionType.REFUND,
      status: TransactionStatus.PENDING,
      amount: refundAmount,
      currency: originalTransaction.currency,
      description: `Refund for transaction ${originalTransaction.id}`,
      metadata: {
        originalTransactionId: originalTransaction.id,
        reason: input.reason ?? '',
        ...input.metadata,
      },
      company: originalTransaction.company,
      amountRefunded: 0,
    });

    this.em.persist(refundTransaction);

    // Llamar al procesador si hay ID externo
    if (originalTransaction.externalTransactionId) {
      try {
        const result = await this.paymentProcessor!.refund({
          externalTransactionId: originalTransaction.externalTransactionId,
          amount: refundAmount,
          reason: input.reason,
          idempotencyKey: this.generateIdempotencyKey(
            'refund',
            originalTransaction.id,
            refundAmount.toString()
          ),
        });

        refundTransaction.status = result.success
          ? TransactionStatus.SUCCEEDED
          : TransactionStatus.FAILED;

        if (result.externalRefundId) {
          refundTransaction.externalTransactionId = result.externalRefundId;
        }
      } catch (error: any) {
        refundTransaction.status = TransactionStatus.FAILED;
        refundTransaction.failureReason = error?.message ?? 'Refund failed';
        await this.em.flush();
        throw new InternalServerError(
          `Refund failed: ${refundTransaction.failureReason}`
        );
      }
    } else {
      // Sin ID externo asumimos reembolso manual aprobado
      refundTransaction.status = TransactionStatus.SUCCEEDED;
    }

    // Actualizar importes reembolsados en la transacción original
    if (refundTransaction.status === TransactionStatus.SUCCEEDED) {
      originalTransaction.amountRefunded += refundAmount;

      originalTransaction.status =
        originalTransaction.amountRefunded >= originalTransaction.amount
          ? TransactionStatus.REFUNDED
          : TransactionStatus.PARTIALLY_REFUNDED;
    }

    await this.em.flush();

    return createServiceResponse(
      200,
      'Transaction refunded successfully',
      true,
      {
        transaction: refundTransaction,
      }
    );
  }

  public async getTransaction(transactionId: string): Promise<ServiceResponse> {
    const transaction = await this.em.findOne(
      Transaction,
      { id: transactionId },
      { populate: ['user', 'paymentMethod', 'subscription', 'invoice'] }
    );

    if (!transaction) throw new NotFoundError('Transaction');

    return createServiceResponse(
      200,
      'Transaction fetched successfully',
      true,
      {
        transaction,
      }
    );
  }

  public async listUserTransactions(
    userId: string,
    limit: number = 50
  ): Promise<ServiceResponse> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) throw new NotFoundError('User');

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
      console.log(error);
      throw new InternalServerError('Error listing transactions');
    }
  }

  public async getTransactionsByStatus(
    userId: string,
    status: TransactionStatus,
    limit: number = 50
  ): Promise<ServiceResponse> {
    if (limit <= 0 || limit > 100) {
      throw new BadRequestError('Limit must be between 1 and 100');
    }

    const transactions = await this.em.find(
      Transaction,
      { user: userId, status },
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
  }

  public async getSuccessfulTransactions(
    userId: string,
    limit: number = 50
  ): Promise<ServiceResponse> {
    return this.getTransactionsByStatus(
      userId,
      TransactionStatus.SUCCEEDED,
      limit
    );
  }

  public async getFailedTransactions(
    userId: string,
    limit: number = 50
  ): Promise<ServiceResponse> {
    return this.getTransactionsByStatus(
      userId,
      TransactionStatus.FAILED,
      limit
    );
  }

  public async getUserTransactionsSummary(
    userId: string
  ): Promise<ServiceResponse> {
    try {
      const allTransactions = await this.em.find(Transaction, { user: userId });

      const summary = {
        totalTransactions: allTransactions.length,
        successfulTransactions: allTransactions.filter(
          t => t.status === TransactionStatus.SUCCEEDED
        ).length,
        failedTransactions: allTransactions.filter(
          t => t.status === TransactionStatus.FAILED
        ).length,
        totalAmount: allTransactions
          .filter(t => t.status === TransactionStatus.SUCCEEDED)
          .reduce((sum, t) => sum + t.amount, 0),
        totalRefunded: allTransactions.reduce(
          (sum, t) => sum + t.amountRefunded,
          0
        ),
        lastTransaction:
          [...allTransactions].sort(
            (a, b) => b.created_at.getTime() - a.created_at.getTime()
          )[0] ?? null,
      };

      return createServiceResponse(200, 'Summary loaded successfully', true, {
        summary,
      });
    } catch (error: any) {
      throw new InternalServerError(
        `Error fetching user transactions summary: ${error.message}`
      );
    }
  }

  /**
   * Reintenta un cargo fallido.
   * Crea una nueva transacción en lugar de modificar la original.
   */
  public async retryFailedTransaction(
    transactionId: string
  ): Promise<ServiceResponse> {
    const original = await this.em.findOne(
      Transaction,
      { id: transactionId },
      { populate: ['user', 'paymentMethod'] }
    );

    if (!original) throw new NotFoundError('Transaction');

    if (original.status !== TransactionStatus.FAILED) {
      throw new BadRequestError('Transaction is not in failed state');
    }

    return this.createCharge({
      userId: original.user.id,
      amount: original.amount,
      currency: original.currency,
      paymentMethodId: original.paymentMethod?.id,
      description: `Retry of failed transaction ${original.id}`,
      metadata: {
        ...original.metadata,
        retryOf: original.id,
        retryAttempt: ((original.metadata?.retryAttempt as number) || 0) + 1,
      },
    });
  }

  // ─────────────────────────────────────────────
  // LECTURA
  // ─────────────────────────────────────────────

  /**
   * Marca una transacción como reconciliada manualmente.
   */
  public async markTransactionAsReconciled(
    transactionId: string,
    reconciledBy?: string
  ): Promise<ServiceResponse> {
    const transaction = await this.em.findOne(Transaction, {
      id: transactionId,
    });

    if (!transaction) throw new NotFoundError('Transaction');

    transaction.metadata = {
      ...transaction.metadata,
      reconciledAt: new Date().toISOString(),
      reconciledBy: reconciledBy ?? 'system',
    };

    await this.em.flush();

    return createServiceResponse(
      200,
      'Transaction reconciled successfully',
      true,
      { transaction }
    );
  }

  private async resolveUser(userId: string): Promise<User> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) throw new NotFoundError('User');
    return user;
  }

  private async resolvePaymentMethod(
    paymentMethodId?: string
  ): Promise<PaymentMethod | null> {
    if (!paymentMethodId) return null;

    const pm = await this.em.findOne(
      PaymentMethod,
      { id: paymentMethodId, status: PaymentMethodStatus.ACTIVE },
      { populate: ['customer'] }
    );

    if (!pm) throw new NotFoundError('Payment method not found or inactive');
    return pm;
  }

  private async resolveInvoice(invoiceId?: string): Promise<Invoice | null> {
    if (!invoiceId) return null;

    const invoice = await this.em.findOne(Invoice, { id: invoiceId });
    if (!invoice) throw new NotFoundError('Invoice');
    return invoice;
  }

  private async resolveSubscription(
    subscriptionId?: string
  ): Promise<Subscription | null> {
    if (!subscriptionId) return null;

    const subscription = await this.em.findOne(Subscription, {
      id: subscriptionId,
    });
    if (!subscription) throw new NotFoundError('Subscription');
    return subscription;
  }

  private async createPendingTransaction(
    input: CreateChargeInput,
    user: User,
    paymentMethod: PaymentMethod | null,
    invoice: Invoice | null,
    subscription: Subscription | null
  ): Promise<Transaction> {
    const transaction = this.em.create<Transaction>(Transaction, {
      user,
      paymentMethod: paymentMethod ?? undefined,
      invoice: invoice ?? undefined,
      subscription: subscription ?? undefined,
      type: TransactionType.CHARGE,
      status: TransactionStatus.PENDING,
      amount: input.amount,
      currency: input.currency ?? 'eur',
      description: input.description,
      metadata: { ...input.metadata },
      company: input.companyId ?? user.activeCompanyId!,
      amountRefunded: 0,
    });

    this.em.persist(transaction);
    await this.em.flush();
    return transaction;
  }

  // ─────────────────────────────────────────────
  // OPERACIONES DE GESTIÓN
  // ─────────────────────────────────────────────

  private async executeCharge(
    input: CreateChargeInput,
    user: User,
    transaction: Transaction,
    token: string
  ): Promise<void> {
    try {
      // ── Stripe Connect: resolver cuenta de la empresa ─────────────────────
      // Si el cobro es para una empresa (cliente pagando al admin),
      // enrutamos el pago a su cuenta Stripe y retenemos nuestra comisión.
      // Si no hay companyId, el cobro va a nuestra cuenta master
      // (admin pagando su mensualidad a nosotros).
      let connectedAccountId: string | undefined;
      let applicationFeeAmount: number | undefined;

      if (input.companyId && this.paymentProcessor) {
        const connectService = new StripeConnectService(this.em);
        connectedAccountId = await connectService
          .getConnectedAccountId(input.companyId)
          .catch(err => {
            console.warn(
              `[TransactionService] Could not resolve connectedAccountId for company ${input.companyId}: ${err.message}`
            );
            return undefined;
          });

        if (connectedAccountId) {
          // Calcular comisión de plataforma (redondeada a centavos enteros)
          applicationFeeAmount = Math.round(
            input.amount * PLATFORM_FEE_PERCENT
          );
        }
      }

      const result = await this.paymentProcessor!.charge({
        amount: input.amount,
        currency: input.currency ?? 'eur',
        token,
        description: input.description,
        connectedAccountId,
        applicationFeeAmount,
        idempotencyKey: this.generateIdempotencyKey(
          'charge',
          user.id,
          input.amount.toString(),
          transaction.id
        ),
        metadata: {
          transactionId: transaction.id,
          userId: user.id,
          ...(input.companyId && { companyId: input.companyId }),
        },
      });

      transaction.status = result.success
        ? TransactionStatus.SUCCEEDED
        : TransactionStatus.FAILED;

      if (result.externalTransactionId) {
        transaction.externalTransactionId = result.externalTransactionId;
      }

      if (!result.success) {
        transaction.failureReason =
          result.errorMessage ?? 'Payment processor declined the charge';
      }

      // Guardar connectedAccountId en metadata para trazabilidad
      if (connectedAccountId) {
        transaction.metadata = {
          ...transaction.metadata,
          connectedAccountId,
          applicationFeeAmount,
          platformFeePercent: PLATFORM_FEE_PERCENT,
        };
      }
    } catch (error: any) {
      transaction.status = TransactionStatus.FAILED;
      transaction.failureReason =
        error?.message ?? 'Unexpected processor error';
    }
  }

  private buildChargeResponse(transaction: Transaction): ServiceResponse {
    const succeeded = transaction.status === TransactionStatus.SUCCEEDED;
    return createServiceResponse(
      succeeded ? 200 : 402,
      succeeded
        ? 'Charge created successfully'
        : `Charge failed: ${transaction.failureReason}`,
      succeeded,
      { transaction }
    );
  }
}
