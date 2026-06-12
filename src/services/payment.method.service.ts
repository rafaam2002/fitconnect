import { EntityManager, QueryOrder } from '@mikro-orm/core';

import { Customer } from '../entities/Customer';
import { PaymentMethod, PaymentMethodStatus } from '../entities/PaymentMethod';
import { ServiceResponse } from '../types/common.type';
import {
  BadRequestError,
  createServiceResponse,
  NotFoundError,
} from '../utils/errors.util';

import { BaseService } from './base.service';
import {
  PaymentProcessor,
  TokenizeCardParams,
} from './payment-processor.interface';

export interface AddPaymentMethodInput {
  /** ID del Customer al que se adjunta el método de pago */
  customerId: string;
  /**
   * Token opaco devuelto por el procesador externo tras la tokenización.
   * En flujos con redirect (Redsys) llega por webhook/callback.
   * En flujos con JS SDK (Braintree, Adyen) lo envía el frontend.
   */
  externalToken: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  fingerprint?: string;
  country?: string;
  setAsDefault?: boolean;
}

export interface TokenizeAndAddCardInput {
  customerId: string;
  cardData: TokenizeCardParams;
  setAsDefault?: boolean;
}

/**
 * PaymentMethodService
 *
 * Gestiona los métodos de pago almacenados (card-on-file).
 * No llama a ninguna API de Stripe — trabaja con tokens del procesador elegido
 * y con los datos de la propia BD.
 */
export class PaymentMethodService extends BaseService {
  constructor(em: EntityManager, paymentProcessor?: PaymentProcessor) {
    super(em, paymentProcessor);
  }

  // ─────────────────────────────────────────────
  // LECTURA
  // ─────────────────────────────────────────────

  /**
   * Obtiene un PaymentMethod por su ID interno.
   */
  public async getPaymentMethod(
    paymentMethodId: string
  ): Promise<ServiceResponse> {
    const paymentMethod = await this.em.findOne(
      PaymentMethod,
      { id: paymentMethodId },
      { populate: ['customer', 'customer.user'] }
    );

    if (!paymentMethod) {
      throw new NotFoundError('Payment method');
    }

    return createServiceResponse(
      200,
      'Payment method fetched successfully',
      true,
      { paymentMethod }
    );
  }

  /**
   * Lista los métodos de pago activos de un Customer.
   */
  public async listPaymentMethods(
    customerId: string
  ): Promise<ServiceResponse> {
    const customer = await this.em.findOne(Customer, {
      id: customerId,
      isActive: true,
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    const paymentMethods = await this.em.find(
      PaymentMethod,
      { customer, status: PaymentMethodStatus.ACTIVE },
      { orderBy: { isDefault: QueryOrder.DESC, created_at: QueryOrder.ASC } }
    );

    return createServiceResponse(
      200,
      'Payment methods fetched successfully',
      true,
      {
        paymentMethods,
        paymentMethod: paymentMethods[0] ?? null,
      }
    );
  }

  /**
   * Lista los métodos de pago activos de un usuario (por userId).
   */
  public async listUserPaymentMethods(
    userId: string
  ): Promise<ServiceResponse> {
    const customer = await this.em.findOne(Customer, {
      user: userId,
      isActive: true,
    });

    if (!customer) {
      return createServiceResponse(200, 'No payment methods found', true, {
        paymentMethods: [],
      });
    }

    return this.listPaymentMethods(customer.id);
  }

  /**
   * Devuelve el método de pago por defecto de un Customer.
   */
  public async getDefaultPaymentMethod(
    customerId: string
  ): Promise<ServiceResponse> {
    const paymentMethod = await this.em.findOne(
      PaymentMethod,
      {
        customer: { id: customerId },
        isDefault: true,
        status: PaymentMethodStatus.ACTIVE,
      },
      { populate: ['customer', 'customer.user'] }
    );

    if (!paymentMethod) {
      throw new NotFoundError('Default payment method');
    }

    return createServiceResponse(
      200,
      'Default payment method fetched successfully',
      true,
      { paymentMethod }
    );
  }

  /**
   * Devuelve el método de pago por defecto de un usuario (por userId).
   */
  public async getUserDefaultPaymentMethod(
    userId: string
  ): Promise<ServiceResponse> {
    const customer = await this.em.findOne(Customer, {
      user: userId,
      isActive: true,
    });

    if (!customer) {
      return createServiceResponse(
        200,
        'No default payment method found',
        true,
        {
          paymentMethod: null,
        }
      );
    }

    const paymentMethod = await this.em.findOne(PaymentMethod, {
      customer,
      isDefault: true,
      status: PaymentMethodStatus.ACTIVE,
    });

    return createServiceResponse(
      200,
      'Default payment method fetched successfully',
      true,
      { paymentMethod: paymentMethod ?? null }
    );
  }

  /**
   * Devuelve los métodos de pago expirados de un Customer.
   */
  public async getExpiredPaymentMethods(
    customerId: string
  ): Promise<ServiceResponse> {
    const customer = await this.em.findOne(Customer, {
      id: customerId,
      isActive: true,
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    const paymentMethods = await this.em.find(PaymentMethod, {
      customer: customer.id,
      status: PaymentMethodStatus.EXPIRED,
    });

    return createServiceResponse(
      200,
      'Expired payment methods fetched successfully',
      true,
      { paymentMethods }
    );
  }

  /**
   * Estadísticas de métodos de pago de un Customer.
   */
  public async getPaymentMethodsStats(
    customerId: string
  ): Promise<ServiceResponse> {
    const customer = await this.em.findOne(Customer, {
      id: customerId,
      isActive: true,
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    const paymentMethods = await this.em.find(PaymentMethod, { customer });

    const active = paymentMethods.filter(
      pm => pm.status === PaymentMethodStatus.ACTIVE
    );
    const expired = paymentMethods.filter(
      pm => pm.status === PaymentMethodStatus.EXPIRED
    );
    const hasDefault = paymentMethods.some(pm => pm.isDefault);

    const byBrand: Record<string, number> = {};
    active.forEach(pm => {
      if (pm.brand) {
        byBrand[pm.brand] = (byBrand[pm.brand] || 0) + 1;
      }
    });

    const stats = {
      total: paymentMethods.length,
      active: active.length,
      expired: expired.length,
      byBrand,
      hasDefault,
    };

    return createServiceResponse(
      200,
      'Payment method stats fetched successfully',
      true,
      { stats }
    );
  }

  // ─────────────────────────────────────────────
  // ESCRITURA
  // ─────────────────────────────────────────────

  /**
   * Añade un método de pago ya tokenizado al Customer.
   *
   * El token externo lo genera el procesador (Redsys, Braintree, Adyen…)
   * y llega al backend a través de un webhook o de una llamada del frontend.
   * Este método solo persiste los datos — no realiza ningún cobro.
   */
  public async addPaymentMethod(
    input: AddPaymentMethodInput
  ): Promise<ServiceResponse> {
    const customer = await this.em.findOne(Customer, {
      id: input.customerId,
      isActive: true,
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    // Detectar tarjeta duplicada por fingerprint
    if (input.fingerprint) {
      const duplicate = await this.em.findOne(PaymentMethod, {
        customer,
        fingerprint: input.fingerprint,
        status: PaymentMethodStatus.ACTIVE,
      });

      if (duplicate) {
        // Si ya existe y se pide como default, simplemente actualizamos eso
        if (input.setAsDefault && !duplicate.isDefault) {
          await this.setDefaultInternal(duplicate, customer);
          await this.em.flush();
        }
        return createServiceResponse(
          200,
          'Payment method already exists',
          true,
          { paymentMethod: duplicate }
        );
      }
    }

    if (input.last4 && input.expiryMonth && input.expiryYear && input.brand) {
      const duplicate = await this.em.findOne(PaymentMethod, {
        customer,
        last4: input.last4,
        expiryMonth: input.expiryMonth,
        expiryYear: input.expiryYear,
        brand: input.brand,
        status: PaymentMethodStatus.ACTIVE,
      });

      if (duplicate) {
        if (input.setAsDefault && !duplicate.isDefault) {
          await this.setDefaultInternal(duplicate, customer);
          await this.em.flush();
        }
        return createServiceResponse(
          200,
          'Payment method already exists',
          true,
          { paymentMethod: duplicate }
        );
      }
    }

    // Crear el nuevo método de pago
    const paymentMethod = this.em.create(PaymentMethod, {
      customer,
      externalToken: input.externalToken,
      type: 'card' as any, // el procesador puede indicar el tipo
      status: PaymentMethodStatus.ACTIVE,
      brand: input.brand,
      last4: input.last4,
      expiryMonth: input.expiryMonth,
      expiryYear: input.expiryYear,
      fingerprint: input.fingerprint,
      country: input.country,
      isDefault: false,
    });

    if (input.setAsDefault) {
      await this.setDefaultInternal(paymentMethod, customer);
    }

    this.em.persist(paymentMethod);
    await this.em.flush();

    return createServiceResponse(
      200,
      'Payment method added successfully',
      true,
      { paymentMethod }
    );
  }

  /**
   * Tokeniza una tarjeta en el procesador y la guarda en BD.
   * Solo disponible si el procesador implementa tokenizeCard().
   * En flujos con redirect (Redsys) no se usa este método.
   */
  public async tokenizeAndAddCard(
    input: TokenizeAndAddCardInput
  ): Promise<ServiceResponse> {
    if (!this.paymentProcessor?.tokenizeCard) {
      throw new BadRequestError(
        'El procesador configurado no soporta tokenización directa. ' +
          'Usa el flujo de redirect o el SDK del frontend para obtener el token.'
      );
    }

    const tokenResult = await this.paymentProcessor.tokenizeCard(
      input.cardData
    );

    if (!tokenResult.success || !tokenResult.token) {
      throw new BadRequestError(
        tokenResult.errorMessage ?? 'Card tokenization failed'
      );
    }

    return this.addPaymentMethod({
      customerId: input.customerId,
      externalToken: tokenResult.token,
      brand: tokenResult.brand,
      last4: tokenResult.last4,
      expiryMonth: tokenResult.expiryMonth,
      expiryYear: tokenResult.expiryYear,
      fingerprint: tokenResult.fingerprint,
      country: tokenResult.country,
      setAsDefault: input.setAsDefault,
    });
  }

  /**
   * Elimina un método de pago.
   * Si el procesador es Braintree también elimina el token del Vault remoto.
   */
  public async removePaymentMethod(
    paymentMethodId: string
  ): Promise<ServiceResponse> {
    const paymentMethod = await this.em.findOne(PaymentMethod, {
      id: paymentMethodId,
      status: PaymentMethodStatus.ACTIVE,
    });

    if (!paymentMethod) {
      throw new NotFoundError('Payment method');
    }

    // Eliminar del Vault de Braintree si hay procesador inyectado y token externo
    if (this.paymentProcessor && paymentMethod.externalToken) {
      const processor = this.paymentProcessor as any;
      if (typeof processor.deleteVaultPaymentMethod === 'function') {
        const result = await processor.deleteVaultPaymentMethod(
          paymentMethod.externalToken
        );
        if (!result.success) {
          console.warn(
            `[PaymentMethodService] Could not delete token from Vault: ${result.errorMessage}`
          );
          // No lanzamos error — el token local se marca inactivo de todas formas
        }
      }
    }

    paymentMethod.status = PaymentMethodStatus.INACTIVE;
    paymentMethod.isDefault = false;
    await this.em.flush();

    return createServiceResponse(
      200,
      'Payment method removed successfully',
      true
    );
  }

  /**
   * Establece un método de pago como el predeterminado del Customer.
   */
  public async setDefaultPaymentMethod(
    paymentMethodId: string
  ): Promise<ServiceResponse> {
    const paymentMethod = await this.em.findOne(
      PaymentMethod,
      { id: paymentMethodId, status: PaymentMethodStatus.ACTIVE },
      { populate: ['customer'] }
    );

    if (!paymentMethod) {
      throw new NotFoundError('Payment method');
    }

    await this.setDefaultInternal(paymentMethod, paymentMethod.customer);
    await this.em.flush();

    return createServiceResponse(
      200,
      'Default payment method updated successfully',
      true,
      { paymentMethod }
    );
  }

  /**
   * Marca un método de pago como expirado.
   * Llamado por el CRON de revisión de tarjetas o desde un webhook del procesador.
   */
  public async markPaymentMethodAsExpired(
    paymentMethodId: string
  ): Promise<ServiceResponse> {
    const paymentMethod = await this.em.findOne(PaymentMethod, {
      id: paymentMethodId,
    });

    if (!paymentMethod) {
      throw new NotFoundError('Payment method');
    }

    paymentMethod.status = PaymentMethodStatus.EXPIRED;
    paymentMethod.isDefault = false;
    await this.em.flush();

    return createServiceResponse(
      200,
      'Payment method marked as expired',
      true,
      { paymentMethod }
    );
  }

  /**
   * Actualiza los metadatos de un método de pago.
   */
  public async updatePaymentMethodMetadata(
    paymentMethodId: string,
    metadata: Record<string, any>
  ): Promise<ServiceResponse> {
    const paymentMethod = await this.em.findOne(PaymentMethod, {
      id: paymentMethodId,
    });

    if (!paymentMethod) {
      throw new NotFoundError('Payment method');
    }

    paymentMethod.metadata = { ...paymentMethod.metadata, ...metadata };
    await this.em.flush();

    return createServiceResponse(
      200,
      'Payment method updated successfully',
      true,
      { paymentMethod }
    );
  }

  /**
   * Elimina los métodos de pago expirados de un Customer.
   */
  public async cleanupExpiredPaymentMethods(
    customerId: string
  ): Promise<ServiceResponse> {
    const customer = await this.em.findOne(Customer, {
      id: customerId,
      isActive: true,
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    const expiredPaymentMethods = await this.em.find(PaymentMethod, {
      customer: customer.id,
      status: PaymentMethodStatus.EXPIRED,
    });

    // Ya están marcados como EXPIRED — aquí podríamos hacer hard delete si se quiere
    // Por ahora solo normalizamos el flag isDefault
    for (const pm of expiredPaymentMethods) {
      pm.isDefault = false;
    }

    await this.em.flush();

    return createServiceResponse(
      200,
      `Cleaned up ${expiredPaymentMethods.length} expired payment methods`,
      true,
      { paymentMethods: expiredPaymentMethods }
    );
  }

  /**
   * Comprueba si un método de pago sigue siendo válido.
   * No llama al procesador externo — valida solo los datos locales.
   */
  public async validatePaymentMethod(
    paymentMethodId: string
  ): Promise<ServiceResponse> {
    const paymentMethod = await this.em.findOne(PaymentMethod, {
      id: paymentMethodId,
    });

    if (!paymentMethod) {
      return createServiceResponse(400, 'Payment method not found', false, {
        isValid: false,
        errors: ['Payment method not found'],
      });
    }

    const errors: string[] = [];

    if (paymentMethod.isExpired) {
      errors.push('Payment method is expired');
    }

    if (paymentMethod.status !== PaymentMethodStatus.ACTIVE) {
      errors.push('Payment method is not active');
    }

    if (!paymentMethod.externalToken) {
      errors.push('Payment method has no external token');
    }

    const isValid = errors.length === 0;

    return createServiceResponse(
      200,
      isValid
        ? 'Payment method is valid'
        : `Validation failed: ${errors.join(', ')}`,
      true,
      { isValid, errors, paymentMethod }
    );
  }

  // ─────────────────────────────────────────────
  // PRIVADOS
  // ─────────────────────────────────────────────

  /**
   * Desactiva todos los defaults del Customer y marca el indicado como nuevo default.
   * No hace flush — el llamador es responsable de hacerlo.
   */
  private async setDefaultInternal(
    newDefault: PaymentMethod,
    customer: Customer
  ): Promise<void> {
    await this.em.nativeUpdate(
      PaymentMethod,
      { customer, isDefault: true },
      { isDefault: false }
    );
    newDefault.isDefault = true;
  }
}
