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

/**
 * Customer representa el perfil de facturación de un usuario.
 * Reemplaza a StripeCustomer — ya no existe ningún ID externo.
 * Esta tabla es la fuente de verdad del sistema de billing propio.
 */
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
