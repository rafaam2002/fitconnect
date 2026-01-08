import {Entity, PrimaryKey, Property, ManyToOne, Index, Unique, Enum} from '@mikro-orm/core';
import { v4 } from 'uuid';
import {StripeCustomer} from "./StripeCustomer";
import {BaseEntity} from "./BaseEntity";
import {Company} from "./Company";

export enum PaymentMethodType {
    CARD = 'card',
    SEPA_DEBIT = 'sepa_debit',
    ACH_DEBIT = 'us_bank_account'
}

export enum PaymentMethodStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    EXPIRED = 'expired'
}

@Entity()
export class PaymentMethod extends BaseEntity  {
    @Property({ length: 100 })
    @Index()
    @Unique()
    stripePaymentMethodId!: string;

    @ManyToOne(() => StripeCustomer)
    @Index()
    stripeCustomer!: StripeCustomer;

    @Enum(()=>PaymentMethodType)
    type!: PaymentMethodType;

    @Enum(() => PaymentMethodStatus)
    status: PaymentMethodStatus = PaymentMethodStatus.ACTIVE;

    // Datos seguros de tarjeta (NO datos sensibles)
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

    @Property({ length: 100, nullable: true })
    @Index()
    fingerprint?: string; // Para detectar duplicados

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