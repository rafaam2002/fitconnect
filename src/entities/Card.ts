import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import {User} from "./User";
import {BaseEntity} from "./BaseEntity";

@Entity()
export class Card extends BaseEntity {

    @ManyToOne(() => User)
    user!: User;

    @Property()
    type!: 'CREDIT' | 'DEBIT';

    @Property()
    provider!: 'VISA' | 'MASTERCARD';

    @Property()
    maskedNumber!: string;

    @Property()
    tokenization!: string; // Token de pasarela (Stripe)

    @Property()
    expDate!: string; // MM/YY

    @Property()
    owner!: string;
}
