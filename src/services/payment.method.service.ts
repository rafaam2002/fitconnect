import { EntityManager, QueryOrder } from '@mikro-orm/core';

import { PaymentMethod, PaymentMethodStatus } from '../entities/PaymentMethod';
import { StripeCustomer } from '../entities/StripeCustomer';
import { ServiceResponse } from '../types/common.type';
import {
  BadRequestError,
  ConflictError,
  createServiceResponse,
  NotFoundError,
} from '../utils/errors.util';

import { BaseService } from './base.service';

interface AttachPaymentMethodInput {
  paymentMethodId: string;
  stripeCustomerId: string;
  setAsDefault?: boolean;
}

interface CreateSetupIntentInput {
  stripeCustomerId: string;
  usage?: 'on_session' | 'off_session';
  metadata?: Record<string, any>;
}

interface ConfirmSetupIntentInput {
  setupIntentId: string;
  setAsDefault?: boolean;
}

export class PaymentMethodService extends BaseService {
  constructor(em: EntityManager) {
    super(em);
  }

  /**
   * Obtener payment method por ID
   */
  public async getPaymentMethod(
    paymentMethodId: string
  ): Promise<ServiceResponse> {
    const paymentMethod = await this.em.findOne(
      PaymentMethod,
      {
        stripePaymentMethodId: paymentMethodId,
      },
      {
        populate: ['stripeCustomer', 'stripeCustomer.user'],
      }
    );

    if (!paymentMethod) {
      throw new NotFoundError('Payment method');
    }

    return createServiceResponse(
      200,
      'Payment method is fetched successfully',
      true,
      {
        paymentMethod,
      }
    );
  }

  /**
   * Listar payment methods de un customer
   */
  public async listPaymentMethods(
    stripeCustomerId: string
  ): Promise<ServiceResponse> {
    const stripeCustomer = await this.em.findOne(StripeCustomer, {
      stripeCustomerId,
      isActive: true,
    });

    if (!stripeCustomer) {
      throw new NotFoundError('Stripe customer');
    }

    const paymentMethods = await this.em.find(
      PaymentMethod,
      {
        stripeCustomer,
        status: PaymentMethodStatus.ACTIVE,
      },
      {
        orderBy: { isDefault: QueryOrder.DESC, created_at: QueryOrder.ASC },
      }
    );

    return createServiceResponse(
      200,
      'Payment methods are fetched successfully',
      true,
      {
        paymentMethods,
        paymentMethod: paymentMethods[0],
      }
    );
  }

  /**
   * Listar payment methods de un usuario
   */
  public async listUserPaymentMethods(
    userId: string
  ): Promise<ServiceResponse> {
    const stripeCustomer = await this.em.findOne(StripeCustomer, {
      user: userId,
      isActive: true,
    });

    if (!stripeCustomer) {
      return createServiceResponse(200, 'No payment methods found', true, {
        paymentMethods: [],
      });
    }

    return await this.listPaymentMethods(stripeCustomer.stripeCustomerId);
  }

  /**
   * Obtener payment method por defecto
   */
  public async getDefaultPaymentMethod(
    stripeCustomerId: string
  ): Promise<ServiceResponse> {
    const paymentMethod = await this.em.findOne(
      PaymentMethod,
      {
        stripeCustomer: { stripeCustomerId },
        isDefault: true,
        status: PaymentMethodStatus.ACTIVE,
      },
      {
        populate: ['stripeCustomer', 'stripeCustomer.user'],
      }
    );

    if (!paymentMethod) {
      throw new NotFoundError('Default payment method');
    }

    return createServiceResponse(
      200,
      'Default payment method is fetched successfully',
      true,
      {
        paymentMethod,
      }
    );
  }

  /**
   * Obtener payment method por defecto de un usuario
   */
  public async getUserDefaultPaymentMethod(
    userId: string
  ): Promise<ServiceResponse> {
    const stripeCustomer = await this.em.findOne(StripeCustomer, {
      user: userId,
      isActive: true,
    });

    if (!stripeCustomer) {
      return createServiceResponse(
        200,
        'No default payment method found',
        true,
        {
          paymentMethod: null,
        }
      );
    }

    const paymentMethods = await this.em.find(PaymentMethod, {
      stripeCustomer,
      isDefault: true,
      status: PaymentMethodStatus.ACTIVE,
    });

    return createServiceResponse(
      200,
      'Default user payment method is fetched successfully',
      true,
      {
        paymentMethod: paymentMethods[0] || null,
      }
    );
  }

  /**
   * Obtener métodos de pago expirados
   */
  public async getExpiredPaymentMethods(
    stripeCustomerId: string
  ): Promise<ServiceResponse> {
    const stripeCustomer = await this.em.findOne(StripeCustomer, {
      stripeCustomerId,
      isActive: true,
    });

    if (!stripeCustomer) {
      throw new NotFoundError('Stripe customer');
    }

    const paymentMethods = await this.em.find(PaymentMethod, {
      stripeCustomer: stripeCustomer.id,
      status: PaymentMethodStatus.EXPIRED,
    });

    return createServiceResponse(
      200,
      'Expired payment methods are fetched successfully',
      true,
      {
        paymentMethods,
      }
    );
  }

  /**
   * Obtener estadísticas de payment methods
   */
  public async getPaymentMethodsStats(
    stripeCustomerId: string
  ): Promise<ServiceResponse> {
    const stripeCustomer = await this.em.findOne(StripeCustomer, {
      stripeCustomerId,
      isActive: true,
    });

    if (!stripeCustomer) {
      throw new NotFoundError('Stripe customer');
    }

    const paymentMethods = await this.em.find(PaymentMethod, {
      stripeCustomer,
    });

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
      'Payment method stats are fetched successfully',
      true,
      {
        stats,
      }
    );
  }

  /**
   * Crear Setup Intent
   */
  public async createSetupIntent(
    input: CreateSetupIntentInput
  ): Promise<ServiceResponse> {
    const stripeCustomer = await this.em.findOne(StripeCustomer, {
      stripeCustomerId: input.stripeCustomerId,
      isActive: true,
    });

    if (!stripeCustomer) {
      throw new NotFoundError('Stripe customer');
    }

    const setupIntent = await this.stripe.setupIntents.create(
      {
        customer: input.stripeCustomerId,
        usage: input.usage,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: {
          userId: stripeCustomer.user.id,
          ...input.metadata,
        },
      },
      {
        idempotencyKey: this.generateIdempotencyKey(
          'setup_intent',
          input.stripeCustomerId
        ),
      }
    );

    return createServiceResponse(
      200,
      'Setup Intent created successfully',
      true,
      {
        clientSecret: setupIntent.client_secret!,
        setupIntentId: setupIntent.id,
      }
    );
  }

  /**
   * Confirmar Setup Intent
   */
  public async confirmSetupIntent(
    input: ConfirmSetupIntentInput
  ): Promise<ServiceResponse> {
    const setupIntent = await this.stripe.setupIntents.retrieve(
      input.setupIntentId
    );

    if (setupIntent.status !== 'succeeded') {
      throw new BadRequestError(
        `Setup Intent not successful. Status: ${setupIntent.status}`
      );
    }

    if (!setupIntent.payment_method) {
      throw new BadRequestError('No payment method found in Setup Intent');
    }

    const newPaymentMethodId = setupIntent.payment_method as string;
    const stripePaymentMethod =
      await this.stripe.paymentMethods.retrieve(newPaymentMethodId);

    if (!stripePaymentMethod.customer) {
      throw new BadRequestError('Payment method is not attached to a customer');
    }

    const stripeCustomer = await this.em.findOne(StripeCustomer, {
      stripeCustomerId: stripePaymentMethod.customer as string,
      isActive: true,
    });

    if (!stripeCustomer) {
      throw new NotFoundError('Customer');
    }

    // Verificar duplicados
    if (stripePaymentMethod.card?.fingerprint) {
      const existingPaymentMethod = await this.em.findOne(PaymentMethod, {
        stripeCustomer,
        fingerprint: stripePaymentMethod.card.fingerprint,
        status: PaymentMethodStatus.ACTIVE,
      });

      if (existingPaymentMethod) {
        // Eliminar el payment method duplicado de Stripe
        try {
          await this.stripe.paymentMethods.detach(newPaymentMethodId);
        } catch (detachError) {
          console.error('Failed to remove duplicate from Stripe:', detachError);
        }

        // Establecer como default si se solicita
        if (input.setAsDefault && !existingPaymentMethod.isDefault) {
          await this.setDefaultPaymentMethodInternal(
            existingPaymentMethod.stripePaymentMethodId,
            stripeCustomer
          );
          existingPaymentMethod.isDefault = true;
          await this.em.flush();
        }

        return createServiceResponse(
          200,
          'Payment method confirmed and attached successfully',
          true,
          {
            paymentMethod: existingPaymentMethod,
          }
        );
      }
    }

    // Crear nuevo payment method
    const paymentMethodData =
      this.extractPaymentMethodData(stripePaymentMethod);
    const paymentMethod = this.em.create(PaymentMethod, {
      ...paymentMethodData,
      stripeCustomer,
      isDefault: false,
    });

    if (input.setAsDefault) {
      await this.setDefaultPaymentMethodInternal(
        newPaymentMethodId,
        stripeCustomer
      );
      paymentMethod.isDefault = true;
    }

    this.em.persist(paymentMethod);
    await this.em.flush();

    return createServiceResponse(
      200,
      'Payment method confirmed and attached successfully',
      true,
      {
        paymentMethod,
      }
    );
  }

  /**
   * Adjuntar payment method
   */
  public async attachPaymentMethod(
    input: AttachPaymentMethodInput
  ): Promise<ServiceResponse> {
    const stripeCustomer = await this.em.findOne(StripeCustomer, {
      stripeCustomerId: input.stripeCustomerId,
      isActive: true,
    });

    if (!stripeCustomer) {
      throw new NotFoundError('Stripe customer');
    }

    const stripePaymentMethod = await this.stripe.paymentMethods.retrieve(
      input.paymentMethodId
    );

    // Verificar que no esté ya adjuntado
    const existingPaymentMethod = await this.em.findOne(PaymentMethod, {
      stripePaymentMethodId: input.paymentMethodId,
      stripeCustomer,
    });

    if (existingPaymentMethod) {
      throw new ConflictError(
        'Payment method already attached to this customer'
      );
    }

    // Verificar duplicados por fingerprint
    if (stripePaymentMethod.card?.fingerprint) {
      const duplicatePaymentMethod = await this.em.findOne(PaymentMethod, {
        fingerprint: stripePaymentMethod.card.fingerprint,
        stripeCustomer,
        status: PaymentMethodStatus.ACTIVE,
      });

      if (duplicatePaymentMethod) {
        throw new ConflictError(
          'A payment method with the same card already exists'
        );
      }
    }

    // Adjuntar a customer en Stripe
    await this.stripe.paymentMethods.attach(input.paymentMethodId, {
      customer: input.stripeCustomerId,
    });

    // Si se debe establecer como default
    if (input.setAsDefault) {
      await this.stripe.customers.update(input.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: input.paymentMethodId,
        },
      });

      await this.em.nativeUpdate(
        PaymentMethod,
        {
          stripeCustomer,
          isDefault: true,
        },
        {
          isDefault: false,
        }
      );
    }

    // Crear en base de datos
    const paymentMethodData =
      this.extractPaymentMethodData(stripePaymentMethod);
    const paymentMethod = this.em.create<PaymentMethod>(PaymentMethod, {
      ...paymentMethodData,
      stripeCustomer,
      isDefault: input.setAsDefault || false,
    });

    this.em.persist(paymentMethod);
    await this.em.flush();

    return createServiceResponse(
      200,
      'Payment method attached successfully',
      true,
      {
        paymentMethod,
      }
    );
  }

  /**
   * Eliminar payment method
   */
  public async removePaymentMethod(
    paymentMethodId: string
  ): Promise<ServiceResponse> {
    const paymentMethod = await this.em.findOne(PaymentMethod, {
      stripePaymentMethodId: paymentMethodId,
      status: PaymentMethodStatus.ACTIVE,
    });

    if (!paymentMethod) {
      throw new NotFoundError('Payment method');
    }

    // Desadjuntar de Stripe
    await this.stripe.paymentMethods.detach(paymentMethodId);

    // Marcar como inactivo
    paymentMethod.status = PaymentMethodStatus.INACTIVE;
    await this.em.flush();

    return createServiceResponse(
      200,
      'Payment method removed successfully',
      true
    );
  }

  /**
   * Establecer payment method como default
   */
  public async setDefaultPaymentMethod(
    paymentMethodId: string
  ): Promise<ServiceResponse> {
    const paymentMethod = await this.em.findOne(
      PaymentMethod,
      {
        stripePaymentMethodId: paymentMethodId,
        status: PaymentMethodStatus.ACTIVE,
      },
      {
        populate: ['stripeCustomer'],
      }
    );

    if (!paymentMethod) {
      throw new NotFoundError('Payment method');
    }

    // Actualizar en Stripe
    await this.stripe.customers.update(
      paymentMethod.stripeCustomer.stripeCustomerId,
      {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      }
    );

    // Desmarcar otros
    await this.em.nativeUpdate(
      PaymentMethod,
      {
        stripeCustomer: paymentMethod.stripeCustomer,
        isDefault: true,
      },
      {
        isDefault: false,
      }
    );

    // Marcar este como default
    paymentMethod.isDefault = true;
    await this.em.flush();

    return createServiceResponse(
      200,
      'Default payment method updated successfully',
      true,
      {
        paymentMethod,
      }
    );
  }

  /**
   * Actualizar metadata de payment method
   */
  public async updatePaymentMethodMetadata(
    paymentMethodId: string,
    metadata: Record<string, any>
  ): Promise<ServiceResponse> {
    const paymentMethod = await this.em.findOne(PaymentMethod, {
      stripePaymentMethodId: paymentMethodId,
    });

    if (!paymentMethod) {
      throw new NotFoundError('Payment method');
    }

    paymentMethod.metadata = {
      ...paymentMethod.metadata,
      ...metadata,
    };

    await this.em.flush();

    return createServiceResponse(
      200,
      'Payment method updated successfully',
      true,
      {
        paymentMethod,
      }
    );
  }

  /**
   * Marcar payment method como expirado
   */
  public async markPaymentMethodAsExpired(
    paymentMethodId: string
  ): Promise<ServiceResponse> {
    const paymentMethod = await this.em.findOne(PaymentMethod, {
      stripePaymentMethodId: paymentMethodId,
    });

    if (!paymentMethod) {
      throw new NotFoundError('Payment method');
    }

    paymentMethod.status = PaymentMethodStatus.EXPIRED;
    paymentMethod.isDefault = false;

    await this.em.flush();

    return createServiceResponse(
      200,
      'Payment method marked as expired successfully',
      true,
      {
        paymentMethod,
      }
    );
  }

  /**
   * Limpiar payment methods expirados
   */
  public async cleanupExpiredPaymentMethods(
    stripeCustomerId: string
  ): Promise<ServiceResponse> {
    const stripeCustomer = await this.em.findOne(StripeCustomer, {
      stripeCustomerId,
      isActive: true,
    });

    if (!stripeCustomer) {
      throw new NotFoundError('Stripe customer');
    }

    const expiredPaymentMethods = await this.em.find(PaymentMethod, {
      stripeCustomer: stripeCustomer.id,
      status: PaymentMethodStatus.EXPIRED,
    });

    for (const paymentMethod of expiredPaymentMethods) {
      paymentMethod.status = PaymentMethodStatus.EXPIRED;
      paymentMethod.isDefault = false;
    }

    await this.em.flush();

    return createServiceResponse(
      200,
      `Successfully cleaned up ${expiredPaymentMethods.length} expired payment methods`,
      true,
      { paymentMethods: expiredPaymentMethods }
    );
  }

  /**
   * Sincronizar payment method desde Stripe
   */
  public async syncPaymentMethodFromStripe(
    paymentMethodId: string
  ): Promise<ServiceResponse> {
    const stripePaymentMethod =
      await this.stripe.paymentMethods.retrieve(paymentMethodId);

    if (!stripePaymentMethod.customer) {
      throw new BadRequestError(
        'Payment method not found in Stripe or not attached to customer'
      );
    }

    const stripeCustomer = await this.em.findOne(StripeCustomer, {
      stripeCustomerId: stripePaymentMethod.customer as string,
    });

    if (!stripeCustomer) {
      throw new NotFoundError('Stripe customer');
    }

    let paymentMethod = await this.em.findOne(PaymentMethod, {
      stripeCustomer,
      fingerprint: stripePaymentMethod.card!.fingerprint,
      status: PaymentMethodStatus.ACTIVE,
    });

    const paymentMethodData =
      this.extractPaymentMethodData(stripePaymentMethod);

    if (paymentMethod) {
      // Actualizar existente
      Object.assign(paymentMethod, paymentMethodData);
    } else {
      // Crear nuevo
      paymentMethod = this.em.create(PaymentMethod, {
        ...paymentMethodData,
        stripeCustomer,
      });
    }

    this.em.persist(paymentMethod);
    await this.em.flush();

    return createServiceResponse(
      200,
      'Payment method synchronized successfully',
      true,
      {
        paymentMethod,
      }
    );
  }

  /**
   * Validar payment method
   */
  public async validatePaymentMethod(
    paymentMethodId: string
  ): Promise<ServiceResponse> {
    const paymentMethod = await this.em.findOne(PaymentMethod, {
      stripePaymentMethodId: paymentMethodId,
    });

    if (!paymentMethod) {
      return createServiceResponse(
        400,
        'Payment method validation failed: Payment method not found',
        false,
        {
          isValid: false,
          errors: ['Payment method not found'],
        }
      );
    }

    const errors: string[] = [];

    if (paymentMethod.isExpired) {
      errors.push('Payment method is expired');
    }

    if (paymentMethod.status !== PaymentMethodStatus.ACTIVE) {
      errors.push('Payment method is not active');
    }

    // Verificar en Stripe
    try {
      const stripePaymentMethod =
        await this.stripe.paymentMethods.retrieve(paymentMethodId);
      if (!stripePaymentMethod.customer) {
        errors.push('Payment method is not attached to a customer in Stripe');
      }
    } catch (stripeError: any) {
      errors.push(`Payment method not found in Stripe ${stripeError.message}`);
    }

    const isValid = errors.length === 0;
    const message = isValid
      ? 'Payment method is valid'
      : `Payment method validation failed: ${errors.join(', ')}`;

    return createServiceResponse(200, message, true, {
      isValid,
      errors,
      paymentMethod,
    });
  }

  // ============= MÉTODOS PRIVADOS =============

  private async setDefaultPaymentMethodInternal(
    paymentMethodId: string,
    stripeCustomer: StripeCustomer
  ): Promise<void> {
    await this.stripe.customers.update(stripeCustomer.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    await this.em.nativeUpdate(
      PaymentMethod,
      {
        stripeCustomer,
        isDefault: true,
      },
      {
        isDefault: false,
      }
    );
  }

  private extractPaymentMethodData(stripePaymentMethod: any): any {
    return {
      stripePaymentMethodId: stripePaymentMethod.id! ?? '',
      type: stripePaymentMethod.type!,
      status: PaymentMethodStatus.ACTIVE,
      brand: stripePaymentMethod.card?.brand!,
      last4: stripePaymentMethod.card?.last4!,
      expiryMonth: stripePaymentMethod.card?.exp_month!,
      expiryYear: stripePaymentMethod.card?.exp_year!,
      fingerprint: stripePaymentMethod.card?.fingerprint!,
      country: stripePaymentMethod.card?.country!,
    };
  }
}
