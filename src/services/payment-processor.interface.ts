/**
 * payment-processor.interface.ts
 *
 * Contrato que debe implementar cualquier pasarela de pago externa.
 * La aplicación solo habla con esta interfaz — el procesador concreto
 * (Stripe, Adyen, etc.) se inyecta en BaseService.
 *
 * Para cambiar de procesador basta con crear una nueva clase que implemente
 * PaymentProcessor y actualizar la inyección en index.ts.
 *
 * CONCEPTOS AGNÓSTICOS (mapeados a Stripe, la implementación actual):
 *   externalToken         → PaymentMethod.id (pm_xxx)
 *   externalTransactionId → PaymentIntent.id (pi_xxx)
 *   processorCustomerId   → Customer.id (cus_xxx)
 *   nonce                 → PaymentMethod.id obtenido via el SDK del frontend
 *
 * El interface se mantiene agnóstico a propósito por si en el futuro se
 * añade un segundo procesador (ej. para otra región), pero la única
 * implementación actual es StripeProcessor.
 */

// ── Charge ────────────────────────────────────────────────────────────────────

export interface ChargeParams {
  /** Importe en centavos */
  amount: number;
  currency: string;
  /** Token permanente del método de pago (externalToken en PaymentMethod) */
  token: string;
  description?: string;
  metadata?: Record<string, string>;
  /** Clave idempotente para evitar cobros dobles */
  idempotencyKey?: string;
  /**
   * ID de la cuenta conectada de la empresa (Stripe: acct_xxx).
   * Si se proporciona, el cobro se procesa en la cuenta de esa empresa.
   * Si se omite, el cobro va a tu cuenta master.
   */
  connectedAccountId?: string;
  /**
   * Tu comisión en centavos (Stripe: application_fee_amount).
   * Solo aplica cuando connectedAccountId está presente.
   */
  applicationFeeAmount?: number;
}

export interface ChargeResult {
  success: boolean;
  externalTransactionId?: string;
  errorMessage?: string;
  errorCode?: string;
  rawResponse?: Record<string, any>;
}

// ── Refund ────────────────────────────────────────────────────────────────────

export interface RefundParams {
  externalTransactionId: string;
  /** Importe en centavos. Si se omite se reembolsa el total */
  amount?: number;
  reason?: string;
  idempotencyKey?: string;
  /**
   * Si el cobro original se hizo con transfer_data.destination (Stripe Connect),
   * hay que indicar que tambien se revierta la transferencia hecha al admin.
   * Sin esto, el reembolso sale de tu cuenta master y el dinero transferido
   * al admin NO se recupera.
   */
  reverseTransfer?: boolean;
  /**
   * Si true, tambien te devuelve proporcionalmente tu application_fee_amount.
   * Normalmente debe ir junto con reverseTransfer.
   */
  refundApplicationFee?: boolean;
}

export interface RefundResult {
  success: boolean;
  externalRefundId?: string;
  errorMessage?: string;
  rawResponse?: Record<string, any>;
}

// ── Vault — Customer ──────────────────────────────────────────────────────────

export interface CreateVaultCustomerParams {
  externalId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  /**
   * Stripe Connect: si se especifica, el Customer se crea en la cuenta
   * de la empresa en lugar de en tu cuenta master.
   */
  connectedAccountId?: string;
}

export interface VaultCustomerResult {
  success: boolean;
  processorCustomerId?: string;
  errorMessage?: string;
}

// ── Vault — Payment Method ────────────────────────────────────────────────────

export interface VaultPaymentMethodParams {
  processorCustomerId: string;
  nonce: string;
  verifyCard?: boolean;
  makeDefault?: boolean;
  /**
   * Stripe Connect: si el PaymentMethod fue creado en la cuenta de una empresa
   * (acct_xxx), hay que adjuntarlo en esa misma cuenta.
   * El Customer también debe existir en esa cuenta.
   */
  connectedAccountId?: string;
}

export interface VaultPaymentMethodResult {
  success: boolean;
  paymentMethodToken?: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  fingerprint?: string;
  country?: string;
  errorMessage?: string;
}

// ── Tokenize Card (datos en crudo) ────────────────────────────────────────────
// Usado cuando el frontend envía los datos de la tarjeta directamente
// (ej: formulario propio en React Native sin SDK del procesador).
// El resultado es un nonce/token de un solo uso que luego se pasa a vaultPaymentMethod.

export interface TokenizeCardParams {
  cardNumber: string;
  expirationMonth: string;
  expirationYear: string;
  cvv: string;
  cardholderName?: string;
  billingAddress?: {
    postalCode?: string;
    countryCode?: string;
  };
}

export interface TokenizeCardResult {
  success: boolean;
  /** Nonce/token de un solo uso — pasar a vaultPaymentMethod como `nonce` */
  nonce?: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  errorMessage?: string;
}

// ── Client Token ──────────────────────────────────────────────────────────────

export interface GenerateClientTokenParams {
  processorCustomerId?: string;
  connectedAccountId?: string;
}

export interface ClientTokenResult {
  clientToken: string;
  setupIntentId?: string;
}

// ── Delete Payment Method ─────────────────────────────────────────────────────

export interface DeletePaymentMethodResult {
  success: boolean;
  errorMessage?: string;
}

// ── Confirmed SetupIntent (flujo PaymentSheet) ────────────────────────────────
//
// Cuando el frontend usa Stripe PaymentSheet con un SetupIntent generado por
// generateClientToken(), el SDK nativo confirma y vincula el PaymentMethod al
// Customer directamente en los servidores de Stripe — sin pasar por nuestro
// backend. Una vez el SDK confirma, solo necesitamos recuperar QUÉ
// PaymentMethod fue, para sincronizarlo en nuestra BD local. No hay ningún
// "nonce" que adjuntar porque Stripe ya hizo esa vinculación.

export interface GetConfirmedPaymentMethodParams {
  setupIntentId: string;
  connectedAccountId?: string;
}

export interface ConfirmedPaymentMethodResult {
  success: boolean;
  paymentMethodToken?: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  fingerprint?: string;
  country?: string;
  errorMessage?: string;
}

// ── Webhook normalizado ───────────────────────────────────────────────────────

export type ProcessorWebhookEventType =
  | 'payment_succeeded'
  | 'payment_failed'
  | 'payment_method_expired'
  | 'dispute_opened'
  | 'dispute_won'
  | 'dispute_lost'
  | 'account_updated'
  | 'unknown';

export interface ProcessorWebhookEvent {
  type: ProcessorWebhookEventType;
  externalTransactionId?: string;
  paymentMethodToken?: string;
  processorCustomerId?: string;
  amount?: number;
  currency?: string;
  errorMessage?: string;
  connectedAccountId?: string;
  raw: Record<string, any>;
}

// ── Interfaz principal ────────────────────────────────────────────────────────

export interface PaymentProcessor {
  charge(params: ChargeParams): Promise<ChargeResult>;
  refund(params: RefundParams): Promise<RefundResult>;
  generateClientToken(
    params: GenerateClientTokenParams
  ): Promise<ClientTokenResult>;
  createVaultCustomer(
    params: CreateVaultCustomerParams
  ): Promise<VaultCustomerResult>;
  vaultPaymentMethod(
    params: VaultPaymentMethodParams
  ): Promise<VaultPaymentMethodResult>;
  /**
   * Recupera el PaymentMethod que el SDK nativo (PaymentSheet) ya confirmó
   * y vinculó al Customer al cerrar un SetupIntent. No tokeniza ni vincula
   * nada nuevo — solo lee el resultado para sincronizarlo en BD local.
   */
  getConfirmedPaymentMethod(
    params: GetConfirmedPaymentMethodParams
  ): Promise<ConfirmedPaymentMethodResult>;
  deleteVaultPaymentMethod(
    paymentMethodToken: string
  ): Promise<DeletePaymentMethodResult>;
  parseWebhookEvent(
    payload: string | Buffer,
    signature: string
  ): Promise<ProcessorWebhookEvent | null>;
  /**
   * Tokeniza una tarjeta a partir de sus datos en crudo.
   * Devuelve un nonce/token de un solo uso para pasar a vaultPaymentMethod.
   * Útil cuando el frontend usa un formulario propio en lugar del SDK del procesador.
   *
   * Implementación actual (Stripe): crea un Token de tarjeta (tok_xxx)
   * via la API de Tokens (stripe.tokens.create()).
   */
  tokenizeCard(params: TokenizeCardParams): Promise<TokenizeCardResult>;
}
