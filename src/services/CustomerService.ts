import {EntityManager} from '@mikro-orm/core';
import {BaseService} from './BaseService.js';
import {StripeCustomer} from "../entities/StripeCustomer";
import {User} from "../entities/User";

interface CreateCustomerInput {
    userId: string;
    email?: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, any>;
}

interface UpdateCustomerInput {
    stripeCustomerId: string;
    email?: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, any>;
}

export class CustomerService extends BaseService {
    constructor(em: EntityManager) {
        super(em);
    }

    async createCustomer(input: CreateCustomerInput): Promise<StripeCustomer> {
        // Buscar usuario
        const user = await this.em.findOne(User, {id: input.userId});
        const metadata: Record<string, any> = {};

        if (!user) {
            throw new Error('User not found');
        }

        // Verificar si ya tiene un customer activo
        const existingCustomer = await this.em.findOne(StripeCustomer, {
            user,
            isActive: true
        });

        if (existingCustomer) {
            throw new Error('User already has an active Stripe customer');
        }

        try {
            // Crear customer en Stripe
            const stripeCustomer = await this.stripe.customers.create({
                email: input.email || user.email,
                name: input.name || user.fullName,
                phone: input.phone || user.phoneNumber,
                metadata: {
                    userId: user.id,
                    ...input.metadata
                }
            }, {
                idempotencyKey: this.generateIdempotencyKey('customer', user.id)
            });

            if (stripeCustomer.metadata && Object.keys(stripeCustomer.metadata).length > 0) {
                // Copiar todas las propiedades
                Object.assign(metadata, stripeCustomer.metadata);
            }

            // Crear en base de datos
            const customerEntity: any = this.em.create(StripeCustomer, {
                stripeCustomerId: stripeCustomer.id,
                user,
                isActive: true,
                defaultCurrency: 'EUR',
            });

            user.stripeCustomerId = customerEntity.id;

            this.em.persist(customerEntity);
            await this.em.flush();

            return customerEntity;
        } catch (error) {
            this.handleStripeError(error);
        }
    }

    async updateCustomer(input: UpdateCustomerInput): Promise<StripeCustomer> {
        const customer = await this.em.findOne(StripeCustomer, {
            stripeCustomerId: input.stripeCustomerId,
            isActive: true
        });

        if (!customer) {
            throw new Error('Stripe customer not found');
        }

        try {
            // Actualizar en Stripe
            const updatedStripeCustomer = await this.stripe.customers.update(
                input.stripeCustomerId,
                {
                    email: input.email,
                    name: input.name,
                    phone: input.phone,
                    metadata: input.metadata
                }
            );

            // Actualizar en base de datos
            if (input.metadata) {
                customer.metadata = {...customer.metadata, ...input.metadata};
            }

            await this.em.flush();

            return customer;
        } catch (error) {
            this.handleStripeError(error);
        }
    }

    async getCustomer(stripeCustomerId: string): Promise<StripeCustomer | null> {
        const customer = await this.em.findOne(StripeCustomer, {
            stripeCustomerId,
            isActive: true
        }, {
            populate: ['user', 'paymentMethods', 'subscriptions']
        });

        if (!customer) {
            throw new Error('User not found');
        }
        return customer;
    }

    async getCustomerByUserId(userId: string): Promise<StripeCustomer | null> {
        const user = await this.em.findOne(User, {id: userId});
        if (!user) return null;

        return await this.em.findOne(StripeCustomer, {
            user,
            isActive: true
        }, {
            populate: ['paymentMethods', 'subscriptions']
        });
    }

    async deactivateCustomer(stripeCustomerId: string): Promise<void> {
        const customer = await this.em.findOne(StripeCustomer, {
            stripeCustomerId,
            isActive: true
        });

        if (!customer) {
            throw new Error('Stripe customer not found');
        }

        // Marcar como inactivo en BD (no eliminamos de Stripe)
        customer.isActive = false;
        await this.em.flush();
    }

    async syncCustomerFromStripe(stripeCustomerId: string): Promise<StripeCustomer> {
        try {
            // Obtener datos de Stripe
            const stripeCustomer: any = await this.stripe.customers.retrieve(stripeCustomerId);

            if (stripeCustomer.deleted) {
                throw new Error('Customer was deleted in Stripe');
            }

            // Buscar en BD
            let customer: any = await this.em.findOne(StripeCustomer, {stripeCustomerId});

            if (!customer) {
                // Si no existe, necesitamos encontrar el usuario por metadata o email
                const userId = stripeCustomer.metadata?.userId;
                if (!userId) {
                    throw new Error('Cannot sync customer: no userId in metadata');
                }

                const user = await this.em.findOne(User, {id: userId});
                if (!user) {
                    throw new Error('User not found for sync');
                }

                customer = this.em.create(StripeCustomer, {
                    stripeCustomerId,
                    user,
                    isActive: true
                });
            }

            // Actualizar datos
            customer.metadata = stripeCustomer.metadata;
            customer.isActive = true;

            this.em.persist(customer);
            await this.em.flush();

            return customer;
        } catch (error) {
            this.handleStripeError(error);
        }
    }
}