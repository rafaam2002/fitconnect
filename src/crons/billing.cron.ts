// src/crons/billing.cron.ts

import { MikroORM } from '@mikro-orm/core';
import moment from 'moment';
import cron from 'node-cron';

import { PaymentMethod, PaymentMethodStatus } from '../entities/PaymentMethod';
import { Subscription, SubscriptionStatus } from '../entities/Subscription';
import { NotificationService } from '../services/notification.service';
import { PaymentProcessor } from '../services/payment-processor.interface';
import { SubscriptionService } from '../services/subscription.service';
import { createRetryingEntityManager } from '../utils/orm-retry';

/**
 * Registra todos los CRON jobs del módulo de billing.
 * Llamar a esta función una sola vez al arrancar la aplicación,
 * después de que MikroORM esté inicializado.
 *
 * Uso:
 *   import { registerBillingCrons } from './crons/billing.cron';
 *   registerBillingCrons(orm, paymentProcessor);
 */
export function registerBillingCrons(
  orm: MikroORM,
  paymentProcessor: PaymentProcessor
): void {
  // ── Ciclo de facturación ─────────────────────────────────────────
  // Cada día a las 02:00 UTC
  // Cobra renovaciones vencidas, transiciona trials expirados
  // y ejecuta cancelaciones diferidas.
  cron.schedule(
    '0 2 * * *',
    () =>
      runSafely('processBillingCycle', async () => {
        const em = createRetryingEntityManager(orm, true);
        const service = new SubscriptionService(em, paymentProcessor);
        await service.processBillingCycle();
      }),
    { timezone: 'UTC' }
  );

  // ── Notificaciones de expiración ────────────────────────────────
  // Cada día a las 10:00 UTC
  // Avisa a los usuarios cuya suscripción vence mañana.
  cron.schedule(
    '0 10 * * *',
    () =>
      runSafely('notifyExpiringSubscriptions', async () => {
        const em = createRetryingEntityManager(orm, true);
        const service = new SubscriptionService(em, paymentProcessor);
        await service.notifyExpiringSubscriptions();
      }),
    { timezone: 'UTC' }
  );

  // ── Tarjetas expiradas ───────────────────────────────────────────
  // Cada día a las 03:00 UTC
  // Marca como EXPIRED las tarjetas cuya fecha de caducidad ya pasó
  // y notifica a los usuarios con suscripciones activas afectadas.
  cron.schedule(
    '0 3 * * *',
    () =>
      // eslint-disable-next-line no-secrets/no-secrets
      runSafely('markExpiredPaymentMethods', async () => {
        const em = createRetryingEntityManager(orm, true);
        await markExpiredPaymentMethods(em);
      }),
    { timezone: 'UTC' }
  );
}

// ─────────────────────────────────────────────────────────────────────
// IMPLEMENTACIÓN INTERNA
// ─────────────────────────────────────────────────────────────────────

/**
 * Envuelve la tarea en try/catch para que un error no tumbe el proceso.
 */
async function runSafely(
  label: string,
  task: () => Promise<void>
): Promise<void> {
  console.log(`[CRON] "${label}" — starting at ${moment().toISOString()}`);
  try {
    await task();
    console.log(`[CRON] "${label}" — completed`);
  } catch (error: any) {
    console.error(`[CRON] "${label}" — failed:`, error?.message ?? error);
  }
}

/**
 * Marca como EXPIRED los PaymentMethods cuya tarjeta ya ha vencido
 * y notifica a los usuarios que tienen suscripciones activas de pago
 * usando esa tarjeta como método por defecto.
 *
 * Solo actúa sobre los que siguen en estado ACTIVE para no pisar
 * los que el procesador ya marcó por webhook.
 *
 * Planes gratuitos (amount = 0) se ignoran — no necesitan método de pago.
 */
async function markExpiredPaymentMethods(em: any): Promise<void> {
  const now = moment();
  const currentYear = now.year();
  const currentMonth = now.month() + 1; // month() es 0-indexed

  // Una tarjeta expira cuando su año ya pasó,
  // o cuando es el año actual pero el mes ya pasó.
  const expired = await em.find(PaymentMethod, {
    status: PaymentMethodStatus.ACTIVE,
    $or: [
      { expiryYear: { $lt: currentYear } },
      {
        expiryYear: currentYear,
        expiryMonth: { $lt: currentMonth },
      },
    ],
  });

  if (!expired.length) {
    console.log('[CRON] No expired payment methods found');
    return;
  }

  const notificationService = new NotificationService(em);

  for (const pm of expired) {
    pm.status = PaymentMethodStatus.EXPIRED;
    pm.isDefault = false;
  }

  await em.flush();
  console.log(`[CRON] Marked ${expired.length} payment methods as expired`);

  // Buscar suscripciones activas de pago que usen alguna de las tarjetas expiradas
  // Solo suscripciones con planes de pago (amount > 0) — las gratuitas no necesitan tarjeta
  const expiredIds = expired.map((pm: PaymentMethod) => pm.id);

  const affectedSubscriptions = await em.find(
    Subscription,
    {
      defaultPaymentMethod: { $in: expiredIds },
      status: {
        $in: [
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.TRIALING,
          SubscriptionStatus.PAST_DUE,
        ],
      },
      plan: { amount: { $gt: 0 } },
    },
    { populate: ['user', 'plan', 'user.pushTokens'] }
  );

  if (!affectedSubscriptions.length) {
    console.log(
      '[CRON] No active paid subscriptions affected by expired payment methods'
    );
    return;
  }

  console.log(
    `[CRON] Notifying ${affectedSubscriptions.length} users about expired payment method`
  );

  // Notificar a cada usuario afectado
  await Promise.allSettled(
    affectedSubscriptions.map(async (sub: Subscription) => {
      try {
        await notificationService.sendToUser(
          sub.user.id,
          '💳 Tarjeta caducada',
          `Tu tarjeta asociada al plan "${sub.plan.name}" ha caducado. Actualiza tu método de pago para evitar interrupciones en el servicio.`
        );
      } catch (err: any) {
        console.error(
          `[CRON] Failed to notify user ${sub.user.id} about expired payment method:`,
          err?.message
        );
      }
    })
  );
}
