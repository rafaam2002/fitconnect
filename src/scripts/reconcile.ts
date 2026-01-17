import { MikroORM } from '@mikro-orm/core';

import { StripeCustomer } from '../entities/StripeCustomer';
import { Subscription, SubscriptionStatus } from '../entities/Subscription';
import config from '../mikro-orm.config';
import { CustomerService } from '../services/customer.service';
import SubscriptionService from '../services/subscription.service';

async function reconcileWithStripe() {
  const orm = await MikroORM.init(config);
  const em = orm.em.fork();

  const customerService = new CustomerService(em);
  const subscriptionService = new SubscriptionService(em);

  // Reconciliar customers
  const customers = await em.find(StripeCustomer, { isActive: true });

  for (const customer of customers) {
    try {
      await customerService.syncCustomerFromStripe(customer.stripeCustomerId);
      console.log(`✅ Synced customer: ${customer.stripeCustomerId}`);
    } catch (error) {
      console.error(
        `❌ Failed to sync customer ${customer.stripeCustomerId}:`,
        error.message
      );
    }
  }

  // Reconciliar suscripciones
  const subscriptions = await em.find(Subscription, {
    status: {
      $in: [
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.TRIALING,
        SubscriptionStatus.PAST_DUE,
      ],
    },
  });

  for (const subscription of subscriptions) {
    try {
      await subscriptionService.syncSubscriptionFromStripe(
        subscription.stripeSubscriptionId
      );
      console.log(
        `✅ Synced subscription: ${subscription.stripeSubscriptionId}`
      );
    } catch (error) {
      console.error(
        `❌ Failed to sync subscription ${subscription.stripeSubscriptionId}:`,
        error.message
      );
    }
  }

  await orm.close();
}

reconcileWithStripe().catch(console.error);
