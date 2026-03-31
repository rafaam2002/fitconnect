import { EntityManager, QueryOrder } from '@mikro-orm/core';
import Stripe from 'stripe';

import { PaymentMethod } from '../entities/PaymentMethod';
import {
  WebhookEventLog,
  WebhookEventStatus,
} from '../entities/WebhookEventLog';
import { ServiceResponse } from '../types/common.type';
import {
  BadRequestError,
  createServiceResponse,
  InternalServerError,
  NotFoundError,
} from '../utils/errors.util';

import { BaseService } from './base.service';
import { CustomerService } from './customer.service';
import { InvoiceService } from './invoice.service';
import { PaymentMethodService } from './payment.method.service';
import { PlanService } from './plan.service';
import { SubscriptionService } from './subscription.service';
import { TransactionService } from './transaction.service';

export class WebhookService extends BaseService {
  private readonly customerService: CustomerService;
  private readonly paymentMethodService: PaymentMethodService;
  private readonly subscriptionService: SubscriptionService;
  private readonly transactionService: TransactionService;
  private readonly invoiceService: InvoiceService;
  private readonly planService: PlanService;

  constructor(em: EntityManager) {
    super(em);
    this.planService = new PlanService(em);
    this.customerService = new CustomerService(em);
    this.paymentMethodService = new PaymentMethodService(em);
    this.subscriptionService = new SubscriptionService(em);
    this.transactionService = new TransactionService(em);
    this.invoiceService = new InvoiceService(em);
  }

  /**
   * Obtener logs de eventos webhook con filtros y paginación
   */
  public async getWebhookEventLogs(
    status?: WebhookEventStatus,
    eventType?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ServiceResponse> {
    // Validar límite
    if (limit <= 0 || limit > 100) {
      throw new BadRequestError('Limit must be between 1 and 100');
    }

    if (offset < 0) {
      throw new BadRequestError('Offset must be non-negative');
    }

    try {
      const conditions: any = {};
      if (status) conditions.status = status;
      if (eventType) conditions.eventType = eventType;

      const eventLogs = await this.em.find(WebhookEventLog, conditions, {
        orderBy: { created_at: QueryOrder.DESC },
        limit,
        offset,
      });

      const total = await this.em.count(WebhookEventLog, conditions);

      return createServiceResponse(
        200,
        'Webhook event logs fetched successfully',
        true,
        {
          eventLogs,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
          },
        }
      );
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      throw new InternalServerError('Error fetching webhook event logs');
    }
  }

  /**
   * Obtener log de evento webhook por ID de Stripe
   */
  public async getWebhookEventLog(
    stripeEventId: string
  ): Promise<ServiceResponse> {
    if (!stripeEventId) {
      throw new BadRequestError('Stripe event ID is required');
    }

    const eventLog = await this.em.findOne(WebhookEventLog, {
      stripeEventId,
    });

    if (!eventLog) {
      throw new NotFoundError('Webhook event log');
    }

    try {
      return createServiceResponse(
        200,
        'Webhook event log fetched successfully',
        true,
        {
          eventLog,
        }
      );
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      throw new InternalServerError('Error fetching webhook event log');
    }
  }

  /**
   * Obtener eventos webhook fallidos
   */
  public async getFailedWebhookEvents(
    maxRetries: number = 3,
    limit: number = 20
  ): Promise<ServiceResponse> {
    if (maxRetries < 0) {
      throw new BadRequestError('Max retries must be non-negative');
    }

    if (limit <= 0 || limit > 100) {
      throw new BadRequestError('Limit must be between 1 and 100');
    }

    try {
      const failedEvents = await this.em.find(
        WebhookEventLog,
        {
          status: WebhookEventStatus.FAILED,
          retryCount: { $lt: maxRetries },
        },
        {
          orderBy: { created_at: QueryOrder.DESC },
          limit,
        }
      );

      return createServiceResponse(
        200,
        'Failed webhook events fetched successfully',
        true,
        {
          failedEvents,
          count: failedEvents.length,
        }
      );
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      throw new InternalServerError('Error fetching failed webhook events');
    }
  }

  /**
   * Obtener estadísticas de webhooks
   */
  public async getWebhookStats(): Promise<ServiceResponse> {
    try {
      const [totalEvents, processedEvents, failedEvents, pendingEvents] =
        await Promise.all([
          this.em.count(WebhookEventLog, {}),
          this.em.count(WebhookEventLog, {
            status: WebhookEventStatus.PROCESSED,
          }),
          this.em.count(WebhookEventLog, { status: WebhookEventStatus.FAILED }),
          this.em.count(WebhookEventLog, {
            status: WebhookEventStatus.PENDING,
          }),
        ]);

      const stats = {
        total: totalEvents,
        processed: processedEvents,
        failed: failedEvents,
        pending: pendingEvents,
        successRate:
          totalEvents > 0 ? (processedEvents / totalEvents) * 100 : 0,
      };

      return createServiceResponse(
        200,
        'Webhook statistics fetched successfully',
        true,
        {
          stats,
        }
      );
    } catch (error: any) {
      throw new InternalServerError(
        `Error fetching webhook statistics ${error.message}`
      );
    }
  }

  /**
   * Procesar webhook de Stripe
   */
  public async processWebhook(
    body: string,
    signature: string
  ): Promise<ServiceResponse> {
    if (!body || !signature) {
      throw new BadRequestError('Body and signature are required');
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new InternalServerError('STRIPE_WEBHOOK_SECRET not configured');
    }

    let event: Stripe.Event;

    try {
      // Verificar firma del webhook
      event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error: any) {
      console.error('Webhook signature verification failed:', error.message);
      throw new BadRequestError(
        `Webhook signature verification failed: ${error.message}`
      );
    }

    const em = this.em.fork();

    // Verificar si ya hemos procesado este evento
    const existingLog = await em.findOne(WebhookEventLog, {
      stripeEventId: event.id,
    });

    if (existingLog?.status === WebhookEventStatus.PROCESSED) {
      console.log(`Event ${event.id} already processed, skipping...`);
      return createServiceResponse(200, 'Webhook already processed', true);
    }

    // Crear o actualizar log del evento
    let eventLog =
      existingLog ??
      em.create<WebhookEventLog>(WebhookEventLog, {
        stripeEventId: event.id,
        eventType: event.type,
        payload: event.data.object,
        status: WebhookEventStatus.PENDING,
        created_at: new Date(),
        retryCount: 0,
      });

    em.persist(eventLog);
    await em.flush();

    try {
      console.log(`Processing webhook event: ${event.type} (${event.id})`);

      // Procesar evento según su tipo con timeout
      await Promise.race([
        this.handleWebhookEvent(event),
        new Promise(
          (_, reject) =>
            setTimeout(
              () => reject(new Error('Webhook processing timeout')),
              25000
            ) // 25s timeout
        ),
      ]);

      eventLog.markAsProcessed();
      console.log(
        `Successfully processed webhook event: ${event.type} (${event.id})`
      );
    } catch (error: any) {
      console.error(
        `Failed to process webhook event ${event.type} (${event.id}):`,
        error.message
      );
      eventLog.markAsFailed(error.message);
    }

    em.persist(eventLog);
    await em.flush();

    return createServiceResponse(200, 'Webhook processed successfully', true);
  }

  /**
   * Reintentar eventos fallidos
   */
  public async retryFailedEvents(
    maxRetries: number = 3
  ): Promise<ServiceResponse> {
    if (maxRetries < 0) {
      throw new BadRequestError('Max retries must be non-negative');
    }
    try {
      const failedEvents = await this.em.find(
        WebhookEventLog,
        {
          status: WebhookEventStatus.FAILED,
          retryCount: { $lt: maxRetries },
        },
        {
          orderBy: { created_at: QueryOrder.ASC },
          limit: 10,
        }
      );

      let successCount = 0;
      let failCount = 0;

      for (const eventLog of failedEvents) {
        try {
          console.log(
            `Retrying failed event: ${eventLog.eventType} (${eventLog.stripeEventId})`
          );

          // Simular el evento de Stripe para reprocess
          const mockEvent: Stripe.Event = {
            id: eventLog.stripeEventId,
            type: eventLog.eventType as any,
            data: { object: eventLog.payload },
            api_version: '2023-10-16',
            created: Math.floor(eventLog.created_at.getTime() / 1000),
            livemode: false,
            object: 'event',
            pending_webhooks: 0,
            request: { id: null, idempotency_key: null },
          };

          await this.handleWebhookEvent(mockEvent);
          eventLog.markAsProcessed();
          successCount++;

          console.log(`Successfully retried event: ${eventLog.stripeEventId}`);
        } catch (error: any) {
          console.error(
            `Retry failed for event ${eventLog.stripeEventId}:`,
            error.message
          );
          eventLog.markAsFailed(error.message);
          failCount++;
        }
      }

      await this.em.flush();

      return createServiceResponse(200, 'Failed events retry completed', true, {
        total: failedEvents.length,
        succeeded: successCount,
        failed: failCount,
      });
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      throw new InternalServerError('Error retrying failed events');
    }
  }

  /**
   * Reintentar evento webhook específico
   */
  public async retryWebhookEvent(
    stripeEventId: string
  ): Promise<ServiceResponse> {
    if (!stripeEventId) {
      throw new BadRequestError('Stripe event ID is required');
    }

    const eventLog = await this.em.findOne(WebhookEventLog, {
      stripeEventId,
    });

    if (!eventLog) {
      throw new NotFoundError('Webhook event log');
    }

    if (eventLog.status === WebhookEventStatus.PROCESSED) {
      throw new BadRequestError('Event already processed');
    }

    try {
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
        request: { id: null, idempotency_key: null },
      };

      await this.handleWebhookEvent(mockEvent);
      eventLog.markAsProcessed();
      await this.em.flush();

      return createServiceResponse(
        200,
        'Webhook event retried successfully',
        true,
        {
          eventLog,
        }
      );
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      throw new InternalServerError('Error retrying webhook event');
    }
  }

  /**
   * Eliminar log de evento webhook
   */
  public async deleteWebhookEventLog(
    stripeEventId: string
  ): Promise<ServiceResponse> {
    if (!stripeEventId) {
      throw new BadRequestError('Stripe event ID is required');
    }

    const eventLog = await this.em.findOne(WebhookEventLog, {
      stripeEventId,
    });

    if (!eventLog) {
      throw new NotFoundError('Webhook event log');
    }

    try {
      this.em.remove(eventLog);
      await this.em.flush();

      return createServiceResponse(
        200,
        'Webhook event log deleted successfully',
        true
      );
    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      throw new InternalServerError('Error deleting webhook event log');
    }
  }

  /**
   * Limpiar logs antiguos de webhooks
   */
  public async cleanupOldWebhookLogs(
    daysOld: number = 30,
    status?: WebhookEventStatus
  ): Promise<ServiceResponse> {
    if (daysOld < 0) {
      throw new BadRequestError('Days old must be non-negative');
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const conditions: any = {
        created_at: { $lt: cutoffDate },
      };

      if (status) {
        conditions.status = status;
      }

      const deletedCount = await this.em.nativeDelete(
        WebhookEventLog,
        conditions
      );

      return createServiceResponse(
        200,
        'Old webhook logs cleaned up successfully',
        true,
        {
          deletedCount,
        }
      );
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      throw new InternalServerError('Error cleaning up old webhook logs');
    }
  }

  // ============= MÉTODOS PRIVADOS =============

  /**
   * Manejar evento webhook según su tipo
   */
  private async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.created':
      case 'customer.updated':
        await this.handleCustomerManaged(event.data.object);
        break;

      case 'customer.deleted':
        await this.handleCustomerDeleted(event.data.object);
        break;

      case 'payment_method.attached':
      case 'payment_method.updated':
        await this.handlePaymentMethodAttached(event.data.object.id);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionChanged(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.created':
      case 'invoice.updated':
      case 'invoice.finalized':
        await this.invoiceService.syncFromStripe(event.data.object.id);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object);
        break;

      case 'charge.succeeded':
      case 'charge.failed':
      case 'charge.refunded':
        await this.transactionService.syncTransactionFromStripe(
          event.data.object.id
        );
        break;

      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntent(event.data.object);
        break;

      case 'payment_method.detached':
        await this.handlePaymentMethodDetached(event.data.object);
        break;

      case 'product.updated':
        await this.handlePlanManaged(event.data.object);
        break;

      case 'product.deleted':
        await this.handlePlanDeleted(event.data.object);
        break;

      case 'price.created':
      case 'price.updated':
        await this.handlePriceManaged(event.data.object);
        break;

      case 'price.deleted':
        await this.handlePriceDeleted(event.data.object);
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  private async handlePaymentMethodDetached(
    paymentMethod: Stripe.PaymentMethod
  ): Promise<void> {
    const existingPaymentMethod = await this.em.findOne<PaymentMethod>(
      PaymentMethod,
      {
        stripePaymentMethodId: paymentMethod.id,
      }
    );

    if (existingPaymentMethod) {
      existingPaymentMethod.updated_at = new Date();
      this.em.persist(existingPaymentMethod);
      await this.em.flush();
      console.log(`Payment method ${paymentMethod.id} marked as detached`);
    }
  }

  private async handleCustomerManaged(
    customer: Stripe.Customer
  ): Promise<void> {
    await this.customerService.syncCustomerFromStripe(customer.id);
  }

  private async handleCustomerDeleted(
    customer: Stripe.Customer
  ): Promise<void> {
    const existingCustomer = await this.customerService.findByStripeCustomerId(
      customer.id
    );
    if (existingCustomer) {
      await this.customerService.deactivateCustomer(customer.id);
    }
  }

  private async handlePaymentIntent(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    if (paymentIntent.latest_charge) {
      await this.transactionService.syncTransactionFromStripe(
        paymentIntent.latest_charge as string
      );
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    await this.invoiceService.syncFromStripe(invoice.id);

    if (invoice.subscription) {
      await this.subscriptionService.syncSubscriptionFromStripe(
        invoice.subscription as string
      );
    }

    console.log(
      `Invoice paid and synced: ${invoice.id} for customer: ${invoice.customer as string}`
    );
  }

  private async handlePaymentMethodAttached(id: string): Promise<void> {
    await this.paymentMethodService.syncPaymentMethodFromStripe(id);
  }

  private async handleSubscriptionChanged(
    subscription: Stripe.Subscription
  ): Promise<void> {
    await this.subscriptionService.syncSubscriptionFromStripe(subscription.id);
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription
  ): Promise<void> {
    // Sincronizar para actualizar el estado ha cancelado
    await this.subscriptionService.syncSubscriptionFromStripe(subscription.id);
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice
  ): Promise<void> {
    console.log(
      `Invoice payment failed: ${invoice.id} for customer: ${invoice.customer as string}`
    );

    // Sincronizar suscripción relacionada si existe
    if (invoice.subscription) {
      await this.subscriptionService.syncSubscriptionFromStripe(
        invoice.subscription as string
      );
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
