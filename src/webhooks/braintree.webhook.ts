import { MikroORM } from '@mikro-orm/core';
import { Request, Response, Router } from 'express';

import { PaymentMethod, PaymentMethodStatus } from '../entities/PaymentMethod';
import { Transaction, TransactionStatus } from '../entities/Transaction';
import { BraintreeProcessor } from '../services/braintree.processor';

/**
 * braintree.webhook.ts
 *
 * Endpoint Express que Braintree llama server-to-server para notificar
 * cambios de estado en transacciones, suscripciones y métodos de pago.
 *
 * A diferencia de Redsys, los webhooks de Braintree están firmados con HMAC
 * y el SDK los verifica automáticamente en parseWebhook().
 *
 * Rutas:
 *   POST /webhooks/braintree   ← todas las notificaciones de Braintree
 *
 * Configuración en el panel de Braintree:
 *   Settings → Webhooks → Add Webhook
 *   URL: https://api.tudominio.com/webhooks/braintree
 *   Eventos recomendados:
 *     - Transaction Settled
 *     - Transaction Settlement Declined
 *     - Payment Method Revoked by Customer (PayPal)
 *     - Check (para verificar que el endpoint responde)
 */
export function createBraintreeWebhookRouter(
  orm: MikroORM,
  braintree: BraintreeProcessor
): Router {
  const router = Router();

  router.post('/webhooks/braintree', async (req: Request, res: Response) => {
    // Responder 200 inmediatamente para que Braintree no reintente
    res.status(200).send();

    const em = orm.em.fork();
    const btSignature = req.body.bt_signature as string;
    const btPayload = req.body.bt_payload as string;

    if (!btSignature || !btPayload) {
      console.warn('[Braintree webhook] Missing signature or payload');
      return;
    }

    // Verificar firma HMAC y parsear la notificación
    const notification = await braintree.parseWebhook(btSignature, btPayload);

    if (!notification) {
      console.warn('[Braintree webhook] Invalid signature — ignoring');
      return;
    }

    console.log('[Braintree webhook]', {
      kind: notification.kind,
      timestamp: notification.timestamp,
    });

    try {
      switch (notification.kind) {
        // ── Transacción liquidada exitosamente ─────────────────────────
        case 'transaction_settled':
          await handleTransactionSettled(em, notification.subject?.transaction);
          break;

        // ── Liquidación rechazada por el banco ─────────────────────────
        case 'transaction_settlement_declined':
          await handleTransactionSettlementDeclined(
            em,
            notification.subject?.transaction
          );
          break;

        // ── El cliente revocó el método de pago desde PayPal ──────────
        case 'payment_method_revoked_by_customer':
          await handlePaymentMethodRevoked(
            em,
            notification.subject?.revokedPaymentMethodMetadata?.token
          );
          break;

        // ── Webhook de verificación (ping desde el panel) ──────────────
        case 'check':
          console.log(
            '[Braintree webhook] Check notification received — endpoint is alive'
          );
          break;

        default:
          console.log(
            `[Braintree webhook] Unhandled notification kind: ${notification.kind}`
          );
      }
    } catch (error: any) {
      console.error('[Braintree webhook] Processing error:', error?.message);
    }
  });

  return router;
}

// ─────────────────────────────────────────────
// HANDLERS INTERNOS
// ─────────────────────────────────────────────

/**
 * La transacción fue liquidada por el banco.
 * En la mayoría de casos ya la tenemos como SUCCEEDED desde el charge síncrono,
 * pero actualizamos por si el estado era aún PENDING.
 */
async function handleTransactionSettled(em: any, btTx: any): Promise<void> {
  if (!btTx?.id) return;

  const transaction = await em.findOne(Transaction, {
    externalTransactionId: btTx.id,
  });

  if (!transaction) {
    console.warn(`[Braintree webhook] Transaction not found: ${btTx.id}`);
    return;
  }

  if (transaction.status !== TransactionStatus.SUCCEEDED) {
    transaction.status = TransactionStatus.SUCCEEDED;
    await em.flush();
    console.log(
      `[Braintree webhook] Transaction ${btTx.id} marked as SUCCEEDED`
    );
  }
}

/**
 * La liquidación fue rechazada — el dinero no se cobró realmente.
 * Marcamos la transacción como fallida para que el sistema de dunning actúe.
 */
async function handleTransactionSettlementDeclined(
  em: any,
  btTx: any
): Promise<void> {
  if (!btTx?.id) return;

  const transaction = await em.findOne(Transaction, {
    externalTransactionId: btTx.id,
  });

  if (!transaction) {
    console.warn(
      `[Braintree webhook] Transaction not found for settlement decline: ${btTx.id}`
    );
    return;
  }

  transaction.status = TransactionStatus.FAILED;
  transaction.failureReason =
    btTx.processorSettlementResponseText ?? 'Settlement declined';
  await em.flush();

  console.warn(
    `[Braintree webhook] Settlement declined for transaction ${btTx.id}: ${transaction.failureReason}`
  );
}

/**
 * El cliente revocó el método de pago desde su cuenta PayPal.
 * Lo marcamos como inactivo para que no se use en futuros cobros.
 */
async function handlePaymentMethodRevoked(
  em: any,
  paymentMethodToken: string | undefined
): Promise<void> {
  if (!paymentMethodToken) return;

  const paymentMethod = await em.findOne(PaymentMethod, {
    externalToken: paymentMethodToken,
  });

  if (!paymentMethod) {
    console.warn(
      `[Braintree webhook] PaymentMethod not found for token: ${paymentMethodToken}`
    );
    return;
  }

  paymentMethod.status = PaymentMethodStatus.INACTIVE;
  paymentMethod.isDefault = false;
  await em.flush();

  console.log(
    `[Braintree webhook] PaymentMethod ${paymentMethod.id} revoked by customer`
  );
}
