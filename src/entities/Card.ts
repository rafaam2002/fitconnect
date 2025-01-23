import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import {User} from "./User";
import {BaseEntity} from "./BaseEntity";
import { C } from '@faker-js/faker/dist/airline-BnpeTvY9';
import { CreditCardProvider, CreditCardType } from '../types/enums';

@Entity()
export class Card extends BaseEntity {

    @ManyToOne(() => User)
    user!: User;

    @Property()
    type!: CreditCardType;

    @Property()
    provider!: CreditCardProvider;

    @Property()
    maskedNumber!: string;

    @Property()
    tokenization!: string; // Token de pasarela (Stripe)

    @Property()
    expDate!: string; // MM/YY

    @Property()
    owner!: string;
}
