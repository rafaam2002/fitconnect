import {
  Collection,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/core';

import { BaseEntity } from './BaseEntity';
import { PaymentMethod } from './PaymentMethod';
import { Subscription } from './Subscription';
import { User } from './User';

@Entity()
export class Customer extends BaseEntity {
  @ManyToOne(() => User, { eager: true, deleteRule: 'cascade' })
  @Index()
  user!: User;

  @Property({ type: 'boolean', default: true })
  @Index()
  isActive: boolean = true;

  @Property({ length: 10, default: 'eur' })
  defaultCurrency: string = 'eur';

  @Property({ type: 'json', nullable: true })
  metadata?: Record<string, any> | null;

  // Relaciones
  @OneToMany(() => PaymentMethod, paymentMethod => paymentMethod.customer)
  paymentMethods = new Collection<PaymentMethod>(this);

  @OneToMany(() => Subscription, subscription => subscription.customer)
  subscriptions = new Collection<Subscription>(this);
}
