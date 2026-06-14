import { EntityManager, QueryOrder } from '@mikro-orm/core';
import moment from 'moment';

import { Customer } from '../entities/Customer';
import { Invoice } from '../entities/Invoice';
import { PaymentMethod, PaymentMethodStatus } from '../entities/PaymentMethod';
import { Plan, PlanInterval } from '../entities/Plan';
import { Subscription, SubscriptionStatus } from '../entities/Subscription';
import { User } from '../entities/User';
import {
  CurrentUser,
  EmailConfig,
  ServiceResponse,
} from '../types/common.type';
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
import { InvoiceService } from './invoice.service';
import { NotificationService } from './notification.service';
import { PaymentProcessor } from './payment-processor.interface';
import { TransactionService } from './transaction.service';

// ─────────────────────────────────────────────
// TIPOS DE ENTRADA
// ─────────────────────────────────────────────

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

/**
 * Input para el cambio de plan con prorrateo.
 * upgrade = cobra la diferencia ahora.
 * downgrade = acredita los días restantes al siguiente período.
 */
interface ChangePlanInput {
  subscriptionId: string;
  newPlanId: string;
  /** Si true cobra/acredita la diferencia proporcional de inmediato */
  prorate?: boolean;
}

/**
 * Input para operaciones administrativas sobre una suscripción.
 */
interface AdminOverrideInput {
  subscriptionId: string;
  /** Nuevo estado a forzar */
  status?: SubscriptionStatus;
  /** Nueva fecha de fin de período (extiende o acorta el período actual) */
  currentPeriodEnd?: Date;
  /** Fecha del próximo cobro */
  nextBillingDate?: Date;
  /** Resetea el contador de intentos fallidos */
  resetFailedAttempts?: boolean;
  /** Razón del cambio (queda en metadata.admin_history) */
  reason: string;
  /** ID del admin que realiza la operación */
  adminId: string;
}

// ─────────────────────────────────────────────
// CONFIGURACIÓN DE DUNNING
// ─────────────────────────────────────────────

const DUNNING_CONFIG = {
  /** Número máximo de intentos antes de marcar como PAST_DUE */
  maxAttempts: 3,
  /** Días entre reintentos [intento 1, intento 2, intento 3] */
  retryIntervalDays: [3, 5, 7],
};

// ─────────────────────────────────────────────
// SERVICIO
// ─────────────────────────────────────────────

/**
 * SubscriptionService
 *
 * Gestiona el ciclo de vida completo de las suscripciones:
 *
 * OPERACIONES DE USUARIO
 *   createSubscription       — nueva suscripción con o sin trial
 *   changePlan               — cambio de plan con prorrateo opcional
 *   updateSubscription       — cambiar método de pago, cantidad o metadata
 *   cancelSubscription       — cancelar ahora o al final del período
 *   pauseSubscription        — pausar sin cobros hasta reanudar
 *   resumeSubscription       — reanudar desde pausa
 *   reactivateSubscription   — reactivar desde PAST_DUE o CANCELED
 *   updatePaymentMethodAndRetry — actualizar tarjeta e intentar cobro inmediato
 *
 * OPERACIONES DE ADMIN
 *   adminOverride            — forzar estado, fechas o contadores (con audit log)
 *   forceRenewal             — forzar cobro de renovación ahora mismo
 *   extendPeriod             — añadir días gratuitos al período actual
 *   applyDiscount            — ajustar el importe del próximo cobro
 *
 * OPERACIONES DEL SISTEMA (CRON)
 *   processBillingCycle      — cobros de renovación, transición de trials, cancelaciones diferidas
 *   notifyExpiringSubscriptions — avisos de expiración
 *
 * LECTURA
 *   getSubscription
 *   listUserSubscriptions
 *   getActiveSubscription
 *   getSubscriptionsStats
 *   getSubscriptionHistory    — audit log de cambios de estado
 */
export class SubscriptionService extends BaseService {
  private readonly customerService: CustomerService;
  private readonly invoiceService: InvoiceService;
  private readonly transactionService: TransactionService;
  private readonly emailService: EmailService;
  private readonly notificationService: NotificationService;

  constructor(em: EntityManager, paymentProcessor: PaymentProcessor) {
    super(em, paymentProcessor);
    this.customerService = new CustomerService(em);
    this.invoiceService = new InvoiceService(em);
    this.transactionService = new TransactionService(em, paymentProcessor);
    this.emailService = new EmailService();
    this.notificationService = new NotificationService(em);
  }

  // ═══════════════════════════════════════════
  // OPERACIONES DE USUARIO
  // ═══════════════════════════════════════════

  /**
   * Crea una suscripción nueva.
   *
   * Plan gratuito (amount = 0) → estado ACTIVE directo, sin cobro ni método de pago.
   * Plan con trial → estado TRIALING, primer cobro al expirar el trial.
   * Plan de pago sin trial → intenta cobrar ahora, queda ACTIVE si tiene éxito
   *   o INCOMPLETE si falla.
   */
  public async createSubscription(
    input: CreateSubscriptionInput
  ): Promise<ServiceResponse> {
    this.validateCreateInput(input);

    const user = await this.getUserOrFail(input.userId);
    const plan = await this.getActivePlanOrFail(input.planId);
    const customer = await this.customerService.getOrCreateCustomer(user);

    await this.assertNoDuplicateSubscription(user, plan);

    const isFree = plan.amount === 0;

    // Solo buscar método de pago si el plan tiene coste
    const paymentMethod = isFree
      ? null
      : input.paymentMethodId
        ? await this.getPaymentMethodOrFail(input.paymentMethodId, customer)
        : await this.getDefaultPaymentMethod(customer);

    const trialDays =
      input.trialPeriodDays !== undefined
        ? input.trialPeriodDays
        : (plan.trialPeriodDays ?? 0);

    const now = new Date();
    const isTrialing = !isFree && trialDays > 0;

    const trialStart = isTrialing ? now : undefined;
    const trialEnd = isTrialing ? this.addDays(now, trialDays) : undefined;
    const periodStart = now;
    const periodEnd = isTrialing
      ? trialEnd!
      : this.calculatePeriodEnd(now, plan);

    const subscription = this.em.create(Subscription, {
      user,
      customer,
      plan,
      defaultPaymentMethod: paymentMethod ?? undefined,
      company: input.companyId,
      // Plan gratuito → ACTIVE directo
      // Con trial → TRIALING
      // De pago sin trial → INCOMPLETE hasta que el cobro confirme
      status: isFree
        ? SubscriptionStatus.ACTIVE
        : isTrialing
          ? SubscriptionStatus.TRIALING
          : SubscriptionStatus.INCOMPLETE,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      trialStart,
      trialEnd,
      nextBillingDate: periodEnd,
      quantity: input.quantity ?? 1,
      failedPaymentAttempts: 0,
      metadata: {
        ...input.metadata,
        history: [
          this.buildHistoryEntry(
            'created',
            'system',
            isFree
              ? 'Free plan subscription created — no charge required'
              : 'Subscription created'
          ),
        ],
      },
    });

    this.em.persist(subscription);
    await this.em.flush();

    // Solo intentar cobro si hay importe y no está en período de trial
    if (!isFree && !isTrialing) {
      await this.attemptCharge(subscription);
    }

    return createServiceResponse(
      201,
      'Subscription created successfully',
      true,
      {
        subscription,
      }
    );
  }

  /**
   * Cambia el plan de una suscripción activa con prorrateo opcional.
   *
   * SIN prorrateo (prorate: false):
   *   El nuevo plan se aplica en el siguiente período. No se cobra nada ahora.
   *
   * CON prorrateo (prorate: true):
   *   Se calcula el valor de los días restantes del plan actual y la diferencia
   *   con el nuevo plan. Si es upgrade se cobra la diferencia ahora mismo.
   *   Si es downgrade se acredita como descuento en el siguiente cobro.
   */
  public async changePlan(input: ChangePlanInput): Promise<ServiceResponse> {
    if (!input.subscriptionId || !input.newPlanId) {
      throw new BadRequestError('subscriptionId and newPlanId are required');
    }

    const subscription = await this.em.findOne(
      Subscription,
      { id: input.subscriptionId },
      { populate: ['user', 'plan', 'customer', 'defaultPaymentMethod'] }
    );

    if (!subscription) throw new NotFoundError('Subscription');
    if (!subscription.isActive) {
      throw new BadRequestError(
        'Only active or trialing subscriptions can change plan'
      );
    }

    const newPlan = await this.em.findOne(
      Plan,
      { id: input.newPlanId, isActive: true },
      { filters: { companyContext: false } }
    );

    if (!newPlan) throw new NotFoundError('New plan not found or inactive');
    if (newPlan.id === subscription.plan.id) {
      throw new BadRequestError('New plan is the same as the current plan');
    }

    const oldPlan = subscription.plan;
    const now = new Date();

    if (
      input.prorate &&
      subscription.currentPeriodStart &&
      subscription.currentPeriodEnd
    ) {
      const periodTotal =
        subscription.currentPeriodEnd.getTime() -
        subscription.currentPeriodStart.getTime();
      const periodElapsed =
        now.getTime() - subscription.currentPeriodStart.getTime();
      const periodRemaining = Math.max(0, periodTotal - periodElapsed);
      const fractionRemaining = periodRemaining / periodTotal;

      const oldPlanCredit = Math.round(oldPlan.amount * fractionRemaining);
      const newPlanCharge = Math.round(newPlan.amount * fractionRemaining);
      const proratedDiff = newPlanCharge - oldPlanCredit;

      if (proratedDiff > 0) {
        // Upgrade: cobrar la diferencia ahora
        const pm = subscription.defaultPaymentMethod;
        if (pm?.externalToken && pm.status === PaymentMethodStatus.ACTIVE) {
          const chargeResult = await this.transactionService.createCharge({
            userId: subscription.user.id,
            amount: proratedDiff,
            currency: newPlan.currency,
            paymentMethodId: pm.id,
            subscriptionId: subscription.id,
            description: `Plan upgrade proration: ${oldPlan.name} → ${newPlan.name}`,
            companyId: subscription.company?.id,
          });

          const { transaction } = chargeResult.data as any;
          if (transaction?.status !== 'succeeded') {
            throw new BadRequestError(
              'Proration charge failed. Plan not changed. Please check your payment method.'
            );
          }
        }
      } else if (proratedDiff < 0) {
        // Downgrade: guardar el crédito en metadata para descontarlo del próximo cobro
        const credit = Math.abs(proratedDiff);
        subscription.metadata = {
          ...subscription.metadata,
          pendingCredit: (subscription.metadata?.pendingCredit ?? 0) + credit,
          pendingCreditReason: `Plan downgrade: ${oldPlan.name} → ${newPlan.name}`,
        };
      }
    }

    // Aplicar el nuevo plan
    subscription.plan = newPlan;
    subscription.currentPeriodEnd = this.calculatePeriodEnd(
      subscription.currentPeriodStart ?? now,
      newPlan
    );
    subscription.nextBillingDate = subscription.currentPeriodEnd;

    this.appendHistory(
      subscription,
      'plan_changed',
      'user',
      `Plan changed from "${oldPlan.name}" to "${newPlan.name}"${input.prorate ? ' with proration' : ''}`
    );

    await this.em.flush();

    return createServiceResponse(200, 'Plan changed successfully', true, {
      subscription,
    });
  }

  /**
   * Actualiza método de pago, cantidad o metadata de una suscripción.
   * Para cambiar de plan usar changePlan() que gestiona el prorrateo.
   */
  public async updateSubscription(
    input: UpdateSubscriptionInput
  ): Promise<ServiceResponse> {
    if (!input.subscriptionId) {
      throw new BadRequestError('Subscription ID is required');
    }

    const subscription = await this.em.findOne(
      Subscription,
      { id: input.subscriptionId },
      { populate: ['user', 'plan', 'customer', 'defaultPaymentMethod'] }
    );

    if (!subscription) throw new NotFoundError('Subscription');

    if (input.quantity !== undefined) {
      if (input.quantity <= 0) {
        throw new BadRequestError('Quantity must be greater than 0');
      }
      subscription.quantity = input.quantity;
    }

    if (input.paymentMethodId) {
      const pm = await this.getPaymentMethodOrFail(
        input.paymentMethodId,
        subscription.customer
      );
      subscription.defaultPaymentMethod = pm;
      this.appendHistory(
        subscription,
        'payment_method_updated',
        'user',
        'Payment method updated'
      );
    }

    if (input.metadata) {
      subscription.metadata = { ...subscription.metadata, ...input.metadata };
    }

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
   * Cancela una suscripción inmediatamente o al final del período actual.
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

    if (!subscription) throw new NotFoundError('Subscription');
    if (!subscription.isActive) {
      throw new BadRequestError('Subscription is not active');
    }

    if (input.cancelAtPeriodEnd) {
      subscription.cancelAtPeriodEnd = true;
      this.appendHistory(
        subscription,
        'cancel_scheduled',
        'user',
        `Cancellation scheduled at period end. Reason: ${input.cancellationReason ?? 'not specified'}`
      );
    } else {
      subscription.status = SubscriptionStatus.CANCELED;
      subscription.canceledAt = new Date();
      subscription.endedAt = new Date();
      subscription.nextBillingDate = undefined;
      this.appendHistory(
        subscription,
        'canceled',
        'user',
        `Canceled immediately. Reason: ${input.cancellationReason ?? 'not specified'}`
      );
    }

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
   * Pausa una suscripción activa.
   * El CRON no la tocará mientras esté en estado PAUSED.
   */
  public async pauseSubscription(
    subscriptionId: string
  ): Promise<ServiceResponse> {
    const subscription = await this.em.findOne(Subscription, {
      id: subscriptionId,
    });

    if (!subscription) throw new NotFoundError('Subscription');
    if (!subscription.isActive) {
      throw new BadRequestError('Only active subscriptions can be paused');
    }

    subscription.status = SubscriptionStatus.PAUSED;
    subscription.nextBillingDate = undefined;

    this.appendHistory(
      subscription,
      'paused',
      'user',
      'Subscription paused by user'
    );

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
   * Reanuda una suscripción pausada.
   * Recalcula nextBillingDate a partir de hoy y cobra inmediatamente
   * si el período actual ya ha vencido.
   */
  public async resumeSubscription(
    subscriptionId: string
  ): Promise<ServiceResponse> {
    const subscription = await this.em.findOne(
      Subscription,
      { id: subscriptionId },
      { populate: ['plan', 'user', 'customer', 'defaultPaymentMethod'] }
    );

    if (!subscription) throw new NotFoundError('Subscription');
    if (subscription.status !== SubscriptionStatus.PAUSED) {
      throw new BadRequestError('Subscription is not paused');
    }

    const now = new Date();
    const isFree = subscription.plan.amount === 0;

    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = this.calculatePeriodEnd(
      now,
      subscription.plan
    );
    subscription.nextBillingDate = subscription.currentPeriodEnd;
    subscription.failedPaymentAttempts = 0;

    this.appendHistory(
      subscription,
      'resumed',
      'user',
      'Subscription resumed by user'
    );

    await this.em.flush();

    // Solo cobrar si hay importe y el período anterior ya venció
    if (
      !isFree &&
      subscription.currentPeriodEnd &&
      subscription.currentPeriodEnd < now
    ) {
      await this.attemptCharge(subscription);
    }

    return createServiceResponse(
      200,
      'Subscription resumed successfully',
      true,
      {
        subscription,
      }
    );
  }

  /**
   * Reactiva una suscripción en estado PAST_DUE o CANCELED.
   *
   * Plan gratuito → ACTIVE directo, sin requerir método de pago.
   * PAST_DUE → intenta cobrar las facturas pendientes y vuelve a ACTIVE.
   * CANCELED → crea un período nuevo desde hoy e intenta cobrar.
   *
   * Requiere método de pago válido solo si el plan tiene coste.
   */
  public async reactivateSubscription(
    subscriptionId: string
  ): Promise<ServiceResponse> {
    const subscription = await this.em.findOne(
      Subscription,
      { id: subscriptionId },
      { populate: ['user', 'plan', 'customer', 'defaultPaymentMethod'] }
    );

    if (!subscription) throw new NotFoundError('Subscription');

    const reactivableStatuses = [
      SubscriptionStatus.PAST_DUE,
      SubscriptionStatus.CANCELED,
      SubscriptionStatus.UNPAID,
      SubscriptionStatus.INCOMPLETE_EXPIRED,
    ];

    if (!reactivableStatuses.includes(subscription.status)) {
      throw new BadRequestError(
        `Cannot reactivate a subscription in status "${subscription.status}". ` +
          `Only ${reactivableStatuses.join(', ')} subscriptions can be reactivated.`
      );
    }

    const isFree = subscription.plan.amount === 0;

    if (!isFree) {
      // Solo exigir método de pago si el plan tiene coste
      const pm =
        subscription.defaultPaymentMethod ??
        (await this.getDefaultPaymentMethod(subscription.customer));

      if (!pm?.externalToken || pm.status !== PaymentMethodStatus.ACTIVE) {
        throw new BadRequestError(
          'A valid payment method is required to reactivate the subscription'
        );
      }

      // Asignar el método de pago si no estaba asignado
      subscription.defaultPaymentMethod ??= pm;
    }

    const now = new Date();
    // Plan gratuito → ACTIVE directo; de pago → INCOMPLETE hasta confirmar cobro
    subscription.status = isFree
      ? SubscriptionStatus.ACTIVE
      : SubscriptionStatus.INCOMPLETE;
    subscription.failedPaymentAttempts = 0;
    subscription.canceledAt = undefined;
    subscription.endedAt = undefined;
    subscription.cancelAtPeriodEnd = false;
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = this.calculatePeriodEnd(
      now,
      subscription.plan
    );
    subscription.nextBillingDate = subscription.currentPeriodEnd;

    this.appendHistory(
      subscription,
      'reactivation_attempted',
      'user',
      isFree
        ? 'Free plan reactivated — no charge required'
        : 'User requested reactivation'
    );

    await this.em.flush();

    if (!isFree) {
      // Intentar cobrar — si tiene éxito queda ACTIVE, si falla aplica dunning
      await this.attemptCharge(subscription);
      await this.em.refresh(subscription);
    }

    const success = subscription.status === SubscriptionStatus.ACTIVE;

    return createServiceResponse(
      success ? 200 : 402,
      success
        ? 'Subscription reactivated successfully'
        : 'Reactivation failed: payment could not be processed',
      success,
      { subscription }
    );
  }

  /**
   * Actualiza el método de pago de una suscripción PAST_DUE e intenta
   * cobrar las facturas pendientes de inmediato.
   *
   * Este es el flujo típico cuando el usuario añade una tarjeta nueva
   * después de que su pago haya fallado repetidamente.
   */
  public async updatePaymentMethodAndRetry(
    subscriptionId: string,
    paymentMethodId: string
  ): Promise<ServiceResponse> {
    const subscription = await this.em.findOne(
      Subscription,
      { id: subscriptionId },
      { populate: ['user', 'plan', 'customer', 'defaultPaymentMethod'] }
    );

    if (!subscription) throw new NotFoundError('Subscription');

    const allowedStatuses = [
      SubscriptionStatus.PAST_DUE,
      SubscriptionStatus.UNPAID,
      SubscriptionStatus.INCOMPLETE,
    ];

    if (!allowedStatuses.includes(subscription.status)) {
      throw new BadRequestError(
        `This operation is only available for subscriptions in status: ${allowedStatuses.join(', ')}`
      );
    }

    const pm = await this.getPaymentMethodOrFail(
      paymentMethodId,
      subscription.customer
    );

    subscription.defaultPaymentMethod = pm;
    subscription.failedPaymentAttempts = 0;

    this.appendHistory(
      subscription,
      'payment_method_updated',
      'user',
      'Payment method updated and immediate retry triggered'
    );

    await this.em.flush();

    // Cobrar inmediatamente sin esperar al CRON
    await this.attemptCharge(subscription);
    await this.em.refresh(subscription);

    const success = subscription.status === SubscriptionStatus.ACTIVE;

    return createServiceResponse(
      success ? 200 : 402,
      success
        ? 'Payment method updated and subscription reactivated'
        : 'Payment method updated but charge still failed',
      success,
      { subscription }
    );
  }

  // ═══════════════════════════════════════════
  // OPERACIONES DE ADMIN
  // ═══════════════════════════════════════════

  /**
   * Permite a un administrador forzar cambios en una suscripción.
   * Todos los cambios quedan registrados en el audit log (metadata.history).
   *
   * Casos de uso:
   *  - Cambiar estado manualmente (ej: resolver un PAST_DUE sin cobrar)
   *  - Extender el período de un cliente con incidencia
   *  - Cambiar la fecha del próximo cobro
   *  - Resetear intentos fallidos sin cobrar
   */
  public async adminOverride(
    input: AdminOverrideInput
  ): Promise<ServiceResponse> {
    if (!input.reason) {
      throw new BadRequestError('A reason is required for admin overrides');
    }

    const subscription = await this.em.findOne(
      Subscription,
      { id: input.subscriptionId },
      { populate: ['plan', 'user'] }
    );

    if (!subscription) throw new NotFoundError('Subscription');

    const changes: string[] = [];

    if (input.status !== undefined && input.status !== subscription.status) {
      const oldStatus = subscription.status;
      subscription.status = input.status;

      // Efectos secundarios según el nuevo estado
      if (input.status === SubscriptionStatus.CANCELED) {
        subscription.canceledAt = new Date();
        subscription.endedAt = new Date();
        subscription.nextBillingDate = undefined;
      } else if (input.status === SubscriptionStatus.ACTIVE) {
        subscription.canceledAt = undefined;
        subscription.endedAt = undefined;
      }

      changes.push(`status: ${oldStatus} → ${input.status}`);
    }

    if (input.currentPeriodEnd !== undefined) {
      const old = subscription.currentPeriodEnd?.toISOString() ?? 'none';
      subscription.currentPeriodEnd = input.currentPeriodEnd;
      changes.push(
        `currentPeriodEnd: ${old} → ${input.currentPeriodEnd.toISOString()}`
      );
    }

    if (input.nextBillingDate !== undefined) {
      const old = subscription.nextBillingDate?.toISOString() ?? 'none';
      subscription.nextBillingDate = input.nextBillingDate;
      changes.push(
        `nextBillingDate: ${old} → ${input.nextBillingDate.toISOString()}`
      );
    }

    if (input.resetFailedAttempts) {
      changes.push(
        `failedPaymentAttempts: ${subscription.failedPaymentAttempts} → 0`
      );
      subscription.failedPaymentAttempts = 0;
    }

    if (changes.length === 0) {
      throw new BadRequestError('No changes specified in admin override');
    }

    this.appendHistory(
      subscription,
      'admin_override',
      input.adminId,
      `[ADMIN] ${input.reason} — Changes: ${changes.join(', ')}`
    );

    await this.em.flush();

    return createServiceResponse(
      200,
      'Admin override applied successfully',
      true,
      {
        subscription,
        changes,
      }
    );
  }

  /**
   * Fuerza la renovación de una suscripción activa ahora mismo,
   * sin esperar a que llegue nextBillingDate.
   *
   * Útil para testing, corrección de errores o cuando el admin
   * quiere cobrar manualmente un período atrasado.
   */
  public async forceRenewal(
    subscriptionId: string,
    adminId: string
  ): Promise<ServiceResponse> {
    const subscription = await this.em.findOne(
      Subscription,
      { id: subscriptionId },
      { populate: ['user', 'plan', 'customer', 'defaultPaymentMethod'] }
    );

    if (!subscription) throw new NotFoundError('Subscription');

    const validStatuses = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.PAST_DUE,
      SubscriptionStatus.UNPAID,
    ];

    if (!validStatuses.includes(subscription.status)) {
      throw new BadRequestError(
        `Cannot force renewal on a subscription with status "${subscription.status}"`
      );
    }

    this.appendHistory(
      subscription,
      'force_renewal',
      adminId,
      'Admin forced immediate renewal'
    );

    await this.em.flush();
    await this.attemptCharge(subscription);
    await this.em.refresh(subscription);

    const success = subscription.status === SubscriptionStatus.ACTIVE;

    return createServiceResponse(
      success ? 200 : 402,
      success ? 'Renewal successful' : 'Renewal charge failed',
      success,
      { subscription }
    );
  }

  /**
   * Extiende el período actual de una suscripción añadiendo días gratuitos.
   * No cobra nada — simplemente desplaza currentPeriodEnd y nextBillingDate.
   *
   * Casos de uso: compensación por incidencia, promoción, período de gracia.
   */
  public async extendPeriod(
    subscriptionId: string,
    days: number,
    adminId: string,
    reason: string
  ): Promise<ServiceResponse> {
    if (!days || days <= 0) {
      throw new BadRequestError('Days must be a positive number');
    }
    if (!reason) {
      throw new BadRequestError('A reason is required');
    }

    const subscription = await this.em.findOne(Subscription, {
      id: subscriptionId,
    });

    if (!subscription) throw new NotFoundError('Subscription');

    const oldEnd = subscription.currentPeriodEnd ?? new Date();
    const newEnd = this.addDays(oldEnd, days);

    subscription.currentPeriodEnd = newEnd;
    subscription.nextBillingDate = newEnd;

    this.appendHistory(
      subscription,
      'period_extended',
      adminId,
      `[ADMIN] Period extended by ${days} days. New end: ${newEnd.toISOString()}. Reason: ${reason}`
    );

    await this.em.flush();

    return createServiceResponse(200, `Period extended by ${days} days`, true, {
      subscription,
    });
  }

  /**
   * Aplica un crédito al siguiente cobro de una suscripción.
   * El importe se descuenta automáticamente en la próxima ejecución de attemptCharge.
   *
   * Casos de uso: descuento comercial, devolución parcial en crédito, compensación.
   */
  public async applyCredit(
    subscriptionId: string,
    amountInCents: number,
    adminId: string,
    reason: string
  ): Promise<ServiceResponse> {
    if (!amountInCents || amountInCents <= 0) {
      throw new BadRequestError('Credit amount must be a positive number');
    }
    if (!reason) {
      throw new BadRequestError('A reason is required');
    }

    const subscription = await this.em.findOne(
      Subscription,
      { id: subscriptionId },
      { populate: ['plan'] }
    );

    if (!subscription) throw new NotFoundError('Subscription');

    if (amountInCents > subscription.plan.amount) {
      throw new BadRequestError(
        'Credit cannot exceed the plan amount. Use a refund instead.'
      );
    }

    const existing = subscription.metadata?.pendingCredit ?? 0;
    subscription.metadata = {
      ...subscription.metadata,
      pendingCredit: existing + amountInCents,
      pendingCreditReason: reason,
    };

    this.appendHistory(
      subscription,
      'credit_applied',
      adminId,
      `[ADMIN] Credit of ${amountInCents} cents applied. Reason: ${reason}`
    );

    await this.em.flush();

    return createServiceResponse(
      200,
      `Credit of ${(amountInCents / 100).toFixed(2)} applied to next billing`,
      true,
      { subscription }
    );
  }

  // ═══════════════════════════════════════════
  // LECTURA
  // ═══════════════════════════════════════════

  public async getSubscription(
    subscriptionId: string
  ): Promise<ServiceResponse> {
    if (!subscriptionId)
      throw new BadRequestError('Subscription ID is required');

    const subscription = await this.em.findOne(
      Subscription,
      { id: subscriptionId },
      { populate: ['user', 'plan', 'customer', 'defaultPaymentMethod'] }
    );

    if (!subscription) throw new NotFoundError('Subscription');

    return createServiceResponse(
      200,
      'Subscription fetched successfully',
      true,
      {
        subscription,
      }
    );
  }

  public async listUserSubscriptions(userId: string): Promise<ServiceResponse> {
    if (!userId) throw new BadRequestError('User ID is required');

    const user = await this.em.findOne(User, { id: userId });
    if (!user) throw new NotFoundError('User');

    const subscriptions = await this.em.find(Subscription, { user }, {
      populate: ['plan', 'defaultPaymentMethod'],
      orderBy: { created_at: QueryOrder.DESC },
    } as any);

    return createServiceResponse(
      200,
      'Subscriptions fetched successfully',
      true,
      {
        subscriptions,
      }
    );
  }

  public async getActiveSubscription(userId: string): Promise<ServiceResponse> {
    if (!userId) throw new BadRequestError('User ID is required');

    const user = await this.em.findOne(User, { id: userId });
    if (!user) throw new NotFoundError('User');

    const subscriptions = await this.em.find(Subscription, { user }, {
      populate: ['plan', 'defaultPaymentMethod'],
      orderBy: { created_at: QueryOrder.DESC },
    } as any);

    const activeSubscription = subscriptions.find(s => s.isActive) ?? null;

    return createServiceResponse(
      200,
      'Active subscription fetched successfully',
      true,
      {
        subscription: activeSubscription,
      }
    );
  }

  /**
   * Devuelve el audit log de cambios de estado de una suscripción.
   */
  public async getSubscriptionHistory(
    subscriptionId: string
  ): Promise<ServiceResponse> {
    const subscription = await this.em.findOne(Subscription, {
      id: subscriptionId,
    });

    if (!subscription) throw new NotFoundError('Subscription');

    const history = subscription.metadata?.history ?? [];

    return createServiceResponse(200, 'History fetched successfully', true, {
      history,
    });
  }

  public async getSubscriptionsStats(
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) throw new UnauthorizedError();

    try {
      const subscriptions = await this.em
        .getRepository(Subscription)
        .find(
          { status: SubscriptionStatus.ACTIVE },
          { fields: ['plan.id', 'plan.name'] }
        );

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

      return createServiceResponse(200, 'Stats calculated successfully', true, {
        stats,
      });
    } catch (error: any) {
      console.log(error);
      throw new InternalServerError('Error calculating subscription stats');
    }
  }

  // ═══════════════════════════════════════════
  // CRON: CICLO DE FACTURACIÓN
  // ═══════════════════════════════════════════

  /**
   * Punto de entrada del CRON de billing — ejecutar una vez al día (02:00 UTC).
   *
   * Procesa en orden:
   *  1. Suscripciones ACTIVE con nextBillingDate <= hoy  → cobro de renovación
   *  2. Suscripciones TRIALING con trialEnd <= hoy       → transición a ACTIVE + cobro
   *  3. Suscripciones con cancelAtPeriodEnd vencidas     → cancelación definitiva
   */
  public async processBillingCycle(): Promise<void> {
    console.log('[CRON] processBillingCycle — start');
    const now = new Date();

    // 1. Renovaciones — excluir planes gratuitos (amount > 0)
    const dueSubscriptions = await this.em.find(
      Subscription,
      {
        status: SubscriptionStatus.ACTIVE,
        nextBillingDate: { $lte: now },
        plan: { amount: { $gt: 0 } },
      },
      { populate: ['user', 'plan', 'customer', 'defaultPaymentMethod'] }
    );

    console.log(
      `[CRON] ${dueSubscriptions.length} subscriptions due for renewal`
    );
    for (const sub of dueSubscriptions) {
      await this.attemptCharge(sub);
    }

    // 2. Trials expirados
    const expiringTrials = await this.em.find(
      Subscription,
      {
        status: SubscriptionStatus.TRIALING,
        trialEnd: { $lte: now },
      },
      { populate: ['user', 'plan', 'customer', 'defaultPaymentMethod'] }
    );

    console.log(`[CRON] ${expiringTrials.length} trials expiring`);
    for (const sub of expiringTrials) {
      await this.transitionTrialToActive(sub);
    }

    // 3. Cancelaciones diferidas
    const pendingCancellations = await this.em.find(
      Subscription,
      {
        cancelAtPeriodEnd: true,
        currentPeriodEnd: { $lte: now },
      },
      { populate: ['user'] }
    );

    console.log(`[CRON] ${pendingCancellations.length} deferred cancellations`);
    for (const sub of pendingCancellations) {
      sub.status = SubscriptionStatus.CANCELED;
      sub.canceledAt = now;
      sub.endedAt = now;
      sub.nextBillingDate = undefined;
      this.appendHistory(
        sub,
        'canceled',
        'system',
        'Canceled at period end (scheduled)'
      );
    }

    if (pendingCancellations.length > 0) {
      await this.em.flush();
    }

    console.log('[CRON] processBillingCycle — done');
  }

  /**
   * Notifica a los usuarios cuya suscripción vence mañana.
   */
  public async notifyExpiringSubscriptions(): Promise<void> {
    const tomorrow = moment().add(1, 'days');
    const from = tomorrow.clone().startOf('day').toDate();
    const to = tomorrow.clone().endOf('day').toDate();

    const expiringSubscriptions = await this.em.find(
      Subscription,
      {
        status: SubscriptionStatus.ACTIVE,
        endedAt: { $gte: from, $lte: to },
      },
      { populate: ['user', 'user.pushTokens'], filters: false }
    );

    if (!expiringSubscriptions.length) {
      console.log('[CRON] No subscriptions expiring tomorrow');
      return;
    }

    console.log(
      `[CRON] Notifying ${expiringSubscriptions.length} expiring subscriptions`
    );

    await Promise.allSettled(
      expiringSubscriptions.map(sub => this.notifyUser(sub))
    );
  }

  // ═══════════════════════════════════════════
  // LÓGICA DE COBRO Y DUNNING
  // ═══════════════════════════════════════════

  /**
   * Intenta cobrar la renovación de una suscripción.
   *
   * Guardia inicial: plan gratuito → ACTIVE directo, sin cobro.
   * Si hay un crédito pendiente (pendingCredit en metadata) lo descuenta
   * del importe antes de cobrar. Si el crédito cubre el total no se cobra nada.
   */
  private async attemptCharge(subscription: Subscription): Promise<void> {
    // Guardia extra — nunca cobrar planes gratuitos
    if (subscription.plan.amount === 0) {
      const now = new Date();
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = this.calculatePeriodEnd(
        now,
        subscription.plan
      );
      subscription.nextBillingDate = subscription.currentPeriodEnd;
      this.appendHistory(
        subscription,
        'renewed',
        'system',
        'Free plan — no charge required'
      );
      await this.em.flush();
      return;
    }

    let invoice: Invoice;
    try {
      invoice = await this.invoiceService.createForSubscription(subscription);
    } catch (err: any) {
      console.error(
        `[Billing] Could not create invoice for subscription ${subscription.id}:`,
        err.message
      );
      return;
    }

    const pm = subscription.defaultPaymentMethod;

    if (!pm || !pm.externalToken || pm.status !== PaymentMethodStatus.ACTIVE) {
      console.warn(
        `[Billing] Subscription ${subscription.id} has no valid payment method`
      );
      await this.handleFailedPayment(subscription, invoice);
      return;
    }

    // Aplicar crédito pendiente si existe
    const pendingCredit: number = subscription.metadata?.pendingCredit ?? 0;
    const baseAmount = subscription.plan.amount;
    const chargeAmount = Math.max(0, baseAmount - pendingCredit);

    if (chargeAmount === 0) {
      // El crédito cubre el cobro completo
      await this.invoiceService.markAsPaid(invoice.id, new Date());

      const now = new Date();
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = this.calculatePeriodEnd(
        now,
        subscription.plan
      );
      subscription.nextBillingDate = subscription.currentPeriodEnd;
      subscription.failedPaymentAttempts = 0;
      subscription.metadata = {
        ...subscription.metadata,
        pendingCredit: 0,
        pendingCreditReason: undefined,
      };

      this.appendHistory(
        subscription,
        'renewed',
        'system',
        'Renewed using pending credit (no charge)'
      );
      await this.em.flush();
      return;
    }

    const chargeResponse = await this.transactionService.createCharge({
      userId: subscription.user.id,
      amount: chargeAmount,
      currency: subscription.plan.currency,
      paymentMethodId: pm.id,
      invoiceId: invoice.id,
      subscriptionId: subscription.id,
      description: `Renewal — ${subscription.plan.name}`,
      companyId: subscription.company?.id,
    });

    const { transaction } = chargeResponse.data as any;

    if (transaction?.status === 'succeeded') {
      await this.invoiceService.markAsPaid(invoice.id, new Date());

      const now = new Date();
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = this.calculatePeriodEnd(
        now,
        subscription.plan
      );
      subscription.nextBillingDate = subscription.currentPeriodEnd;
      subscription.failedPaymentAttempts = 0;

      // Limpiar crédito si se usó parcialmente
      if (pendingCredit > 0) {
        subscription.metadata = {
          ...subscription.metadata,
          pendingCredit: 0,
          pendingCreditReason: undefined,
        };
      }

      this.appendHistory(
        subscription,
        'renewed',
        'system',
        `Renewed successfully. Charged: ${chargeAmount} cents`
      );
      await this.em.flush();

      console.log(
        `[Billing] Subscription ${subscription.id} renewed successfully`
      );
    } else {
      await this.handleFailedPayment(subscription, invoice);
    }
  }

  /**
   * Gestiona un pago fallido aplicando la lógica de dunning.
   *
   * Intento 1 → reintento en 3 días
   * Intento 2 → reintento en 5 días
   * Intento 3 → PAST_DUE, sin más reintentos automáticos
   */
  private async handleFailedPayment(
    subscription: Subscription,
    _invoice: Invoice
  ): Promise<void> {
    subscription.failedPaymentAttempts += 1;

    const attempt = subscription.failedPaymentAttempts;
    const { maxAttempts, retryIntervalDays } = DUNNING_CONFIG;

    if (attempt >= maxAttempts) {
      subscription.status = SubscriptionStatus.PAST_DUE;
      subscription.nextBillingDate = undefined;

      this.appendHistory(
        subscription,
        'past_due',
        'system',
        `Moved to PAST_DUE after ${attempt} failed payment attempts`
      );

      console.warn(
        `[Billing] Subscription ${subscription.id} → PAST_DUE after ${attempt} attempts`
      );

      await this.notifyPaymentFailed(subscription);
    } else {
      const daysUntilRetry =
        retryIntervalDays[attempt - 1] ??
        retryIntervalDays[retryIntervalDays.length - 1];

      subscription.nextBillingDate = this.addDays(new Date(), daysUntilRetry);

      this.appendHistory(
        subscription,
        'payment_failed',
        'system',
        `Payment attempt ${attempt}/${maxAttempts} failed. Next retry in ${daysUntilRetry} days`
      );

      console.warn(
        `[Billing] Subscription ${subscription.id} charge failed ` +
          `(attempt ${attempt}/${maxAttempts}). Next retry in ${daysUntilRetry} days`
      );
    }

    await this.em.flush();
  }

  /**
   * Transiciona una suscripción de TRIALING a ACTIVE al expirar el trial
   * e intenta el primer cobro real.
   * Si el plan es gratuito (no debería tener trial, pero por seguridad)
   * queda ACTIVE sin cobro.
   */
  private async transitionTrialToActive(
    subscription: Subscription
  ): Promise<void> {
    const now = new Date();
    const isFree = subscription.plan.amount === 0;
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = this.calculatePeriodEnd(
      now,
      subscription.plan
    );
    subscription.failedPaymentAttempts = 0;
    subscription.nextBillingDate = subscription.currentPeriodEnd;

    this.appendHistory(
      subscription,
      'trial_ended',
      'system',
      'Trial period ended — transitioning to active'
    );

    await this.em.flush();

    if (!isFree) {
      console.log(
        `[Billing] Trial ended for subscription ${subscription.id}. Attempting first charge.`
      );
      await this.attemptCharge(subscription);
    } else {
      console.log(
        `[Billing] Trial ended for free subscription ${subscription.id}. No charge needed.`
      );
    }
  }

  // ═══════════════════════════════════════════
  // AUDIT LOG
  // ═══════════════════════════════════════════

  /**
   * Añade una entrada al historial de cambios de la suscripción.
   * Se almacena en metadata.history como array de eventos inmutables.
   */
  private appendHistory(
    subscription: Subscription,
    event: string,
    actor: string,
    detail: string
  ): void {
    const entry = this.buildHistoryEntry(event, actor, detail);
    const current: any[] = subscription.metadata?.history ?? [];
    subscription.metadata = {
      ...subscription.metadata,
      history: [...current, entry],
    };
  }

  private buildHistoryEntry(
    event: string,
    actor: string,
    detail: string
  ): Record<string, any> {
    return {
      event,
      actor,
      detail,
      timestamp: new Date().toISOString(),
    };
  }

  // ═══════════════════════════════════════════
  // HELPERS PRIVADOS
  // ═══════════════════════════════════════════

  private validateCreateInput(input: CreateSubscriptionInput): void {
    if (!input.userId || !input.planId || !input.companyId) {
      throw new BadRequestError('userId, planId and companyId are required');
    }
    if (input.quantity !== undefined && input.quantity <= 0) {
      throw new BadRequestError('Quantity must be greater than 0');
    }
    if (input.trialPeriodDays !== undefined && input.trialPeriodDays < 0) {
      throw new BadRequestError('Trial period days cannot be negative');
    }
  }

  private async getUserOrFail(userId: string): Promise<User> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) throw new NotFoundError('User');
    return user;
  }

  private async getActivePlanOrFail(planId: string): Promise<Plan> {
    const plan = await this.em.findOne(
      Plan,
      { id: planId, isActive: true },
      { filters: { companyContext: false } }
    );
    if (!plan) throw new NotFoundError('Plan not found or inactive');
    return plan;
  }

  private async assertNoDuplicateSubscription(
    user: User,
    plan: Plan
  ): Promise<void> {
    const existing = await this.em.findOne(Subscription, {
      user,
      plan,
      status: {
        $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
      },
    });
    if (existing) {
      throw new ConflictError(
        'User already has an active subscription to this plan'
      );
    }
  }

  private async getPaymentMethodOrFail(
    paymentMethodId: string,
    customer: Customer
  ): Promise<PaymentMethod> {
    const pm = await this.em.findOne(PaymentMethod, {
      id: paymentMethodId,
      customer,
      status: PaymentMethodStatus.ACTIVE,
    });
    if (!pm) throw new NotFoundError('Payment method not found or inactive');
    return pm;
  }

  private async getDefaultPaymentMethod(
    customer: Customer
  ): Promise<PaymentMethod | null> {
    return this.em.findOne(PaymentMethod, {
      customer,
      isDefault: true,
      status: PaymentMethodStatus.ACTIVE,
    });
  }

  private calculatePeriodEnd(start: Date, plan: Plan): Date {
    const count = plan.intervalCount ?? 1;
    switch (plan.interval) {
      case PlanInterval.DAY:
        return this.addDays(start, count);
      case PlanInterval.WEEK:
        return this.addDays(start, count * 7);
      case PlanInterval.MONTH:
        return this.addMonths(start, count);
      case PlanInterval.YEAR:
        return this.addYears(start, count);
      default:
        return this.addMonths(start, 1);
    }
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
      subject: 'Tu suscripción está a punto de vencer',
      html: sendSubscriptionExpiryWarning(
        expiryDate ?? moment().format('YYYY-MM-DD')
      ),
    };

    await Promise.allSettled([
      this.emailService.sendEmail(config),
      this.notificationService.sendToUser(
        user.id,
        '⚠️ Suscripción por vencer',
        `Tu suscripción vence el ${expiryDate}. Contacta con el administrador para renovarla.`
      ),
    ]);
  }

  private async notifyPaymentFailed(subscription: Subscription): Promise<void> {
    const { user } = subscription;

    const config: EmailConfig = {
      from: process.env.GMAIL_USER!,
      to: user.email!,
      subject: 'No hemos podido procesar tu pago',
      html: `<p>Hola ${user.name},</p>
             <p>No hemos podido cobrar la renovación de tu suscripción <strong>${subscription.plan.name}</strong>.</p>
             <p>Por favor actualiza tu método de pago para continuar disfrutando del servicio.</p>`,
    };

    await Promise.allSettled([
      this.emailService.sendEmail(config),
      this.notificationService.sendToUser(
        user.id,
        '❌ Pago fallido',
        'No hemos podido procesar el pago de tu suscripción. Actualiza tu método de pago.'
      ),
    ]);
  }
}
