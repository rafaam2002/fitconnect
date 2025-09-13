import {Entity, PrimaryKey, Property, OneToMany, Collection, Index, Unique, Enum} from '@mikro-orm/core';
import { v4 } from 'uuid';
import {Subscription} from "./Subscription";
import {BaseEntity} from "./BaseEntity";

export enum PlanInterval {
    DAY = 'day',
    WEEK = 'week',
    MONTH = 'month',
    YEAR = 'year'
}

export enum PlanStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    ARCHIVED = 'archived'
}

@Entity()
export class Plan extends BaseEntity  {
    @Property({ length: 100 })
    @Index()
    stripePriceId!: string; // price_xxxxx

    @Property({ length: 100, nullable: true })
    stripeProductId?: string; // prod_xxxxx

    @Property({ length: 100 })
    name!: string;

    @Property({ type: 'text', nullable: true })
    description?: string;

    @Property({ type: 'bigint' })
    amount!: number; // en centavos

    @Property({ length: 10, default: 'usd' })
    currency: string = 'usd';

    @Enum(() => PlanInterval)
    interval!: PlanInterval;

    @Property({ type: 'smallint', default: 1 })
    intervalCount: number = 1;

    @Property({ type: 'smallint', nullable: true })
    trialPeriodDays?: number;

    @Enum( () => PlanStatus)
    @Index()
    status: PlanStatus = PlanStatus.ACTIVE;

    @Property({ type: 'boolean', default: true })
    @Index()
    isActive: boolean = true;

    @Property({ type: 'json', nullable: true })
    features?: string[];

    @Property({ type: 'json', nullable: true })
    metadata?: Record<string, any>;

    // Relaciones
    @OneToMany(() => Subscription, subscription => subscription.plan)
    subscriptions = new Collection<Subscription>(this);

    get formattedAmount(): string {
        return (this.amount / 100).toFixed(2);
    }

    get displayInterval(): string {
        const interval = this.intervalCount === 1 ? this.interval : `${this.intervalCount} ${this.interval}s`;
        return `per ${interval}`;
    }
}