import {Entity, PrimaryKey, Property, ManyToOne, Enum} from '@mikro-orm/core';
import {Subscription} from "./Subscription";
import {User} from "./User";
import {PaymentMethod} from "./PaymentMethod";
import {BaseEntity} from "./BaseEntity";
import { Currency, PaymentMethodType, TransactionStatus } from '../types/enums';


@Entity()
export class Transaction extends BaseEntity{

    @ManyToOne(() => Subscription)
    subscription!: Subscription;

    @ManyToOne(() => User)
    user!: User;

    @ManyToOne(() => PaymentMethodType, { nullable: true })
    card?: PaymentMethodType;

    @Enum(() => ['credit_card', 'apple_pay', 'google_pay'])
    paymentMethod!: PaymentMethodType;

    @Property()
    amount!: number;

    @Property()
    currency!: Currency; // EUR, USD

    @Property()
    status!: TransactionStatus;

    @Property()
    transactionId!: string;

    @Property()
    reference!: string;

    @Property()
    transactionDate!: Date;

    @Property()
    description!: string;

    @Property()
    authCode!: string;
}
