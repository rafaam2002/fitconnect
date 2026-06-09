import { EntityManager } from '@mikro-orm/core';

import { Customer } from '../entities/Customer';
import { User } from '../entities/User';
import { ServiceResponse } from '../types/common.type';
import {
  createServiceResponse,
  NotFoundError,
  ValidationError,
} from '../utils/errors.util';

import { BaseService } from './base.service';

export interface CreateCustomerInput {
  userId: string;
  email?: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, any>;
}

interface UpdateCustomerInput {
  customerId: string;
  email?: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, any>;
}

export class CustomerService extends BaseService {
  constructor(em: EntityManager) {
    super(em);
  }

  async findByCustomerId(id: string) {
    const customer = await this.em.findOne(Customer, {
      id,
    });

    if (!customer) throw new Error('Stripe Customer not found');

    return customer;
  }

  async createCustomer(input: CreateCustomerInput): Promise<ServiceResponse> {
    // Buscar usuario
    const user = await this.em.findOne(
      User,
      { id: input.userId },
      { filters: false }
    );

    if (!user) {
      throw new Error('Customer');
    }

    const existingCustomer = await this.em.findOne(
      Customer,
      {
        user,
        isActive: true,
      },
      { filters: false }
    );

    if (existingCustomer) {
      throw new ValidationError('User already has an active Stripe customer');
    }

    // Crear en base de datos
    const customerEntity: any = this.em.create(Customer, {
      user,
      isActive: true,
      defaultCurrency: 'EUR',
    });

    user.customer = customerEntity.customerId;

    this.em.persist(customerEntity);
    await this.em.flush();

    return createServiceResponse(
      200,
      'Customer has been created',
      true,
      customerEntity
    );
  }

  async updateCustomer(input: UpdateCustomerInput): Promise<ServiceResponse> {
    const customer = await this.em.findOne(
      Customer,
      {
        isActive: true,
      },
      { filters: false }
    );

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    try {
      // Actualizar en Stripe
      await this.stripe.customers.update(input.customerId, {
        email: input.email,
        name: input.name,
        phone: input.phone,
        metadata: input.metadata,
      });

      await this.em.flush();

      return createServiceResponse(
        200,
        'Customer has been updated',
        true,
        customer
      );
    } catch (error) {
      this.handleStripeError(error);
    }
  }

  async getCustomer(id: string): Promise<ServiceResponse> {
    const customer = await this.em.findOne(
      Customer,
      {
        id,
        isActive: true,
      },
      {
        populate: ['user', 'paymentMethods', 'subscriptions'],
      }
    );

    if (!customer) {
      throw new NotFoundError('Customer');
    }
    return createServiceResponse(
      200,
      'Customer has been fetched successfully',
      true,
      customer
    );
  }

  async getCustomerByUserId(userId: string): Promise<ServiceResponse> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) throw new NotFoundError('Customer');

    const customer = await this.em.findOne(
      Customer,
      {
        user,
        isActive: true,
      },
      {
        populate: ['paymentMethods', 'subscriptions'],
      }
    );

    return createServiceResponse(
      200,
      'Customer has been fetched successfully',
      true,
      customer
    );
  }

  async deactivateCustomer(customerId: string): Promise<ServiceResponse> {
    const customer = await this.em.findOne(Customer, {
      id: customerId,
    });

    if (!customer) {
      throw new NotFoundError('Stripe customer not found');
    }
    if (customer.isActive) customer.isActive = false;
    else if (!customer.isActive) {
      console.log(`Customer ${customerId} already inactive`);
    }
    await this.em.flush();

    return createServiceResponse(
      200,
      'Customer has been deactivated',
      true,
      customer
    );
  }

  async syncCustomerFromStripe(id: string): Promise<Customer> {
    // Obtener datos de Stripe
    const stripeCustomer: any = await this.stripe.customers.retrieve(id);

    if (stripeCustomer.deleted) {
      throw new Error('Customer was deleted in Stripe');
    }

    // Buscar en BD
    let customer: any = await this.em.findOne(Customer, {
      id,
    });

    if (!customer) {
      // Si no existe, necesitamos encontrar el usuario por metadata o email
      const userId = stripeCustomer.metadata?.userId;
      if (!userId) {
        throw new Error('Cannot sync customer: no userId in metadata');
      }

      const user = await this.em.findOne(User, { id: userId });
      if (!user) {
        throw new Error('User not found for sync');
      }

      customer = this.em.create(Customer, {
        id,
        user,
        isActive: true,
        defaultCurrency: 'EUR',
      });
    }

    // Actualizar datos
    customer.metadata = stripeCustomer.metadata;
    customer.isActive = true;

    this.em.persist(customer);
    await this.em.flush();

    return customer;
  }
}
