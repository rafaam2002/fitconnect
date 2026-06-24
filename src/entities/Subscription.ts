import {
  Collection,
  Entity,
  Enum,
  Filter,
  Index,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/core';

import { BaseEntity } from './BaseEntity';
import { Company } from './Company';
import { Customer } from './Customer';
import { Invoice } from './Invoice';
import { PaymentMethod } from './PaymentMethod';
import { Plan } from './Plan';
import { Transaction } from './Transaction';
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
@Filter({
  name: 'companyContext',
  cond: args => (args.companyId ? { company: args.companyId } : {}),
  default: true,
})
export class Subscription extends BaseEntity {
  @ManyToOne(() => User, { deleteRule: 'cascade' })
  @Index()
  user!: User;

  /**
   * Relación al perfil de facturación del usuario.
   */
  @ManyToOne(() => Customer)
  customer!: Customer;

  @ManyToOne(() => Plan)
  plan!: Plan;

  @ManyToOne(() => PaymentMethod, { nullable: true })
  defaultPaymentMethod?: PaymentMethod;

  @OneToMany(() => Transaction, transaction => transaction.subscription)
  transactions = new Collection<Transaction>(this);

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

  @Property({ type: 'bigint', nullable: true })
  quantity?: number;

  /**
   * Fecha en que se debe ejecutar el próximo cobro.
   * El CRON de billing filtra por este campo cada día.
   */
  @Property({ type: 'datetime', nullable: true })
  @Index()
  nextBillingDate?: Date;

  /**
   * Contador de intentos de cobro fallidos consecutivos.
   * Se resetea a 0 cuando un cobro tiene éxito.
   * La lógica de dunning usa este valor para decidir reintentos o cancelación.
   */
  @Property({ type: 'smallint', default: 0 })
  failedPaymentAttempts: number = 0;

  @Property({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => Company, { nullable: true })
  @Index()
  company: Company;

  @OneToMany(() => Invoice, invoice => invoice.subscription)
  invoices = new Collection<Invoice>(this);

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
