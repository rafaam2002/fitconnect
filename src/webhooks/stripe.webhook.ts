// webhooks/stripe.webhook.ts
//
// Endpoint Express que Stripe llama server-to-server para notificar eventos.
// Los eventos de Stripe Connect (pagos de clientes a empresas) también
// llegan aquí con event.account = acct_xxx de la empresa.
//
// Rutas:
//   POST /webhooks/stripe         ← eventos de tu cuenta master
//   POST /webhooks/stripe/connect ← eventos de cuentas conectadas (Stripe Connect)
//
// Configuración en el panel de Stripe:
//   Developers → Webhooks → Add endpoint
//   URL master:   https://api.tudominio.com/webhooks/stripe
//   URL connect:  https://api.tudominio.com/webhooks/stripe/connect
//
//   Eventos recomendados (master):
//     payment_intent.succeeded
//     payment_intent.payment_failed
//     payment_method.automatically_updated
//     charge.dispute.created / charge.dispute.closed
//
//   Eventos recomendados (connect):
//     account.updated  (para saber cuándo la cuenta del admin está activa)
//     payment_intent.succeeded  (pagos de clientes a empresas)
//     payment_intent.payment_failed

import { MikroORM } from '@mikro-orm/core';
import { Request, Response, Router } from 'express';
import Stripe from 'stripe';

import { Company } from '../entities/Company';
import { Customer } from '../entities/Customer';
import { PaymentMethod, PaymentMethodStatus } from '../entities/PaymentMethod';
import { Transaction, TransactionStatus } from '../entities/Transaction';
import { ProcessorWebhookEvent } from '../services/payment-processor.interface';
import { StripeProcessor } from '../services/stripe.processor';

export function createStripeWebhookRouter(
  orm: MikroORM,
  stripe: StripeProcessor
): Router {
  const router = Router();

  // ── POST /webhooks/stripe ──────────────────────────────────────────────────
  // Eventos de tu cuenta master (suscripciones de admins, etc.)
  router.post('/webhooks/stripe', async (req: Request, res: Response) => {
    res.status(200).send(); // responder inmediatamente

    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      console.warn('[Stripe webhook] Missing stripe-signature header');
      return;
    }

    const event = await stripe.parseWebhookEvent(req.body, signature);
    if (!event) {
      console.warn('[Stripe webhook] Invalid signature — ignoring');
      return;
    }

    console.log('[Stripe webhook master]', { type: event.type });
    const em = orm.em.fork();

    try {
      await handleEvent(em, event);
    } catch (error: any) {
      console.error(
        '[Stripe webhook master] Processing error:',
        error?.message
      );
    }
  });

  // ── POST /webhooks/stripe/connect ──────────────────────────────────────────
  // Eventos de cuentas conectadas (pagos de clientes a empresas)
  router.post(
    '/webhooks/stripe/connect',
    async (req: Request, res: Response) => {
      res.status(200).send();

      const signature = req.headers['stripe-signature'] as string;
      if (!signature) {
        console.warn(
          '[Stripe Connect webhook] Missing stripe-signature header'
        );
        return;
      }

      const event = await stripe.parseWebhookEvent(req.body, signature);
      if (!event) {
        console.warn('[Stripe Connect webhook] Invalid signature — ignoring');
        return;
      }

      console.log('[Stripe Connect webhook]', {
        type: event.type,
        account: event.connectedAccountId,
      });

      const em = orm.em.fork();

      try {
        await handleEvent(em, event);
      } catch (error: any) {
        console.error(
          '[Stripe Connect webhook] Processing error:',
          error?.message
        );
      }
    }
  );

  return router;
}

// ── Handler centralizado ───────────────────────────────────────────────────────

async function handleEvent(
  em: any,
  event: ProcessorWebhookEvent
): Promise<void> {
  switch (event.type) {
    case 'payment_succeeded':
      await handleSetupIntentSucceeded(em, event);
      break;

    case 'payment_failed':
      await handlePaymentFailed(em, event);
      break;

    case 'payment_method_expired':
      await handlePaymentMethodExpired(em, event);
      break;

    case 'dispute_opened':
      await handleDisputeOpened(em, event);
      break;

    case 'dispute_won':
    case 'dispute_lost':
      await handleDisputeClosed(em, event);
      break;

    case 'account_updated':
      await handleAccountUpdated(em, event);
      break;

    case 'unknown':
    default:
      console.log(
        `[Stripe webhook] Unhandled event type — raw:`,
        event.raw?.type
      );
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * Pago completado.
 * En el Modelo B (tu sistema gestiona billing) normalmente ya tienes la
 * transacción como SUCCEEDED desde el charge síncrono.
 * Aquí actualizamos por si había quedado en PENDING.
 */
async function handleSetupIntentSucceeded(
  em: any,
  event: ProcessorWebhookEvent
): Promise<void> {
  const raw = event.raw as any;
  const pmId = raw.payment_method;
  const customerId = raw.customer;

  if (!pmId || !customerId) return;

  // Buscar el Customer local por processorCustomerId
  const customer = await em.findOne(Customer, {
    $or: [
      { metadata: { processorCustomerId: customerId } },
      // También buscar por clave de cuenta conectada
    ],
  });

  if (!customer) return;

  // Verificar que no existe ya
  const existing = await em.findOne(PaymentMethod, { externalToken: pmId });
  if (existing) return;

  // Obtener detalles del PM desde Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const pm = await stripe.paymentMethods.retrieve(
    pmId,
    undefined,
    event.connectedAccountId
      ? { stripeAccount: event.connectedAccountId }
      : undefined
  );

  em.create(PaymentMethod, {
    customer,
    externalToken: pm.id,
    type: 'card' as any,
    status: PaymentMethodStatus.ACTIVE,
    brand: pm.card?.brand,
    last4: pm.card?.last4,
    expiryMonth: pm.card?.exp_month,
    expiryYear: pm.card?.exp_year,
    fingerprint: pm.card?.fingerprint ?? undefined,
    isDefault: false,
    metadata: event.connectedAccountId
      ? { connectedAccountId: event.connectedAccountId }
      : {},
  });

  await em.flush();
  console.log(`[Webhook] PaymentMethod ${pmId} synced to DB`);
}

/**
 * Pago fallido.
 * Marcamos la transacción como fallida para que el sistema de dunning actúe
 * en el siguiente ciclo del CRON.
 */
async function handlePaymentFailed(
  em: any,
  event: ProcessorWebhookEvent
): Promise<void> {
  if (!event.externalTransactionId) return;

  const transaction = await em.findOne(Transaction, {
    externalTransactionId: event.externalTransactionId,
  });

  if (!transaction) {
    console.warn(
      `[Stripe webhook] Transaction not found for failed payment: ${event.externalTransactionId}`
    );
    return;
  }

  transaction.status = TransactionStatus.FAILED;
  transaction.failureReason = event.errorMessage ?? 'Payment failed';
  await em.flush();

  console.warn(
    `[Stripe webhook] Payment failed for transaction ${event.externalTransactionId}: ${transaction.failureReason}`
  );
}

/**
 * Stripe actualizó automáticamente un m de pago (número de tarjeta renovado).
 * En la mayoría de casos es una actualización positiva — la tarjeta sigue activa.
 * Solo marcamos como expirado si el evento indica que ya no funciona.
 */
async function handlePaymentMethodExpired(
  em: any,
  event: ProcessorWebhookEvent
): Promise<void> {
  if (!event.paymentMethodToken) return;

  const paymentMethod = await em.findOne(PaymentMethod, {
    externalToken: event.paymentMethodToken,
  });

  if (!paymentMethod) {
    console.warn(
      `[Stripe webhook] PaymentMethod not found for token: ${event.paymentMethodToken}`
    );
    return;
  }

  paymentMethod.status = PaymentMethodStatus.EXPIRED;
  paymentMethod.isDefault = false;
  await em.flush();

  console.log(
    `[Stripe webhook] PaymentMethod ${paymentMethod.id} marked as EXPIRED`
  );
}

/**
 * Se abrió una disputa (chargeback).
 * Marcamos la transacción para revisión — no actuamos automáticamente.
 */
async function handleDisputeOpened(
  em: any,
  event: ProcessorWebhookEvent
): Promise<void> {
  if (!event.externalTransactionId) return;

  const transaction = await em.findOne(Transaction, {
    externalTransactionId: event.externalTransactionId,
  });

  if (!transaction) return;

  transaction.metadata = {
    ...transaction.metadata,
    dispute: {
      status: 'opened',
      openedAt: new Date().toISOString(),
      amount: event.amount,
    },
  };
  await em.flush();

  console.warn(
    `[Stripe webhook] Dispute opened for transaction ${event.externalTransactionId}`
  );
}

/**
 * Se cerró una disputa.
 * Si se ganó, restauramos el estado. Si se perdió, marcamos como refunded.
 */
async function handleDisputeClosed(
  em: any,
  event: ProcessorWebhookEvent
): Promise<void> {
  if (!event.externalTransactionId) return;

  const transaction = await em.findOne(Transaction, {
    externalTransactionId: event.externalTransactionId,
  });

  if (!transaction) return;

  const won = event.type === 'dispute_won';

  if (!won) {
    transaction.status = TransactionStatus.REFUNDED;
    transaction.amountRefunded = event.amount ?? transaction.amount;
  }

  transaction.metadata = {
    ...transaction.metadata,
    dispute: {
      ...transaction.metadata?.dispute,
      status: won ? 'won' : 'lost',
      closedAt: new Date().toISOString(),
    },
  };

  await em.flush();

  console.log(
    `[Stripe webhook] Dispute ${won ? 'WON' : 'LOST'} for transaction ${event.externalTransactionId}`
  );
}

/**
 * La cuenta Connect de una empresa fue actualizada.
 * Actualizamos el estado en la BD según si ya puede recibir cobros.
 */
async function handleAccountUpdated(
  em: any,
  event: ProcessorWebhookEvent
): Promise<void> {
  if (!event.connectedAccountId) return;

  const company = await em.findOne(Company, {
    stripeAccountId: event.connectedAccountId,
  });

  if (!company) {
    console.warn(
      `[Stripe Connect webhook] Company not found for account: ${event.connectedAccountId}`
    );
    return;
  }

  const raw = event.raw as any;
  const chargesEnabled = raw.charges_enabled ?? false;
  const payoutsEnabled = raw.payouts_enabled ?? false;

  company.stripeAccountStatus = chargesEnabled ? 'active' : 'restricted';
  await em.flush();

  console.log(
    `[Stripe Connect webhook] Account ${event.connectedAccountId} updated — ` +
      `charges: ${chargesEnabled}, payouts: ${payoutsEnabled}`
  );
}
