import {
  Collection,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  Property,
  Unique,
} from '@mikro-orm/core';

import { BaseEntity } from './BaseEntity';
import { PaymentMethod } from './PaymentMethod';
import { Subscription } from './Subscription';
import { User } from './User';

@Entity()
export class StripeCustomer extends BaseEntity {
  @Property({ length: 100 })
  @Index()
  @Unique()
  stripeCustomerId!: string; // cus_xxxxx

  @ManyToOne(() => User, { eager: true, deleteRule: 'cascade' })
  @Index()
  user!: User;

  @Property({ type: 'boolean', default: true })
  @Index()
  isActive: boolean = true;

  @Property({ type: 'json', nullable: true })
  metadata?: Record<string, any> | null;

  @Property({ length: 10, default: 'usd' })
  defaultCurrency: string = 'usd';

  // Relaciones
  @OneToMany(() => PaymentMethod, paymentMethod => paymentMethod.stripeCustomer)
  paymentMethods = new Collection<PaymentMethod>(this);

  @OneToMany(() => Subscription, subscription => subscription.stripeCustomer)
  subscriptions = new Collection<Subscription>(this);
}
