import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';

export class BaseService {
  protected stripe: Stripe;
  protected em: EntityManager;

  constructor(em: EntityManager) {
    this.em = em;
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }

  protected generateIdempotencyKey(
    prefix: string,
    ...params: string[]
  ): string {
    const timestamp = Date.now();
    const hash = Buffer.from(params.join('|')).toString('base64').slice(0, 8);
    return `${prefix}_${timestamp}_${hash}`;
  }

  protected handleStripeError(error: any): never {
    if (error instanceof Stripe.errors.StripeError) {
      throw new Error(`Stripe Error: ${error.message} (${error.type})`);
    }
    throw error;
  }
}
