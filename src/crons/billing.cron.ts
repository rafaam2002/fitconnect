// src/crons/billing.cron.ts

import { MikroORM } from '@mikro-orm/core';

import { PaymentMethod, PaymentMethodStatus } from '../entities/PaymentMethod';
import { Subscription, SubscriptionStatus } from '../entities/Subscription';
import { NotificationService } from '../services/notification.service';
import { PaymentProcessor } from '../services/payment-processor.interface';
import { SubscriptionService } from '../services/subscription.service';

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
  scheduleDailyAt('02:00', 'processBillingCycle', async () => {
    const em = orm.em.fork();
    const service = new SubscriptionService(em, paymentProcessor);
    await service.processBillingCycle();
  });

  // ── Notificaciones de expiración ────────────────────────────────
  // Cada día a las 10:00 UTC
  // Avisa a los usuarios cuya suscripción vence mañana.
  scheduleDailyAt('10:00', 'notifyExpiringSubscriptions', async () => {
    const em = orm.em.fork();
    const service = new SubscriptionService(em, paymentProcessor);
    await service.notifyExpiringSubscriptions();
  });

  // ── Tarjetas expiradas ───────────────────────────────────────────
  // Cada día a las 03:00 UTC
  // Marca como EXPIRED las tarjetas cuya fecha de caducidad ya pasó
  // y notifica a los usuarios con suscripciones activas afectadas.
  // eslint-disable-next-line no-secrets/no-secrets
  scheduleDailyAt('03:00', 'markExpiredPaymentMethods', async () => {
    const em = orm.em.fork();
    await markExpiredPaymentMethods(em);
  });
}

// ─────────────────────────────────────────────────────────────────────
// IMPLEMENTACIÓN INTERNA
// ─────────────────────────────────────────────────────────────────────

/**
 * Planifica una función para que se ejecute cada día a una hora fija (UTC).
 * Calcula el ms hasta el próximo disparo y usa setInterval de 24h.
 */
function scheduleDailyAt(
  time: string, // "HH:MM"
  label: string,
  task: () => Promise<void>
): void {
  const msUntilFirst = msUntilNextUtc(time);

  console.log(
    `[CRON] "${label}" scheduled — first run in ${formatMs(msUntilFirst)} (daily at ${time} UTC)`
  );

  // Primer disparo exacto
  setTimeout(() => {
    runSafely(label, task);
    // A partir de ahí, cada 24 horas
    setInterval(() => runSafely(label, task), 24 * 60 * 60 * 1000);
  }, msUntilFirst);
}

/**
 * Envuelve la tarea en try/catch para que un error no tumbe el proceso.
 */
async function runSafely(
  label: string,
  task: () => Promise<void>
): Promise<void> {
  console.log(`[CRON] "${label}" — starting at ${new Date().toISOString()}`);
  try {
    await task();
    console.log(`[CRON] "${label}" — completed`);
  } catch (error: any) {
    console.error(`[CRON] "${label}" — failed:`, error?.message ?? error);
  }
}

/**
 * Calcula los milisegundos hasta la próxima ocurrencia de HH:MM en UTC.
 */
function msUntilNextUtc(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();

  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hours,
      minutes,
      0,
      0
    )
  );

  // Si ya pasó hoy, programar para mañana
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next.getTime() - now.getTime();
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}h ${m}m ${s}s`;
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
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // getMonth() es 0-indexed

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
