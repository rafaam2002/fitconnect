import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/core';

import { BaseEntity } from './BaseEntity';
import { Customer } from './Customer';

export enum PaymentMethodType {
  CARD = 'card',
  SEPA_DEBIT = 'sepa_debit',
  ACH_DEBIT = 'us_bank_account',
}

export enum PaymentMethodStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

@Entity()
export class PaymentMethod extends BaseEntity {
  /**
   * Token opaco devuelto por el procesador de pagos externo (Redsys, Braintree, Adyen…).
   * NUNCA almacenamos datos de tarjeta en crudo — este token es la referencia segura
   * que el procesador nos permite guardar para cobros futuros (card-on-file).
   */
  @Property({ length: 200, nullable: true })
  @Index()
  externalToken?: string;

  @ManyToOne(() => Customer)
  @Index()
  customer!: Customer;

  @Enum(() => PaymentMethodType)
  type!: PaymentMethodType;

  @Enum(() => PaymentMethodStatus)
  status: PaymentMethodStatus = PaymentMethodStatus.ACTIVE;

  // Datos seguros de visualización (NO datos sensibles)
  @Property({ length: 20, nullable: true })
  @Index()
  brand?: string; // visa, mastercard, etc.

  @Property({ length: 4, nullable: true })
  @Index()
  last4?: string;

  @Property({ type: 'smallint', nullable: true })
  @Index()
  expiryMonth?: number;

  @Property({ type: 'smallint', nullable: true })
  @Index()
  expiryYear?: number;

  /**
   * Fingerprint devuelto por el procesador para detectar tarjetas duplicadas.
   * Si el procesador elegido no lo provee, se puede calcular como hash(last4+month+year+brand).
   */
  @Property({ length: 100, nullable: true })
  @Index()
  fingerprint?: string;

  @Property({ length: 50, nullable: true })
  country?: string;

  @Property({ type: 'boolean', default: false })
  isDefault: boolean = false;

  @Property({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>;

  get displayName(): string {
    if (this.type === PaymentMethodType.CARD && this.brand && this.last4) {
      return `${this.brand.toUpperCase()} •••• ${this.last4}`;
    }
    return `${this.type} payment method`;
  }

  get isExpired(): boolean {
    if (!this.expiryMonth || !this.expiryYear) return false;
    const now = new Date();
    const expiry = new Date(this.expiryYear, this.expiryMonth - 1);
    return now > expiry;
  }
}
