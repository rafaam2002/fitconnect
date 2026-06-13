import braintree, {
  BraintreeGateway,
  Environment,
  Transaction as BraintreeTransaction,
  ValidatedResponse,
} from 'braintree';

import {
  ChargeParams,
  ChargeResult,
  RefundParams,
  RefundResult,
  PaymentProcessor,
} from './payment-processor.interface';

// ─────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────

export interface BraintreeConfig {
  merchantId: string;
  publicKey: string;
  privateKey: string;
  sandbox?: boolean;
}

/**
 * Resultado de la creación de un cliente en el Vault de Braintree.
 * El braintreeCustomerId se guarda en Customer.metadata.braintreeCustomerId.
 */
export interface VaultCustomerResult {
  success: boolean;
  braintreeCustomerId?: string;
  errorMessage?: string;
}

/**
 * Resultado de añadir un método de pago al Vault.
 * El paymentMethodToken se guarda como externalToken en PaymentMethod.
 */
export interface VaultPaymentMethodResult {
  success: boolean;
  /** Token permanente del método de pago en el Vault de Braintree */
  paymentMethodToken?: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  /** Unique number identifying a credit card — útil para deduplicación */
  uniqueNumberIdentifier?: string;
  country?: string;
  errorMessage?: string;
}

// ─────────────────────────────────────────────
// IMPLEMENTACIÓN
// ─────────────────────────────────────────────

/**
 * BraintreeProcessor
 *
 * Implementa PaymentProcessor usando el Vault de Braintree.
 *
 * DIFERENCIAS CLAVE CON REDSYS:
 * ──────────────────────────────
 * • No hay redirect al TPV — el frontend usa el Drop-in UI o Hosted Fields
 *   y devuelve un payment method nonce de un solo uso.
 * • El nonce llega al backend, que lo convierte en un paymentMethodToken
 *   permanente en el Vault. Ese token es el externalToken de tu PaymentMethod.
 * • Los cobros recurrentes usan ese token directamente sin intervención del usuario.
 * • Braintree gestiona sus propios Customer IDs — se guardan en Customer.metadata.
 *
 * FLUJO DE INCORPORACIÓN DE TARJETA (primer uso):
 * ─────────────────────────────────────────────────
 * 1. Frontend solicita un clientToken via query GraphQL `getBraintreeClientToken`
 * 2. Backend llama a gateway.clientToken.generate() y devuelve el token
 * 3. Frontend inicializa el Drop-in UI con ese clientToken
 * 4. Usuario introduce su tarjeta → Drop-in devuelve un nonce de un solo uso
 * 5. Frontend envía el nonce al backend via mutación `addPaymentMethodFromNonce`
 * 6. Backend llama a BraintreeProcessor.vaultPaymentMethod() → obtiene el token permanente
 * 7. Token se guarda como externalToken en PaymentMethod
 *
 * FLUJO DE COBRO RECURRENTE (CRON):
 * ───────────────────────────────────
 * 1. processBillingCycle() → TransactionService.createCharge()
 * 2. TransactionService → BraintreeProcessor.charge(externalToken)
 * 3. gateway.transaction.sale({ paymentMethodToken, transactionSource: 'recurring' })
 * 4. Braintree devuelve autorización o denegación síncronamente
 *
 * FLUJO DE DEVOLUCIÓN:
 * ─────────────────────
 * 1. TransactionService.refundTransaction() → BraintreeProcessor.refund()
 * 2. gateway.transaction.refund(braintreeTransactionId, amount)
 */
export class BraintreeProcessor implements PaymentProcessor {
  private readonly gateway: BraintreeGateway;
  private readonly config: BraintreeConfig;

  constructor(config: BraintreeConfig) {
    this.config = config;
    this.gateway = new BraintreeGateway({
      environment: config.sandbox
        ? Environment.Sandbox
        : Environment.Production,
      merchantId: config.merchantId,
      publicKey: config.publicKey,
      privateKey: config.privateKey,
    });
  }

  // ─────────────────────────────────────────────
  // CHARGE — Cobro con token almacenado en Vault
  // ─────────────────────────────────────────────

  /**
   * Ejecuta un cobro usando el paymentMethodToken guardado en el Vault.
   * No requiere intervención del usuario — apto para cobros recurrentes del CRON.
   *
   * El amount debe venir en centavos (igual que el resto del sistema),
   * pero Braintree espera el importe en formato decimal (ej: "9.99").
   * La conversión se hace internamente.
   */
  public async charge(params: ChargeParams): Promise<ChargeResult> {
    try {
      const result = await this.gateway.transaction.sale({
        amount: this.centsToDecimal(params.amount),
        paymentMethodToken: params.token,
        // Marca la transacción como iniciada por el comercio (MIT)
        // obligatorio para cobros recurrentes sin presencia del usuario
        transactionSource: 'recurring',
        options: {
          submitForSettlement: true, // cobrar inmediatamente, no solo autorizar
        },
        orderId: params.idempotencyKey?.slice(0, 255),
        customFields: params.metadata
          ? this.sanitizeCustomFields(params.metadata)
          : undefined,
      });

      if (result.success) {
        return {
          success: true,
          externalTransactionId: result.transaction.id,
          rawResponse: this.serializeTransaction(result.transaction),
        };
      }

      return {
        success: false,
        errorMessage: result.message,
        errorCode: result.transaction?.processorResponseCode,
        rawResponse: {
          message: result.message,
          errors: result.errors?.deepErrors(),
        },
      };
    } catch (error: any) {
      console.error('[Braintree] charge error:', error?.message);
      return {
        success: false,
        errorMessage: error?.message ?? 'Braintree connection error',
        rawResponse: { error: error?.message },
      };
    }
  }

  // ─────────────────────────────────────────────
  // REFUND — Devolución total o parcial
  // ─────────────────────────────────────────────

  /**
   * Devuelve una transacción parcial o totalmente.
   * externalTransactionId debe ser el ID de transacción de Braintree (bt_xxx).
   *
   * Si la transacción aún no se ha liquidado (settled) se hace un void automático.
   */
  public async refund(params: RefundParams): Promise<RefundResult> {
    try {
      // Primero verificamos el estado de la transacción original
      const original = await this.gateway.transaction.find(
        params.externalTransactionId
      );

      let result: ValidatedResponse<BraintreeTransaction>;

      if (
        original.status === 'submitted_for_settlement' ||
        original.status === 'authorized'
      ) {
        // La transacción no se ha liquidado aún — usar void en lugar de refund
        result = await this.gateway.transaction.void(
          params.externalTransactionId
        );
      } else {
        // Transacción ya liquidada — refund normal
        const refundAmount = params.amount
          ? this.centsToDecimal(params.amount)
          : undefined;

        result = await this.gateway.transaction.refund(
          params.externalTransactionId,
          refundAmount
        );
      }

      if (result.success) {
        return {
          success: true,
          externalRefundId: result.transaction.id,
          rawResponse: this.serializeTransaction(result.transaction),
        };
      }

      return {
        success: false,
        errorMessage: result.message,
        rawResponse: {
          message: result.message,
          errors: result.errors?.deepErrors(),
        },
      };
    } catch (error: any) {
      console.error('[Braintree] refund error:', error?.message);
      return {
        success: false,
        errorMessage: error?.message ?? 'Braintree refund error',
        rawResponse: { error: error?.message },
      };
    }
  }

  // ─────────────────────────────────────────────
  // VAULT — Gestión de clientes y métodos de pago
  // ─────────────────────────────────────────────

  /**
   * Genera un clientToken para inicializar el Drop-in UI en el frontend.
   * Si se pasa braintreeCustomerId, el Drop-in mostrará los métodos guardados.
   *
   * Este token expira en 24h y es de un solo uso.
   */
  public async generateClientToken(
    braintreeCustomerId?: string
  ): Promise<string> {
    const options: braintree.ClientTokenRequest = braintreeCustomerId
      ? { customerId: braintreeCustomerId }
      : {};

    const result = await this.gateway.clientToken.generate(options);
    return result.clientToken;
  }

  /**
   * Crea un cliente en el Vault de Braintree.
   * Se llama una vez al registrar al usuario (desde CustomerService).
   * El braintreeCustomerId resultante se guarda en Customer.metadata.braintreeCustomerId.
   */
  public async createVaultCustomer(params: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    externalId?: string; // tu Customer.id interno
  }): Promise<VaultCustomerResult> {
    try {
      const result = await this.gateway.customer.create({
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        phone: params.phone,
        id: params.externalId?.slice(0, 36), // Braintree acepta IDs custom de hasta 36 chars
      });

      if (result.success) {
        return {
          success: true,
          braintreeCustomerId: result.customer.id,
        };
      }

      return {
        success: false,
        errorMessage: result.message,
      };
    } catch (error: any) {
      console.error('[Braintree] createVaultCustomer error:', error?.message);
      return {
        success: false,
        errorMessage: error?.message,
      };
    }
  }

  /**
   * Convierte un nonce de un solo uso en un paymentMethodToken permanente en el Vault.
   *
   * El nonce lo genera el frontend con el Drop-in UI o Hosted Fields.
   * El token resultante es el externalToken que guardas en PaymentMethod.
   *
   * Si verifyCard=true (recomendado), Braintree ejecuta una autorización de $0
   * para verificar que la tarjeta es válida antes de guardarla.
   */
  public async vaultPaymentMethod(params: {
    braintreeCustomerId: string;
    nonce: string;
    verifyCard?: boolean;
    makeDefault?: boolean;
  }): Promise<VaultPaymentMethodResult> {
    try {
      const result = await this.gateway.paymentMethod.create({
        customerId: params.braintreeCustomerId,
        paymentMethodNonce: params.nonce,
        options: {
          verifyCard: params.verifyCard ?? true,
          makeDefault: params.makeDefault ?? false,
        },
      });

      if (result.success) {
        const pm = result.paymentMethod as any;

        return {
          success: true,
          paymentMethodToken: pm.token,
          brand: pm.cardType?.toLowerCase().replace(/\s/g, '_'),
          last4: pm.last4,
          expiryMonth: pm.expirationMonth
            ? parseInt(pm.expirationMonth, 10)
            : undefined,
          expiryYear: pm.expirationYear
            ? parseInt(pm.expirationYear, 10)
            : undefined,
          uniqueNumberIdentifier: pm.uniqueNumberIdentifier,
          country: pm.issuingBank ?? undefined,
        };
      }

      return {
        success: false,
        errorMessage: result.message,
      };
    } catch (error: any) {
      console.error('[Braintree] vaultPaymentMethod error:', error?.message);
      return {
        success: false,
        errorMessage: error?.message,
      };
    }
  }

  /**
   * Elimina un método de pago del Vault de Braintree.
   * Se llama al hacer removePaymentMethod en el backend.
   */
  public async deleteVaultPaymentMethod(
    paymentMethodToken: string
  ): Promise<{ success: boolean; errorMessage?: string }> {
    try {
      await this.gateway.paymentMethod.delete(paymentMethodToken);
      return { success: true };
    } catch (error: any) {
      console.error(
        '[Braintree] deleteVaultPaymentMethod error:',
        error?.message
      );
      return { success: false, errorMessage: error?.message };
    }
  }

  /**
   * Procesa el webhook de Braintree verificando la firma HMAC.
   * Devuelve el notification parseado o null si la firma es inválida.
   */
  public async parseWebhook(
    btSignature: string,
    btPayload: string
  ): Promise<braintree.WebhookNotification | null> {
    try {
      return await this.gateway.webhookNotification.parse(
        btSignature,
        btPayload
      );
    } catch (error: any) {
      console.error('[Braintree] webhook parse error:', error?.message);
      return null;
    }
  }

  // ─────────────────────────────────────────────
  // PRIVADOS
  // ─────────────────────────────────────────────

  /**
   * Convierte centavos (entero) a string decimal que espera Braintree.
   * Ej: 999 → "9.99", 1000 → "10.00"
   */
  private centsToDecimal(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  /**
   * Braintree solo acepta custom fields previamente registrados en el panel.
   * Filtramos los valores para asegurarnos de que son strings.
   */
  private sanitizeCustomFields(
    metadata: Record<string, string>
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(metadata)) {
      result[key] = String(value).slice(0, 255);
    }
    return result;
  }

  private serializeTransaction(tx: BraintreeTransaction): Record<string, any> {
    return {
      id: tx.id,
      status: tx.status,
      amount: tx.amount,
      processorResponseCode: tx.processorResponseCode,
      processorResponseText: tx.processorResponseText,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
    };
  }
}
