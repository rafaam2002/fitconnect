import { Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import {User} from "./User";
import {BaseEntity} from "./BaseEntity";
import {Transaction} from "./Transaction";
import {Plan} from "./Plan";
import { SubscriptionStatus } from '../types/enums';

@Entity()
export class Subscription extends BaseEntity {

    @ManyToOne(() => User)
    user!: User;

    @ManyToOne(() => Plan)
    plan!: Plan;

    @Property()
    status!: SubscriptionStatus;

    @Property()
    startDate!: Date;

    @Property()
    endDate!: Date;

    @OneToMany(() => Transaction, transaction => transaction.subscription)
    transactions = new Collection<Transaction>(this);
}
