import {Entity, PrimaryKey, Property, ManyToOne, Enum} from '@mikro-orm/core';
import {User} from "./User";
import {BaseEntity} from "./BaseEntity";
import {CreditCardProvider, CreditCardType, PaymentMethodStatus, PaymentMethodType} from '../types/enums';

@Entity()
export class PaymentMethod extends BaseEntity {

    @Property()
    stripePaymentMethodId!: string; // ID del payment method en Stripe

    @ManyToOne(() => User)
    user!: User;

    @Property()
    cardBrand!: CreditCardProvider; // visa, mastercard, etc.

    @Property()
    cardLast4!: string;

    @Property()
    type!: PaymentMethodType;

    @Property()
    cardExpMonth!: number;

    @Property()
    cardExpYear!: number;

    @Enum(() => PaymentMethodStatus)
    status: PaymentMethodStatus = PaymentMethodStatus.ACTIVE;

    @Property({ default: false })
    isDefault: boolean = false;

}
