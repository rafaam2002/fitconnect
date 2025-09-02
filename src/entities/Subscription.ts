import {Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection, Index, Enum} from '@mikro-orm/core';
import { v4 } from 'uuid';
import {StripeCustomer} from "./StripeCustomer";
import {User} from "./User";
import {PaymentMethod} from "./PaymentMethod";
import {BaseEntity} from "./BaseEntity";
import {Plan} from "./Plan";
import {Invoice} from "./Invoice";


export enum SubscriptionStatus {
    INCOMPLETE = 'incomplete',
    INCOMPLETE_EXPIRED = 'incomplete_expired',
    TRIALING = 'trialing',
    ACTIVE = 'active',
    PAST_DUE = 'past_due',
    CANCELED = 'canceled',
    UNPAID = 'unpaid',
    PAUSED = 'paused'
}

@Entity()
export class Subscription  extends BaseEntity{
    @Property({ length: 100 })
    @Index()
    stripeSubscriptionId!: string; // sub_xxxxx

    @ManyToOne(() => User)
    @Index()
    user!: User;

    @ManyToOne(() => StripeCustomer)
    stripeCustomer!: StripeCustomer;

    @ManyToOne(() => Plan)
    plan!: Plan;

    @ManyToOne(() => PaymentMethod, { nullable: true })
    defaultPaymentMethod?: PaymentMethod;

    @Enum( () => SubscriptionStatus)
    @Index()
    status!: SubscriptionStatus;

    @Property({ type: 'datetime', nullable: true })
    currentPeriodStart?: Date;

    @Property({ type: 'datetime', nullable: true })
    @Index()
    currentPeriodEnd?: Date;

    @Property({ type: 'datetime', nullable: true })
    trialStart?: Date;

    @Property({ type: 'datetime', nullable: true })
    trialEnd?: Date;

    @Property({ type: 'datetime', nullable: true })
    canceledAt?: Date;

    @Property({ type: 'datetime', nullable: true })
    cancelAtPeriodEnd?: boolean;

    @Property({ type: 'datetime', nullable: true })
    endedAt?: Date;

    @Property({ type: 'bigint', nullable: true })
    quantity?: number;

    @Property({ type: 'json', nullable: true })
    metadata?: Record<string, any>;

    // Relaciones
    @OneToMany(() => Invoice, invoice => invoice.subscription)
    invoices = new Collection<Invoice>(this);

    /*get isActive(): boolean {
        return [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING].includes(this.status);
    }*/

    get isInTrial(): boolean {
        return this.status === SubscriptionStatus.TRIALING;
    }

    get isPastDue(): boolean {
        return this.status === SubscriptionStatus.PAST_DUE;
    }

    get daysUntilRenewal(): number | null {
        if (!this.currentPeriodEnd) return null;
        const now = new Date();
        const diff = this.currentPeriodEnd.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
}
