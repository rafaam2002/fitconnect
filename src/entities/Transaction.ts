import {Entity, PrimaryKey, Property, ManyToOne, Enum} from '@mikro-orm/core';
import {Subscription} from "./Subscription";
import {User} from "./User";
import {Card} from "./Card";
import {BaseEntity} from "./BaseEntity";


@Entity()
export class Transaction extends BaseEntity{

    @ManyToOne(() => Subscription)
    subscription!: Subscription;

    @ManyToOne(() => User)
    user!: User;

    @ManyToOne(() => Card, { nullable: true })
    card?: Card;

    @Enum(() => ['CREDIT_CARD', 'APPLE_PAY', 'GOOGLE_PAY'])
    paymentMethod!: 'CREDIT_CARD' | 'APPLE_PAY' | 'GOOGLE_PAY';

    @Property()
    amount!: number;

    @Property()
    currency!: string; // EUR, USD

    @Property()
    status!: 'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUND';

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
