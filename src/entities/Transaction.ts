import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/core';

import { BaseEntity } from './BaseEntity';
import { Company } from './Company';
import { Invoice } from './Invoice';
import { PaymentMethod } from './PaymentMethod';
import { Subscription } from './Subscription';
import { User } from './User';

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
  /**
   * ID de la operación en el procesador externo (Redsys, Braintree, Adyen…).
   * Opcional — en operaciones internas puede quedar vacío.
   * Reemplaza a stripeChargeId y stripePaymentIntentId.
   */
  @Property({ length: 200, nullable: true })
  @Index()
  externalTransactionId?: string;

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

  @Property({ length: 10, default: 'eur' })
  currency: string = 'eur';

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text', nullable: true })
  failureReason?: string;

  @Property({ type: 'json', nullable: true })
  metadata?: Record<string, any>;
}
