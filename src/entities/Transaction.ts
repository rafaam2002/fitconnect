import {Entity, PrimaryKey, Property, ManyToOne, Enum} from '@mikro-orm/core';
import {Subscription} from "./Subscription";
import {User} from "./User";
import {Card} from "./Card";
import {BaseEntity} from "./BaseEntity";
import { Currency, PaymentMethod, TransactionStatus } from '../types/enums';


@Entity()
export class Transaction extends BaseEntity{

    @ManyToOne(() => Subscription)
    subscription!: Subscription;

    @ManyToOne(() => User)
    user!: User;

    @ManyToOne(() => Card, { nullable: true })
    card?: Card;

    @Enum(() => ['credit_card', 'apple_pay', 'google_pay'])
    paymentMethod!: PaymentMethod;

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
