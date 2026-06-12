import { EntityManager } from '@mikro-orm/core';

import { Invoice, InvoiceStatus } from '../entities/Invoice';
import { Subscription } from '../entities/Subscription';
import { User } from '../entities/User';
import { ServiceResponse } from '../types/common.type';
import {
  BadRequestError,
  createServiceResponse,
  NotFoundError,
} from '../utils/errors.util';

import { BaseService } from './base.service';

export interface CreateInvoiceInput {
  userId: string;
  subscriptionId?: string;
  subtotal: number;
  tax?: number;
  currency?: string;
  dueDate?: Date;
  periodStart?: Date;
  periodEnd?: Date;
  description?: string;
  lineItems?: any[];
  metadata?: Record<string, any>;
  companyId?: string;
}

/**
 * InvoiceService
 *
 * Gestiona el ciclo de vida de las facturas de forma completamente autónoma.
 * Ya no existe ninguna referencia a Stripe Invoices.
 *
 * Las facturas las crea el propio sistema (via SubscriptionService/BillingCycleService)
 * y se numeran con un secuencial interno.
 */
export class InvoiceService extends BaseService {
  constructor(em: EntityManager) {
    super(em);
  }

  // ─────────────────────────────────────────────
  // CREACIÓN
  // ─────────────────────────────────────────────

  /**
   * Crea una factura manualmente o desde el ciclo de billing.
   * Asigna automáticamente el número de factura interno.
   */
  async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    const user = await this.em.findOne(User, { id: input.userId });
    if (!user) throw new NotFoundError('User');

    let subscription: Subscription | null = null;
    if (input.subscriptionId) {
      subscription = await this.em.findOne(Subscription, {
        id: input.subscriptionId,
      });
      if (!subscription) throw new NotFoundError('Subscription');
    }

    const tax = input.tax ?? 0;
    const total = input.subtotal + tax;
    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = this.em.create(Invoice, {
      invoiceNumber,
      user,
      subscription: subscription ?? undefined,
      status: InvoiceStatus.OPEN,
      subtotal: input.subtotal,
      tax,
      total,
      amountPaid: 0,
      amountRemaining: total,
      currency: input.currency ?? 'eur',
      dueDate: input.dueDate,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      description: input.description,
      lineItems: input.lineItems,
      metadata: input.metadata,
      company: input.companyId,
    });

    this.em.persist(invoice);
    await this.em.flush();

    return invoice;
  }

  /**
   * Crea una factura para una suscripción en el momento de la renovación.
   * Llamado por SubscriptionService.processBillingCycle().
   */
  async createForSubscription(subscription: Subscription): Promise<Invoice> {
    const plan = subscription.plan;

    const periodStart = subscription.currentPeriodEnd ?? new Date();
    const periodEnd = this.calculatePeriodEnd(
      periodStart,
      plan.interval,
      plan.intervalCount
    );

    return this.createInvoice({
      userId: subscription.user.id,
      subscriptionId: subscription.id,
      subtotal: plan.amount,
      tax: 0,
      currency: plan.currency,
      dueDate: new Date(), // vence inmediatamente — se cobra en el momento
      periodStart,
      periodEnd,
      description: `Subscription renewal — ${plan.name}`,
      lineItems: [
        {
          description: plan.name,
          amount: plan.amount,
          currency: plan.currency,
          period: { start: periodStart, end: periodEnd },
        },
      ],
      companyId: subscription.company?.id,
    });
  }

  // ─────────────────────────────────────────────
  // LECTURA
  // ─────────────────────────────────────────────

  /**
   * Facturas de un usuario ordenadas por fecha descendente.
   */
  async findByUserId(userId: string): Promise<Invoice[]> {
    return this.em.find(
      Invoice,
      { user: userId },
      {
        orderBy: { created_at: 'DESC' } as any,
        populate: ['user', 'subscription', 'transactions'],
      }
    );
  }

  /**
   * Facturas de una suscripción.
   */
  async findBySubscription(subscription: Subscription): Promise<Invoice[]> {
    return this.em.find(
      Invoice,
      { subscription },
      {
        orderBy: { created_at: 'DESC' } as any,
        populate: ['user', 'subscription', 'transactions'],
      }
    );
  }

  /**
   * Facturas por estado.
   */
  async findByStatus(status: InvoiceStatus): Promise<Invoice[]> {
    return this.em.find(
      Invoice,
      { status },
      {
        orderBy: { created_at: 'DESC' } as any,
        populate: ['user', 'subscription', 'transactions'],
      }
    );
  }

  /**
   * Facturas vencidas (OPEN + dueDate en el pasado).
   */
  async findOverdueInvoices(): Promise<Invoice[]> {
    const now = new Date();
    return this.em.find(
      Invoice,
      { status: InvoiceStatus.OPEN, dueDate: { $lt: now } },
      {
        orderBy: { dueDate: 'ASC' },
        populate: ['user', 'subscription'],
      }
    );
  }

  /**
   * Facturas en un rango de fechas, opcionalmente filtradas por usuario.
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<Invoice[]> {
    const conditions: any = {
      created_at: { $gte: startDate, $lte: endDate },
    };
    if (userId) conditions.user = userId;

    return this.em.find(Invoice, conditions, {
      orderBy: { created_at: 'DESC' } as any,
      populate: ['user', 'subscription', 'transactions'],
    });
  }

  /**
   * Facturas abiertas que vencen en el próximo mes (próximas a cobrar).
   */
  async getUpcomingInvoices(userId: string): Promise<Invoice[]> {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);

    return this.em.find(
      Invoice,
      {
        user: userId,
        status: InvoiceStatus.OPEN,
        dueDate: { $gte: new Date(), $lte: futureDate },
      },
      {
        orderBy: { dueDate: 'ASC' },
        populate: ['user', 'subscription'],
      }
    );
  }

  // ─────────────────────────────────────────────
  // CAMBIO DE ESTADO
  // ─────────────────────────────────────────────

  /**
   * Marca una factura como pagada.
   * Llamado por SubscriptionService tras un cobro exitoso.
   */
  async markAsPaid(invoiceId: string, paidAt?: Date): Promise<Invoice> {
    const invoice = await this.em.findOne(Invoice, { id: invoiceId });
    if (!invoice) throw new NotFoundError('Invoice');

    invoice.status = InvoiceStatus.PAID;
    invoice.paidAt = paidAt ?? new Date();
    invoice.amountPaid = invoice.total;
    invoice.amountRemaining = 0;

    this.em.persist(invoice);
    await this.em.flush();

    return invoice;
  }

  /**
   * Marca una factura como incobrable.
   */
  async markAsUncollectible(invoiceId: string): Promise<ServiceResponse> {
    const invoice = await this.em.findOne(Invoice, { id: invoiceId });
    if (!invoice) throw new NotFoundError('Invoice');

    invoice.status = InvoiceStatus.UNCOLLECTIBLE;
    await this.em.flush();

    return createServiceResponse(200, 'Invoice marked as uncollectible', true, {
      invoice,
    });
  }

  /**
   * Anula una factura.
   */
  async voidInvoice(invoiceId: string): Promise<ServiceResponse> {
    const invoice = await this.em.findOne(Invoice, { id: invoiceId });
    if (!invoice) throw new NotFoundError('Invoice');

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestError(
        'Cannot void a paid invoice. Use a refund instead.'
      );
    }

    invoice.status = InvoiceStatus.VOID;
    await this.em.flush();

    return createServiceResponse(200, 'Invoice voided successfully', true, {
      invoice,
    });
  }

  // ─────────────────────────────────────────────
  // ESTADÍSTICAS
  // ─────────────────────────────────────────────

  /**
   * Estadísticas de facturación de un usuario.
   */
  async getInvoiceStats(userId: string): Promise<ServiceResponse> {
    const invoices = await this.findByUserId(userId);

    const stats = {
      total: invoices.length,
      paid: 0,
      pending: 0,
      overdue: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      overdueAmount: 0,
    };

    invoices.forEach(invoice => {
      stats.totalAmount += invoice.total;

      if (invoice.isPaid) {
        stats.paid++;
        stats.paidAmount += invoice.total;
      } else if (invoice.isOverdue) {
        stats.overdue++;
        stats.overdueAmount += invoice.total;
      } else {
        stats.pending++;
        stats.pendingAmount += invoice.total;
      }
    });

    return createServiceResponse(
      200,
      'Invoice stats fetched successfully',
      true,
      { stats }
    );
  }

  /**
   * Ingresos en un rango de fechas.
   */
  async calculateRevenue(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRevenue: number;
    paidRevenue: number;
    pendingRevenue: number;
    invoiceCount: number;
  }> {
    const invoices = await this.findByDateRange(startDate, endDate);

    const revenue = {
      totalRevenue: 0,
      paidRevenue: 0,
      pendingRevenue: 0,
      invoiceCount: invoices.length,
    };

    invoices.forEach(invoice => {
      revenue.totalRevenue += invoice.total;
      if (invoice.isPaid) {
        revenue.paidRevenue += invoice.total;
      } else {
        revenue.pendingRevenue += invoice.total;
      }
    });

    return revenue;
  }

  // ─────────────────────────────────────────────
  // PRIVADOS
  // ─────────────────────────────────────────────

  /**
   * Genera un número de factura secuencial por año.
   * Formato: INV-YYYY-NNNNN  (ej: INV-2025-00042)
   * Usa una consulta COUNT con filtro de año para garantizar unicidad.
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);

    const count = await this.em.count(Invoice, {
      created_at: { $gte: startOfYear },
    } as any);

    return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * Calcula la fecha de fin de período según el intervalo del plan.
   */
  private calculatePeriodEnd(
    start: Date,
    interval: string,
    intervalCount: number
  ): Date {
    switch (interval) {
      case 'day':
        return this.addDays(start, intervalCount);
      case 'week':
        return this.addDays(start, intervalCount * 7);
      case 'month':
        return this.addMonths(start, intervalCount);
      case 'year':
        return this.addYears(start, intervalCount);
      default:
        return this.addMonths(start, 1);
    }
  }
}
