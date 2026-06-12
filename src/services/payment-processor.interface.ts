/**
 * payment-processor.interface.ts
 *
 * Contrato que debe implementar cualquier pasarela de pago externa.
 * La aplicación solo habla con esta interfaz — el procesador concreto
 * (Redsys, Braintree, Adyen…) se inyecta en BaseService o en cada
 * servicio que lo necesite.
 *
 * Para cambiar de procesador en el futuro basta con crear una nueva
 * clase que implemente PaymentProcessor y actualizar la inyección.
 */

export interface ChargeParams {
  /** Importe en centavos */
  amount: number;
  currency: string;
  /** Token de tarjeta guardado previamente (card-on-file) */
  token: string;
  description?: string;
  metadata?: Record<string, string>;
  /** Clave idempotente para evitar cobros dobles */
  idempotencyKey?: string;
}

export interface ChargeResult {
  success: boolean;
  /** ID de la operación en el procesador externo */
  externalTransactionId?: string;
  /** Mensaje de error cuando success = false */
  errorMessage?: string;
  /** Código de error normalizado del procesador */
  errorCode?: string;
  rawResponse?: Record<string, any>;
}

export interface RefundParams {
  /** ID de la transacción original en el procesador externo */
  externalTransactionId: string;
  /** Importe a devolver en centavos. Si se omite se reembolsa el total */
  amount?: number;
  reason?: string;
  idempotencyKey?: string;
}

export interface RefundResult {
  success: boolean;
  externalRefundId?: string;
  errorMessage?: string;
  rawResponse?: Record<string, any>;
}

export interface TokenizeCardParams {
  /** Número de tarjeta — solo se usa en entornos PCI o en el servidor del procesador */
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  cardholderName?: string;
}

export interface TokenizeCardResult {
  success: boolean;
  /** Token opaco que representa la tarjeta en el procesador */
  token?: string;
  /** Fingerprint para deduplicación */
  fingerprint?: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  country?: string;
  errorMessage?: string;
}

export interface PaymentProcessor {
  /**
   * Ejecuta un cobro usando un token de tarjeta previamente almacenado.
   */
  charge(params: ChargeParams): Promise<ChargeResult>;

  /**
   * Devuelve un pago parcial o total.
   */
  refund(params: RefundParams): Promise<RefundResult>;

  /**
   * Tokeniza una tarjeta nueva y devuelve el token seguro para almacenar.
   * En flujos con redirect (Redsys) este paso lo hace el procesador directamente
   * y devuelve el token al webhook — en ese caso no se usa este método.
   */
  tokenizeCard?(params: TokenizeCardParams): Promise<TokenizeCardResult>;
}
