// services/stripe.processor.ts
//
// Implementación de PaymentProcessor usando Stripe v22.
// Modelo B: tu sistema gestiona el ciclo de vida de las suscripciones,
// Stripe actúa solo como pasarela de cobro.

import Stripe from 'stripe';

import {
  ChargeParams,
  ChargeResult,
  ClientTokenResult,
  CreateVaultCustomerParams,
  DeletePaymentMethodResult,
  GenerateClientTokenParams,
  PaymentProcessor,
  ProcessorWebhookEvent,
  RefundParams,
  RefundResult,
  TokenizeCardParams,
  TokenizeCardResult,
  VaultCustomerResult,
  VaultPaymentMethodParams,
  VaultPaymentMethodResult,
} from './payment-processor.interface';

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  connectWebhookSecret?: string;
}

export class StripeProcessor implements PaymentProcessor {
  private readonly stripe: InstanceType<typeof Stripe>;
  private readonly webhookSecret: string;
  private readonly connectWebhookSecret?: string;

  constructor(config: StripeConfig) {
    this.stripe = new Stripe(config.secretKey);
    this.webhookSecret = config.webhookSecret;
    this.connectWebhookSecret = config.connectWebhookSecret;
  }

  // ── Charge ─────────────────────────────────────────────────────────────────

  public async charge(params: ChargeParams): Promise<ChargeResult> {
    try {
      const intentParams = {
        amount: params.amount,
        currency: params.currency.toLowerCase(),
        customer: params.metadata?.stripeCustomerId,
        payment_method: params.token,
        confirm: true,
        off_session: true,
        description: params.description,
        metadata: params.metadata ?? {},
        ...(params.connectedAccountId && {
          application_fee_amount: params.applicationFeeAmount ?? 0,
          transfer_data: {
            destination: params.connectedAccountId,
          },
        }),
      };

      const options = params.idempotencyKey
        ? { idempotencyKey: params.idempotencyKey }
        : undefined;

      const intent = await this.stripe.paymentIntents.create(
        intentParams,
        options
      );

      if (intent.status === 'succeeded') {
        return {
          success: true,
          externalTransactionId: intent.id,
          rawResponse: {
            id: intent.id,
            status: intent.status,
            amount: intent.amount,
          },
        };
      }

      return {
        success: false,
        externalTransactionId: intent.id,
        errorMessage: `PaymentIntent status: ${intent.status}`,
        errorCode: intent.last_payment_error?.code ?? undefined,
        rawResponse: { id: intent.id, status: intent.status },
      };
    } catch (error: any) {
      console.error('[Stripe] charge error:', error?.message);
      return {
        success: false,
        errorMessage: error?.message ?? 'Stripe charge error',
        errorCode: error?.code,
        rawResponse: { error: error?.message },
      };
    }
  }

  // ── Refund ──────────────────────────────────────────────────────────────────

  public async refund(params: RefundParams): Promise<RefundResult> {
    try {
      const refund = await this.stripe.refunds.create(
        {
          payment_intent: params.externalTransactionId,
          ...(params.amount && { amount: params.amount }),
          reason: this.mapRefundReason(params.reason),
          metadata: { reason: params.reason ?? '' },
          // Cobros con transfer_data.destination (Stripe Connect) requieren
          // revertir explicitamente la transferencia hecha al admin, o el
          // dinero ya transferido no se recupera y el reembolso sale de tu cuenta.
          ...(params.reverseTransfer && { reverse_transfer: true }),
          ...(params.refundApplicationFee && {
            refund_application_fee: true,
          }),
        },
        params.idempotencyKey
          ? { idempotencyKey: params.idempotencyKey }
          : undefined
      );

      if (refund.status === 'succeeded' || refund.status === 'pending') {
        return {
          success: true,
          externalRefundId: refund.id,
          rawResponse: {
            id: refund.id,
            status: refund.status,
            amount: refund.amount,
          },
        };
      }

      return {
        success: false,
        errorMessage: `Refund status: ${refund.status}`,
        rawResponse: { id: refund.id, status: refund.status },
      };
    } catch (error: any) {
      console.error('[Stripe] refund error:', error?.message);
      return {
        success: false,
        errorMessage: error?.message ?? 'Stripe refund error',
        rawResponse: { error: error?.message },
      };
    }
  }

  // ── Client Token / SetupIntent ──────────────────────────────────────────────

  public async generateClientToken(
    params: GenerateClientTokenParams
  ): Promise<ClientTokenResult> {
    const setupIntentParams = {
      ...(params.processorCustomerId && {
        customer: params.processorCustomerId,
      }),
      payment_method_types: ['card'],
      usage: 'off_session' as const,
    };

    const options = params.connectedAccountId
      ? { stripeAccount: params.connectedAccountId }
      : undefined;

    const setupIntent = await this.stripe.setupIntents.create(
      setupIntentParams,
      options
    );

    return {
      clientToken: setupIntent.client_secret!,
      setupIntentId: setupIntent.id,
    };
  }

  // ── Vault — Customer ────────────────────────────────────────────────────────

  public async createVaultCustomer(
    params: CreateVaultCustomerParams
  ): Promise<VaultCustomerResult> {
    try {
      const options = params.connectedAccountId
        ? { stripeAccount: params.connectedAccountId }
        : undefined;

      const customer = await this.stripe.customers.create(
        {
          email: params.email,
          name:
            params.firstName && params.lastName
              ? `${params.firstName} ${params.lastName}`
              : undefined,
          phone: params.phone,
          metadata: { internalCustomerId: params.externalId },
        },
        options
      );

      return {
        success: true,
        processorCustomerId: customer.id,
      };
    } catch (error: any) {
      console.error('[Stripe] createVaultCustomer error:', error?.message);
      return { success: false, errorMessage: error?.message };
    }
  }

  // ── Vault — Payment Method ──────────────────────────────────────────────────

  public async vaultPaymentMethod(
    params: VaultPaymentMethodParams
  ): Promise<VaultPaymentMethodResult> {
    try {
      const options = params.connectedAccountId
        ? { stripeAccount: params.connectedAccountId }
        : undefined;

      // Adjuntar el PaymentMethod al Customer
      // Si hay connectedAccountId, tanto el pm como el Customer
      // deben existir en esa cuenta conectada
      const pm = await this.stripe.paymentMethods.attach(
        params.nonce,
        { customer: params.processorCustomerId },
        options
      );

      if (params.verifyCard) {
        const si = await this.stripe.setupIntents.create(
          {
            customer: params.processorCustomerId,
            payment_method: pm.id,
            confirm: true,
            usage: 'off_session',
          },
          options
        );

        if (si.status !== 'succeeded') {
          await this.stripe.paymentMethods
            .detach(pm.id, undefined, options)
            .catch(() => {});
          return {
            success: false,
            errorMessage: `Card verification failed: SetupIntent status ${si.status}`,
          };
        }
      }

      if (params.makeDefault) {
        await this.stripe.customers.update(
          params.processorCustomerId,
          { invoice_settings: { default_payment_method: pm.id } },
          options
        );
      }

      const card = pm.card;

      return {
        success: true,
        paymentMethodToken: pm.id,
        brand: card?.brand ?? undefined,
        last4: card?.last4 ?? undefined,
        expiryMonth: card?.exp_month ?? undefined,
        expiryYear: card?.exp_year ?? undefined,
        fingerprint: card?.fingerprint ?? undefined,
        country: card?.country ?? undefined,
      };
    } catch (error: any) {
      console.error('[Stripe] vaultPaymentMethod error:', error?.message);
      return { success: false, errorMessage: error?.message };
    }
  }

  // ── Tokenize Card ───────────────────────────────────────────────────────────

  public async tokenizeCard(
    params: TokenizeCardParams
  ): Promise<TokenizeCardResult> {
    try {
      const token = await this.stripe.tokens.create({
        card: {
          number: params.cardNumber,
          exp_month: params.expirationMonth,
          exp_year: params.expirationYear,
          cvc: params.cvv,
          name: params.cardholderName,
          address_zip: params.billingAddress?.postalCode,
          address_country: params.billingAddress?.countryCode,
        },
      });

      const card = token.card;

      return {
        success: true,
        nonce: token.id,
        brand: card?.brand ?? undefined,
        last4: card?.last4 ?? undefined,
        expiryMonth: card?.exp_month ?? undefined,
        expiryYear: card?.exp_year ?? undefined,
      };
    } catch (error: any) {
      console.error('[Stripe] tokenizeCard error:', error?.message);
      return {
        success: false,
        errorMessage: error?.message ?? 'Card tokenization failed',
      };
    }
  }

  // ── Delete Payment Method ───────────────────────────────────────────────────

  public async deleteVaultPaymentMethod(
    paymentMethodToken: string
  ): Promise<DeletePaymentMethodResult> {
    try {
      await this.stripe.paymentMethods.detach(paymentMethodToken);
      return { success: true };
    } catch (error: any) {
      console.error('[Stripe] deleteVaultPaymentMethod error:', error?.message);
      return { success: false, errorMessage: error?.message };
    }
  }

  // ── Webhook ─────────────────────────────────────────────────────────────────

  public async parseWebhookEvent(
    payload: string | Buffer,
    signature: string
  ): Promise<ProcessorWebhookEvent | null> {
    let event: ReturnType<typeof this.stripe.webhooks.constructEvent>;

    try {
      try {
        event = this.stripe.webhooks.constructEvent(
          payload,
          signature,
          this.connectWebhookSecret ?? this.webhookSecret
        );
      } catch {
        event = this.stripe.webhooks.constructEvent(
          payload,
          signature,
          this.webhookSecret
        );
      }
    } catch (error: any) {
      console.error(
        '[Stripe] webhook signature verification failed:',
        error?.message
      );
      return null;
    }

    return this.normalizeEvent(event);
  }

  // ── Privados ────────────────────────────────────────────────────────────────

  private normalizeEvent(
    event: ReturnType<typeof this.stripe.webhooks.constructEvent>
  ): ProcessorWebhookEvent {
    const raw = event.data.object as Record<string, any>;
    const connectedAccountId = (event as any).account ?? undefined;

    switch (event.type) {
      case 'payment_intent.succeeded':
        return {
          type: 'payment_succeeded',
          externalTransactionId: raw.id,
          processorCustomerId: raw.customer ?? undefined,
          amount: raw.amount,
          currency: raw.currency,
          connectedAccountId,
          raw,
        };

      case 'payment_intent.payment_failed':
        return {
          type: 'payment_failed',
          externalTransactionId: raw.id,
          processorCustomerId: raw.customer ?? undefined,
          amount: raw.amount,
          currency: raw.currency,
          errorMessage: raw.last_payment_error?.message ?? 'Payment failed',
          connectedAccountId,
          raw,
        };

      case 'payment_method.automatically_updated':
        return {
          type: 'payment_method_expired',
          paymentMethodToken: raw.id,
          processorCustomerId: raw.customer ?? undefined,
          connectedAccountId,
          raw,
        };

      case 'charge.dispute.created':
        return {
          type: 'dispute_opened',
          externalTransactionId: raw.payment_intent ?? undefined,
          amount: raw.amount,
          currency: raw.currency,
          connectedAccountId,
          raw,
        };

      case 'charge.dispute.closed':
        return {
          type: raw.status === 'won' ? 'dispute_won' : 'dispute_lost',
          externalTransactionId: raw.payment_intent ?? undefined,
          amount: raw.amount,
          currency: raw.currency,
          connectedAccountId,
          raw,
        };

      case 'account.updated':
        return {
          type: 'account_updated',
          connectedAccountId: (event as any).account ?? raw.id,
          raw,
        };

      default:
        return { type: 'unknown', connectedAccountId, raw };
    }
  }

  private mapRefundReason(
    reason?: string
  ): 'duplicate' | 'fraudulent' | 'requested_by_customer' | undefined {
    if (!reason) return undefined;
    const r = reason.toLowerCase();
    if (r.includes('fraud') || r.includes('fraude')) return 'fraudulent';
    if (r.includes('duplicate') || r.includes('duplicado')) return 'duplicate';
    return 'requested_by_customer';
  }
}
