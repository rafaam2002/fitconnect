import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/core';

import { BaseEntity } from './BaseEntity';
import { Company } from './Company';
import { Customer } from './Customer';
import { PaymentMethod } from './PaymentMethod';
import { Plan } from './Plan';
import { User } from './User';

export enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
  PAUSED = 'paused',
}

@Entity()
export class Subscription extends BaseEntity {
  @ManyToOne(() => User, { deleteRule: 'cascade' })
  @Index()
  user!: User;

  @ManyToOne(() => Customer)
  customer!: Customer;

  @ManyToOne(() => Plan)
  plan!: Plan;

  @ManyToOne(() => PaymentMethod, { nullable: true })
  defaultPaymentMethod?: PaymentMethod;

  @Enum(() => SubscriptionStatus)
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

  @Property({ type: 'boolean', nullable: true })
  cancelAtPeriodEnd?: boolean;

  @Property({ type: 'datetime', nullable: true })
  endedAt?: Date;

  @Property({ type: 'datetime', nullable: true })
  nextBillingDate?: Date;

  // Nueva: número de intentos de cobro fallidos
  @Property({ type: 'smallint', default: 0 })
  failedPaymentAttempts: number = 0;

  @ManyToOne(() => Company, { nullable: true })
  @Index()
  company: Company;

  get isActive(): boolean {
    return [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING].includes(
      this.status
    );
  }

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
