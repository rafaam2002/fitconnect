// src/services/invoice.service.ts
import { EntityManager } from '@mikro-orm/core';
import { BaseService } from './base.service';
import { Invoice, InvoiceStatus } from '../entities/Invoice';
import { Subscription } from '../entities/Subscription';
import { User } from '../entities/User';

export class InvoiceService extends BaseService {
  constructor(em: EntityManager) {
    super(em);
  }

  /**
   * Find invoices by user
   */
  async findByUser(user: UserActivation): Promise<Invoice[]> {
    return this.em.find(
      Invoice,
      { user },
      {
        orderBy: { created_at: 'DESC' },
        populate: ['user', 'subscription', 'transactions'],
      }
    );
  }

  /**
   * Find invoices by user ID
   */
  async findByUserId(userId: string): Promise<Invoice[]> {
    return this.em.find(Invoice, { user: userId }, {
      orderBy: { createdAt: 'DESC' },
      populate: ['user', 'subscription', 'transactions'],
    } as any);
  }

  /**
   * Find invoices by subscription
   */
  async findBySubscription(subscription: Subscription): Promise<Invoice[]> {
    return this.em.find(Invoice, { subscription }, {
      orderBy: { createdAt: 'DESC' },
      populate: ['user', 'subscription', 'transactions'],
    } as any);
  }

  /**
   * Find invoice by Stripe invoice ID
   */
  async findByStripeInvoiceId(
    stripeInvoiceId: string
  ): Promise<Invoice | null> {
    return this.em.findOne(
      Invoice,
      { stripeInvoiceId },
      {
        populate: ['user', 'subscription', 'transactions'],
      }
    );
  }

  /**
   * Find invoices by status
   */
  async findByStatus(status: InvoiceStatus): Promise<Invoice[]> {
    return this.em.find(Invoice, { status }, {
      orderBy: { createdAt: 'DESC' },
      populate: ['user', 'subscription', 'transactions'],
    } as any);
  }

  /**
   * Find overdue invoices
   */
  async findOverdueInvoices(): Promise<Invoice[]> {
    const now = new Date();
    return this.em.find(
      Invoice,
      {
        status: InvoiceStatus.OPEN,
        dueDate: { $lt: now },
      },
      {
        orderBy: { dueDate: 'ASC' },
        populate: ['user', 'subscription'],
      }
    );
  }

  /**
   * Find invoices by date range
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<Invoice[]> {
    const conditions: any = {
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (userId) {
      conditions.user = userId;
    }

    return this.em.find(Invoice, conditions, {
      orderBy: { createdAt: 'DESC' },
      populate: ['user', 'subscription', 'transactions'],
    } as any);
  }

  /**
   * Sync invoice from Stripe
   */
  async syncFromStripe(stripeInvoiceId: string): Promise<Invoice> {
    const stripeInvoice = await this.stripe.invoices.retrieve(stripeInvoiceId, {
      expand: ['subscription', 'customer'],
    });

    let invoice = await this.findByStripeInvoiceId(stripeInvoiceId);
    let user: User | null = null;

    // Find or get user by Stripe customer ID
    if (typeof stripeInvoice.customer === 'string') {
      user = await this.em.findOne(User, {
        stripeCustomerId: stripeInvoice.customer,
      });
    } else if (
      stripeInvoice.customer &&
      typeof stripeInvoice.customer === 'object'
    ) {
      user = await this.em.findOne(User, {
        stripeCustomerId: stripeInvoice.customer.id,
      });
    }

    if (!user) {
      throw new Error(
        `User not found for Stripe customer: ${stripeInvoice.customer}`
      );
    }
    try {
      // Find subscription if exists
      let subscription: Subscription | null = null;
      if (stripeInvoice.subscription) {
        const subscriptionId =
          typeof stripeInvoice.subscription === 'string'
            ? stripeInvoice.subscription
            : stripeInvoice.subscription.id;
        subscription = await this.em.findOne(Subscription, {
          stripeSubscriptionId: subscriptionId,
        });
      }

      if (!invoice) {
        // Create new invoice
        invoice = new Invoice();
        invoice.stripeInvoiceId = stripeInvoice.id;
        invoice.user = user;
        if (subscription) {
          invoice.subscription = subscription;
        }
      }

      // Update invoice data
      invoice.invoiceNumber = stripeInvoice.number || undefined;
      invoice.status = this.mapStripeStatusToEnum(stripeInvoice.status!);
      invoice.subtotal = stripeInvoice.subtotal || 0;
      invoice.tax = stripeInvoice.tax || 0;
      invoice.total = stripeInvoice.total;
      invoice.amountPaid = stripeInvoice.amount_paid || 0;
      invoice.amountRemaining = stripeInvoice.amount_remaining || 0;
      invoice.currency = stripeInvoice.currency;
      invoice.dueDate = stripeInvoice.due_date
        ? new Date(stripeInvoice.due_date * 1000)
        : undefined;
      invoice.paidAt = stripeInvoice.status_transitions?.paid_at
        ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
        : undefined;
      invoice.periodStart = stripeInvoice.period_start
        ? new Date(stripeInvoice.period_start * 1000)
        : undefined;
      invoice.periodEnd = stripeInvoice.period_end
        ? new Date(stripeInvoice.period_end * 1000)
        : undefined;
      invoice.description = stripeInvoice.description || undefined;
      invoice.lineItems = stripeInvoice.lines?.data || undefined;
      invoice.metadata = stripeInvoice.metadata || undefined;

      await this.em.persistAndFlush(invoice);
      return invoice;
    } catch (error) {
      console.error('Error syncing invoice from Stripe:', error);
      throw error;
    }
  }

  /**
   * Get invoice statistics for a user
   */
  async getInvoiceStats(userId: string): Promise<{
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
  }> {
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

    return stats;
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(invoiceId: string): Promise<Invoice> {
    const invoice = await this.em.findOne(Invoice, { id: invoiceId });
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    invoice.status = InvoiceStatus.PAID;
    invoice.paidAt = new Date();
    invoice.amountPaid = invoice.total;
    invoice.amountRemaining = 0;

    await this.em.persistAndFlush(invoice);
    return invoice;
  }

  /**
   * Send invoice via Stripe
   */
  async sendInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = await this.em.findOne(Invoice, { id: invoiceId });
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    try {
      await this.stripe.invoices.sendInvoice(invoice.stripeInvoiceId);
      return invoice;
    } catch (error) {
      console.error('Error sending invoice:', error);
      throw error;
    }
  }

  /**
   * Get upcoming invoices for a user
   */
  async getUpcomingInvoices(userId: string): Promise<Invoice[]> {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1); // Next month

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

  /**
   * Calculate total revenue for a date range
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

  /**
   * Map Stripe status to enum
   */
  private mapStripeStatusToEnum(stripeStatus: string): InvoiceStatus {
    switch (stripeStatus) {
      case 'draft':
        return InvoiceStatus.DRAFT;
      case 'open':
        return InvoiceStatus.OPEN;
      case 'paid':
        return InvoiceStatus.PAID;
      case 'uncollectible':
        return InvoiceStatus.UNCOLLECTIBLE;
      case 'void':
        return InvoiceStatus.VOID;
      default:
        return InvoiceStatus.DRAFT;
    }
  }
}
