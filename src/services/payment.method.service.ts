import { EntityManager, QueryOrder } from '@mikro-orm/core';

import { Customer } from '../entities/Customer';
import { PaymentMethod, PaymentMethodStatus } from '../entities/PaymentMethod';
import { ServiceResponse } from '../types/common.type';
import { createServiceResponse, NotFoundError } from '../utils/errors.util';

import { BaseService } from './base.service';

export class PaymentMethodService extends BaseService {
  constructor(em: EntityManager) {
    super(em);
  }

  /**
   * Obtener payment method por ID
   */
  public async getPaymentMethod(id: string): Promise<ServiceResponse> {
    const paymentMethod = await this.em.findOne(
      PaymentMethod,
      { id },
      { populate: ['customer', 'customer.user'] }
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
  public async listPaymentMethods(id: string): Promise<ServiceResponse> {
    const customer = await this.em.findOne(Customer, {
      id,
      isActive: true,
    });

    if (!customer) {
      throw new NotFoundError('Stripe customer');
    }

    const paymentMethods = await this.em.find(
      PaymentMethod,
      {
        customer,
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
    const customer = await this.em.findOne(Customer, {
      user: userId,
      isActive: true,
    });

    if (!customer) {
      return createServiceResponse(200, 'No payment methods found', true, {
        paymentMethods: [],
      });
    }

    return await this.listPaymentMethods(customer.id);
  }

  /**
   * Obtener payment method por defecto
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
      {
        populate: ['customer', 'customer.user'],
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

    const paymentMethods = await this.em.find(PaymentMethod, {
      customer,
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
    customerId: string
  ): Promise<ServiceResponse> {
    const customer = await this.em.findOne(Customer, {
      id: customerId,
      isActive: true,
    });

    if (!customer) {
      throw new NotFoundError('Stripe customer');
    }

    const paymentMethods = await this.em.find(PaymentMethod, {
      customer: customer.id,
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
  public async getPaymentMethodsStats(id: string): Promise<ServiceResponse> {
    const customer = await this.em.findOne(Customer, {
      id,
      isActive: true,
    });

    if (!customer) {
      throw new NotFoundError('Stripe customer');
    }

    const paymentMethods = await this.em.find(PaymentMethod, {
      customer,
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
   * Limpiar payment methods expirados
   */
  public async cleanupExpiredPaymentMethods(
    id: string
  ): Promise<ServiceResponse> {
    const customer = await this.em.findOne(Customer, {
      id,
      isActive: true,
    });

    if (!customer) {
      throw new NotFoundError('Stripe customer');
    }

    const expiredPaymentMethods = await this.em.find(PaymentMethod, {
      customer,
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
}
