import { EntityManager } from '@mikro-orm/core';
import { BaseService } from './BaseService.js';
import { CustomerService } from './CustomerService.js';
import { SubscriptionService } from './SubscriptionService.js';
import { TransactionService } from './TransactionService.js';
import Stripe from 'stripe';
import {PaymentMethodService} from "./PaymentMethod";
import {WebhookEventLog, WebhookEventStatus} from "../entities/WebhookEventLog";

export class WebhookService extends BaseService {
    private customerService: CustomerService;
    private paymentMethodService: PaymentMethodService;
    private subscriptionService: SubscriptionService;
    private transactionService: TransactionService;

    constructor(em: EntityManager) {
        super(em);
        this.customerService = new CustomerService(em);
        this.paymentMethodService = new PaymentMethodService(em);
        this.subscriptionService = new SubscriptionService(em);
        this.transactionService = new TransactionService(em);
    }

    async processWebhook(body: string, signature: string): Promise<void> {
        let event: Stripe.Event;

        try {
            // Verificar firma del webhook
            event = this.stripe.webhooks.constructEvent(
                body,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET!
            );
        } catch (error: any) {
            throw new Error(`Webhook signature verification failed: ${error.message}`);
        }

        // Verificar si ya hemos procesado este evento
        const existingLog = await this.em.findOne(WebhookEventLog, {
            stripeEventId: event.id
        });

        if (existingLog && existingLog.status === WebhookEventStatus.PROCESSED) {
            console.log(`Event ${event.id} already processed, skipping...`);
            return;
        }

        // Crear o actualizar log del evento
        let eventLog = existingLog || this.em.create(WebhookEventLog, {
            stripeEventId: event.id,
            eventType: event.type,
            payload: event.data.object,
            status: WebhookEventStatus.PENDING
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

        await this.em.flush();
    }

    private async handleWebhookEvent(event: Stripe.Event): Promise<void> {
        switch (event.type) {
            case 'customer.created':
                await this.handleCustomerCreated(event.data.object as Stripe.Customer);
                break;

            case 'customer.updated':
                await this.handleCustomerUpdated(event.data.object as Stripe.Customer);
                break;

            case 'payment_method.attached':
                await this.handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await this.handleSubscriptionChanged(event.data.object as Stripe.Subscription);
                break;

            case 'customer.subscription.deleted':
                await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                break;

            case 'invoice.paid':
                await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
                break;

            case 'invoice.payment_failed':
                await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
                break;

            case 'charge.succeeded':
                await this.handleChargeSucceeded(event.data.object as Stripe.Charge);
                break;

            case 'charge.failed':
                await this.handleChargeFailed(event.data.object as Stripe.Charge);
                break;

            case 'charge.refunded':
                await this.handleChargeRefunded(event.data.object as Stripe.Charge);
                break;

            default:
                console.log(`Unhandled webhook event type: ${event.type}`);
        }
    }

    private async handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
        await this.customerService.syncCustomerFromStripe(customer.id);
    }

    private async handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
        await this.customerService.syncCustomerFromStripe(customer.id);
    }

    private async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
        await this.paymentMethodService.syncPaymentMethodFromStripe(paymentMethod.id);
    }

    private async handleSubscriptionChanged(subscription: Stripe.Subscription): Promise<void> {
        await this.subscriptionService.syncSubscriptionFromStripe(subscription.id);
    }

    private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
        // Sincronizar para actualizar el estado a cancelado
        await this.subscriptionService.syncSubscriptionFromStripe(subscription.id);
    }

    private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
        // Aquí podrías crear o actualizar una entidad Invoice si la tienes
        console.log(`Invoice paid: ${invoice.id} for customer: ${invoice.customer}`);

        // Sincronizar suscripción relacionada si existe
        if (invoice.subscription) {
            await this.subscriptionService.syncSubscriptionFromStripe(invoice.subscription as string);
        }
    }

    private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
        console.log(`Invoice payment failed: ${invoice.id} for customer: ${invoice.customer}`);

        // Sincronizar suscripción relacionada si existe
        if (invoice.subscription) {
            await this.subscriptionService.syncSubscriptionFromStripe(invoice.subscription as string);
        }
    }

    private async handleChargeSucceeded(charge: Stripe.Charge): Promise<void> {
        await this.transactionService.syncTransactionFromStripe(charge.id);
    }

    private async handleChargeFailed(charge: Stripe.Charge): Promise<void> {
        await this.transactionService.syncTransactionFromStripe(charge.id);
    }

    private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
        await this.transactionService.syncTransactionFromStripe(charge.id);
    }

    async retryFailedEvents(maxRetries: number = 3): Promise<void> {
        const failedEvents = await this.em.find(WebhookEventLog, {
            status: WebhookEventStatus.FAILED,
            retryCount: { $lt: maxRetries }
        }, {
            orderBy: { createdAt: 'ASC' },
            limit: 10
        });

        for (const eventLog of failedEvents) {
            try {
                console.log(`Retrying failed event: ${eventLog.eventType} (${eventLog.stripeEventId})`);

                // Simular el evento de Stripe para reprocessar
                const mockEvent: Stripe.Event = {
                    id: eventLog.stripeEventId,
                    type: eventLog.eventType as any,
                    data: { object: eventLog.payload },
                    api_version: '2023-10-16',
                    created: Math.floor(eventLog.created_at.getTime() / 1000),
                    livemode: false,
                    object: 'event',
                    pending_webhooks: 0,
                    request: { id: null, idempotency_key: null }
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
}