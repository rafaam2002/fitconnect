import Stripe from "stripe";

import {User} from "../entities/User";
import {Subscription, SubscriptionStatus} from "../entities/Subscription";
import {Transaction, TransactionStatus} from "../entities/Transaction";
import {Product} from "../entities/Product";
import {stripe} from "../utils/const";
import {EntityManager} from "@mikro-orm/core";

export class StripeService  {
    async createCustomerIfNotExists(em: EntityManager, user: User) {
        if (!user.stripeCustomerId) {
            const customer = await stripe.customers.create({ email: user.email });
            user.stripeCustomerId = customer.id;
            await em.persistAndFlush(user);
        }
        return user.stripeCustomerId!;
    }

    async createSubscription(em, user: User, product: Product, priceId: string) {
        await this.createCustomerIfNotExists(em, user);

        // cancelar suscripciones activas previas
        const activeSubs = await em.find(Subscription, { user, status: "active" });
        for (const sub of activeSubs) {
            await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
            sub.cancelAtPeriodEnd = true;
            await em.persist(sub);
        }

        const subscription = await stripe.subscriptions.create({
            customer: user.stripeCustomerId!,
            items: [{ price: priceId }],
            payment_behavior: "default_incomplete",
            expand: ["latest_invoice.payment_intent"],
        });

        const newSub = em.create(Subscription, {
            user,
            product,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        });
        await em.persistAndFlush(newSub);

        return subscription;
    }

    async handleWebhook(em: EntityManager, event: Stripe.Event) {
        switch (event.type) {
            case "invoice.payment_succeeded": {
                const invoice = event.data.object as Stripe.Invoice;
                const user = await em.findOne(User, { stripeCustomerId: invoice.customer as string });
                if (!user) return;

                const transaction = em.create<Transaction>(Transaction, {
                    user,
                    stripePaymentIntentId: invoice.payment_intent as string,
                    amount: invoice.amount_paid,
                    currency: invoice.currency,
                    status: TransactionStatus.SUCCEEDED,
                });
                await em.persistAndFlush(transaction);

                // enviar notificación
                // aquí llamas a tu NotificationService con el pushToken del usuario
                break;
            }

            case "customer.subscription.updated": {
                const sub = event.data.object as Stripe.Subscription;
                const localSub: Subscription = await em.findOne(Subscription, { stripeSubscriptionId: sub.id });
                if (localSub) {
                    localSub.status = sub.status as SubscriptionStatus;
                    localSub.currentPeriodEnd = new Date(sub.current_period_end * 1000);
                    await em.persistAndFlush(localSub);
                }
                break;
            }

            case "customer.subscription.deleted": {
                const sub = event.data.object as Stripe.Subscription;
                const localSub = await em.findOne(Subscription, { stripeSubscriptionId: sub.id });
                if (localSub) {
                    localSub.status = SubscriptionStatus.CANCELED;
                    await em.persistAndFlush(localSub);
                }
                break;
            }
        }
    }
};
