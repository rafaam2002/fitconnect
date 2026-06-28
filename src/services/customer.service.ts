import { EntityManager } from '@mikro-orm/core';

import { Customer } from '../entities/Customer';
import { User } from '../entities/User';
import { ServiceResponse } from '../types/common.type';
import {
  BadRequestError,
  createServiceResponse,
  NotFoundError,
} from '../utils/errors.util';

import { BaseService } from './base.service';

export interface CreateCustomerInput {
  user: User;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface UpdateCustomerInput {
  customerId: string;
  currency?: string;
  metadata?: Record<string, any>;
  isActive?: boolean;
}

/**
 * CustomerService
 *
 * Gestiona los perfiles de facturación de los usuarios.
 * No hay llamadas externas — esta tabla es la fuente de verdad.
 */
export class CustomerService extends BaseService {
  constructor(em: EntityManager) {
    super(em);
  }

  /**
   * Crea el perfil de facturación para un usuario.
   * Se llama una vez al registrar al usuario (desde UserService).
   */
  public async createCustomer(
    input: CreateCustomerInput
  ): Promise<ServiceResponse> {
    if (!input.user.id) {
      throw new BadRequestError('User ID is required');
    }

    // Evitar duplicados: un usuario solo puede tener un Customer activo
    const existing = await this.em.findOne(Customer, {
      user: input.user.id,
      isActive: true,
    });

    if (existing) {
      return createServiceResponse(200, 'Customer already exists', true, {
        customer: existing,
      });
    }

    const customer = this.em.create(Customer, {
      user: input.user,
      defaultCurrency: input.currency ?? 'eur',
      isActive: true,
      metadata: input.metadata ?? null,
    });

    this.em.persist(customer);
    await this.em.flush();

    return createServiceResponse(201, 'Customer created successfully', true, {
      customer,
    });
  }

  /**
   * Devuelve el Customer activo de un usuario.
   * La mayoría de servicios de billing parten de aquí.
   */
  public async getCustomerByUserId(userId: string): Promise<ServiceResponse> {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    const customer = await this.em.findOne(
      Customer,
      { user: userId, isActive: true },
      { populate: ['user', 'paymentMethods', 'subscriptions'] }
    );

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    return createServiceResponse(200, 'Customer fetched successfully', true, {
      customer,
    });
  }

  /**
   * Devuelve el Customer por su propio ID.
   */
  public async getCustomerById(customerId: string): Promise<ServiceResponse> {
    if (!customerId) {
      throw new BadRequestError('Customer ID is required');
    }

    const customer = await this.em.findOne(
      Customer,
      { id: customerId },
      { populate: ['user', 'paymentMethods', 'subscriptions'] }
    );

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    return createServiceResponse(200, 'Customer fetched successfully', true, {
      customer,
    });
  }

  /**
   * Actualiza metadatos o moneda del Customer.
   */
  public async updateCustomer(
    input: UpdateCustomerInput
  ): Promise<ServiceResponse> {
    if (!input.customerId) {
      throw new BadRequestError('Customer ID is required');
    }

    const customer = await this.em.findOne(Customer, { id: input.customerId });
    if (!customer) {
      throw new NotFoundError('Customer');
    }

    if (input.currency !== undefined) {
      customer.defaultCurrency = input.currency;
    }
    if (input.isActive !== undefined) {
      customer.isActive = input.isActive;
    }
    if (input.metadata !== undefined) {
      customer.metadata = { ...customer.metadata, ...input.metadata };
    }

    await this.em.flush();

    return createServiceResponse(200, 'Customer updated successfully', true, {
      customer,
    });
  }

  /**
   * Obtiene el Customer activo de un usuario, o lo crea si no existe.
   * Útil en flujos donde el Customer debería existir pero puede faltar por datos legacy.
   */
  public async getOrCreateCustomer(user: User): Promise<Customer> {
    let customer = await this.em.findOne(Customer, {
      user: user.id,
      isActive: true,
    });

    if (!customer) {
      customer = this.em.create(Customer, {
        user,
        defaultCurrency: 'eur',
        isActive: true,
      });
      this.em.persist(customer);
      await this.em.flush();
    }

    return customer;
  }

  /**
   * Marca un Customer como inactivo (soft-delete).
   * No elimina sus suscripciones ni pagos — solo desactiva el perfil.
   */
  public async deactivateCustomer(
    customerId: string
  ): Promise<ServiceResponse> {
    const customer = await this.em.findOne(Customer, { id: customerId });
    if (!customer) {
      throw new NotFoundError('Customer');
    }

    customer.isActive = false;
    await this.em.flush();

    return createServiceResponse(
      200,
      'Customer deactivated successfully',
      true
    );
  }
}
