import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from './BaseEntity';
import { Subscription } from './Subscription';
import { PaymentMethod } from './PaymentMethod';
import { User } from './User';
import { Invoice } from './Invoice';
import { Company } from './Company';

export enum TransactionType {
  CHARGE = 'charge',
  REFUND = 'refund',
  PAYMENT = 'payment',
  SUBSCRIPTION = 'subscription',
}

export enum TransactionStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

@Entity()
export class Transaction extends BaseEntity {
  @Property({ length: 100, nullable: true })
  @Index()
  stripeChargeId?: string; // ch_xxxxx

  @Property({ length: 100, nullable: true })
  stripePaymentIntentId?: string; // pi_xxxxx

  @ManyToOne(() => User)
  @Index()
  user!: User;

  @ManyToOne(() => PaymentMethod, { nullable: true })
  paymentMethod?: PaymentMethod;

  @ManyToOne(() => Subscription, { nullable: true })
  subscription?: Subscription;

  @ManyToOne(() => Company, { nullable: true })
  company: Company;

  @ManyToOne(() => Invoice, { nullable: true })
  @Index()
  invoice?: Invoice;

  @Enum(() => TransactionType)
  @Index()
  type!: TransactionType;

  @Enum(() => TransactionStatus)
  @Index()
  status!: TransactionStatus;

  @Property({ type: 'bigint' })
  amount!: number; // en centavos

  @Property({ type: 'bigint', default: 0 })
  amountRefunded: number = 0;

  @Property({ length: 10, default: 'usd' })
  currency: string = 'usd';

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text', nullable: true })
  failureReason?: string;

  @Property({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  /*private formattedAmount(): string {
        return (this.amount / 100).toFixed(2);
    }

    private formattedAmountRefunded(): string {
        return (this.amountRefunded / 100).toFixed(2);
    }

    private netAmount(): number {
        return this.amount - this.amountRefunded;
    }

    private isSuccessful(): boolean {
        return this.status === TransactionStatus.SUCCEEDED;
    }

    private isRefunded(): boolean {
        return [TransactionStatus.REFUNDED, TransactionStatus.PARTIALLY_REFUNDED].includes(this.status);
    }*/
}
