import {Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection, Index, Enum} from '@mikro-orm/core';
import { v4 } from 'uuid';
import {Subscription} from "./Subscription";
import {User} from "./User";
import {Transaction} from "./Transaction";
import {BaseEntity} from "./BaseEntity";

export enum InvoiceStatus {
    DRAFT = 'draft',
    OPEN = 'open',
    PAID = 'paid',
    UNCOLLECTIBLE = 'uncollectible',
    VOID = 'void'
}

@Entity()
export class Invoice extends BaseEntity  {
    @Property({ length: 100 })
    @Index()
    stripeInvoiceId!: string; // in_xxxxx

    @Property({ length: 50, nullable: true })
    invoiceNumber?: string;

    @ManyToOne(() => User)
    @Index()
    user!: User;

    @ManyToOne(() => Subscription, { nullable: true })
    subscription?: Subscription;

    @Enum(() => InvoiceStatus)
    @Index()
    status!: InvoiceStatus;

    @Property({ type: 'bigint' })
    subtotal!: number;

    @Property({ type: 'bigint', default: 0 })
    tax: number = 0;

    @Property({ type: 'bigint' })
    total!: number;

    @Property({ type: 'bigint', default: 0 })
    amountPaid: number = 0;

    @Property({ type: 'bigint', default: 0 })
    amountRemaining: number = 0;

    @Property({ length: 10, default: 'usd' })
    currency: string = 'usd';

    @Property({ type: 'datetime', nullable: true })
    @Index()
    dueDate?: Date;

    @Property({ type: 'datetime', nullable: true })
    paidAt?: Date;

    @Property({ type: 'datetime', nullable: true })
    periodStart?: Date;

    @Property({ type: 'datetime', nullable: true })
    periodEnd?: Date;

    @Property({ type: 'text', nullable: true })
    description?: string;

    @Property({ type: 'json', nullable: true })
    lineItems?: any[];

    @Property({ type: 'json', nullable: true })
    metadata?: Record<string, any>;

    // Relaciones
    @OneToMany(() => Transaction, transaction => transaction.invoice)
    transactions = new Collection<Transaction>(this);

    get isPaid(): boolean {
        return this.status === InvoiceStatus.PAID;
    }

    get isOverdue(): boolean {
        if (!this.dueDate || this.isPaid) return false;
        return new Date() > this.dueDate;
    }

    get formattedTotal(): string {
        return (this.total / 100).toFixed(2);
    }
}