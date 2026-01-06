import {EntityManager, QueryOrder} from '@mikro-orm/core';
import {BaseService} from './BaseService.js';
import {CustomerService} from './CustomerService.js';
import {SubscriptionService} from './SubscriptionService.js';
import {TransactionService} from './TransactionService.js';
import Stripe from 'stripe';
import {PaymentMethodService} from "./PaymentMethodService";
import {WebhookEventLog, WebhookEventStatus} from "../entities/WebhookEventLog";
import {InvoiceService} from "./InvoiceService";
import {PaymentMethod} from "../entities/PaymentMethod";
import {PlanService} from "./PlanService";

export class WebhookService extends BaseService {
    private customerService: CustomerService;
    private paymentMethodService: PaymentMethodService;
    private subscriptionService: SubscriptionService;
    private transactionService: TransactionService;
    private invoiceService: InvoiceService;
    private planService: PlanService;

    constructor(em: EntityManager) {
        super(em);
        this.planService = new PlanService(em);
        this.customerService = new CustomerService(em);
        this.paymentMethodService = new PaymentMethodService(em);
        this.subscriptionService = new SubscriptionService(em);
        this.transactionService = new TransactionService(em);
        this.invoiceService = new InvoiceService(em);
    }

    async processWebhook(body: string, signature: string): Promise<void> {
        let event: Stripe.Event;

        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            throw new Error('STRIPE_WEBHOOK_SECRET not configured');
        }

        try {
            // Verificar firma del webhook
            event = this.stripe.webhooks.constructEvent(
                body,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET!
            );
        } catch (error: any) {
            console.error('Webhook signature verification failed:', error.message);
            throw new Error(`Webhook signature verification failed: ${error.message}`);
        }

        const em = this.em.fork()
        // Verificar si ya hemos procesado este evento
        const existingLog = await this.em.findOne(WebhookEventLog, {
            stripeEventId: event.id
        });

        if (existingLog && existingLog.status === WebhookEventStatus.PROCESSED) {
            console.log(`Event ${event.id} already processed, skipping...`);
            return;
        }

        // Crear o actualizar log del evento
        let eventLog = existingLog ?? em.create<WebhookEventLog>(WebhookEventLog, {
            stripeEventId: event.id,
            eventType: event.type,
            payload: event.data.object,
            status: WebhookEventStatus.PENDING,
            created_at: new Date(),
            retryCount: 0
        });

        this.em.persist(eventLog);
        await this.em.flush();

        try {
            // Procesar evento según su tipo
            await this.handleWebhookEvent(event);

            eventLog.markAsProcessed();
            console.log(`Successfully processed webhook event: ${event.type} (${event.id})`);
        } catch (error: any) {
            console.error(`Failed to process webhook event ${event.type} (${event.id}):`, error.message);
            eventLog.markAsFailed(error.message);
        }

        em.persist(eventLog);
        await this.em.flush();

        try {
            console.log(`Processing webhook event: ${event.type} (${event.id})`);

            // Procesar evento según su tipo con timeout
            await Promise.race([
                this.handleWebhookEvent(event),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Webhook processing timeout')), 25000) // 25s timeout
                )
            ]);

            eventLog.status = WebhookEventStatus.PROCESSED;
            eventLog.processedAt = new Date();
            console.log(`Successfully processed webhook event: ${event.type} (${event.id})`);

        } catch (error: any) {
            console.error(`Failed to process webhook event ${event.type} (${event.id}):`, error.message);
            eventLog.status = WebhookEventStatus.FAILED;
            eventLog.errorMessage = error.message;
            eventLog.retryCount = (eventLog.retryCount || 0) + 1;
            eventLog.lastAttemptAt = new Date();
        }

        await em.flush();
    }

    async retryFailedEvents(maxRetries: number = 3): Promise<void> {
        const failedEvents = await this.em.find(WebhookEventLog, {
            status: WebhookEventStatus.FAILED,
            retryCount: {$lt: maxRetries}
        }, {
            orderBy: {created_at: QueryOrder.ASC},
            limit: 10
        });

        for (const eventLog of failedEvents) {
            try {
                console.log(`Retrying failed event: ${eventLog.eventType} (${eventLog.stripeEventId})`);

                // Simular el evento de Stripe para reprocessar
                const mockEvent: Stripe.Event = {
                    id: eventLog.stripeEventId,
                    type: eventLog.eventType as any,
                    data: {object: eventLog.payload},
                    api_version: '2023-10-16',
                    created: Math.floor(eventLog.created_at.getTime() / 1000),
                    livemode: false,
                    object: 'event',
                    pending_webhooks: 0,
                    request: {id: null, idempotency_key: null}
                };

                await this.handleWebhookEvent(mockEvent);
                eventLog.markAsProcessed();

                console.log(`Successfully retried event: ${eventLog.stripeEventId}`);
            } catch (error: any) {
                console.error(`Retry failed for event ${eventLog.stripeEventId}:`, error.message);
                eventLog.markAsFailed(error.message);
            }
        }

        await this.em.flush();
    }

    private async handleWebhookEvent(event: Stripe.Event): Promise<void> {

        switch (event.type) {
            case 'customer.created':
            case 'customer.updated':
                await this.handleCustomerManaged(event.data.object as Stripe.Customer);
                break;

            case 'customer.deleted':
                await this.handleCustomerDeleted(event.data.object as Stripe.Customer);
                break;

            case 'payment_method.attached':
            case 'payment_method.updated':
                await this.handlePaymentMethodAttached((event.data.object as Stripe.PaymentMethod).id);
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await this.handleSubscriptionChanged(event.data.object as Stripe.Subscription);
                break;

            case 'customer.subscription.deleted':
                await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                break;

            case 'invoice.created':
            case 'invoice.updated':
            case 'invoice.finalized':
                await this.invoiceService.syncFromStripe((event.data.object as Stripe.Invoice).id);
                break;

            case 'invoice.paid':
                await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
                break;

            case 'invoice.payment_failed':
                await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
                break;

            case 'charge.succeeded':
            case 'charge.failed':
            case 'charge.refunded':
                await this.transactionService.syncTransactionFromStripe((event.data.object as Stripe.Charge).id);
                break;
            case 'payment_intent.succeeded':
            case 'payment_intent.payment_failed':
                await this.handlePaymentIntent(event.data.object as Stripe.PaymentIntent);
                break;
            case 'payment_method.detached':
                await this.handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod);
                break;
            // Product events (NUEVOS)
            case 'product.updated':
                await this.handlePlanManaged(event.data.object as Stripe.Product);
                break;

            case 'product.deleted':
                await this.handlePlanDeleted(event.data.object as Stripe.Product);
                break;

            // Price events
            case 'price.created':
            case 'price.updated':
                await this.handlePriceManaged(event.data.object as Stripe.Price);
                break;

            case 'price.deleted':
                await this.handlePriceDeleted(event.data.object as Stripe.Price);
                break;
            default:
                console.log(`Unhandled webhook event type: ${event.type}`);
        }
    }

    private async handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod
    ): Promise<void> {
        const existingPaymentMethod = await this.em.findOne<PaymentMethod>(PaymentMethod, {
            stripePaymentMethodId: paymentMethod.id
        });

        if (existingPaymentMethod) {
            existingPaymentMethod.updated_at = new Date();
            await this.em.persistAndFlush(existingPaymentMethod);
            console.log(`Payment method ${paymentMethod.id} marked as detached`);
        }
    }

    private async handleCustomerManaged(customer: Stripe.Customer): Promise<void> {
        await this.customerService.syncCustomerFromStripe(customer.id);
    }

    private async handleCustomerDeleted(customer: Stripe.Customer): Promise<void> {
        const existingCustomer = await this.customerService.findByStripeCustomerId(customer.id);
        if (existingCustomer) {
            await this.customerService.deactivateCustomer(customer.id);
        }
    }

    private async handlePaymentIntent(paymentIntent: Stripe.PaymentIntent): Promise<void> {
        if (paymentIntent.latest_charge) {
            await this.transactionService.syncTransactionFromStripe(paymentIntent.latest_charge as string);
        }
    }

    private async handleInvoicePaid(invoice: Stripe.Invoice,): Promise<void> {
        await this.invoiceService.syncFromStripe(invoice.id);

        if (invoice.subscription) {
            await this.subscriptionService.syncSubscriptionFromStripe(invoice.subscription as string);
        }

        console.log(`Invoice paid and synced: ${invoice.id} for customer: ${invoice.customer}`);
    }

    private async handlePaymentMethodAttached(id: string): Promise<void> {
        await this.paymentMethodService.syncPaymentMethodFromStripe(id);
    }

    private async handleSubscriptionChanged(subscription: Stripe.Subscription): Promise<void> {
        await this.subscriptionService.syncSubscriptionFromStripe(subscription.id);
    }

    private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
        // Sincronizar para actualizar el estado a cancelado
        await this.subscriptionService.syncSubscriptionFromStripe(subscription.id);
    }

    private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
        console.log(`Invoice payment failed: ${invoice.id} for customer: ${invoice.customer}`);

        // Sincronizar suscripción relacionada si existe
        if (invoice.subscription) {
            await this.subscriptionService.syncSubscriptionFromStripe(invoice.subscription as string);
        }
    }

    private async handlePlanManaged(product: Stripe.Product): Promise<void> {
        await this.planService.syncPlanFromProduct(product.id);
    }

    private async handlePlanDeleted(product: Stripe.Product): Promise<void> {
        await this.planService.archivePlanFromProduct(product.id);
    }

    private async handlePriceManaged(price: Stripe.Price): Promise<void> {
        await this.planService.syncPlanFromStripe(price.id);
    }

    private async handlePriceDeleted(price: Stripe.Price): Promise<void> {
        await this.planService.archivePlanFromPrice(price.id);
    }

}