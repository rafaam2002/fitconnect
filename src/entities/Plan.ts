import {
    Entity,
    PrimaryKey,
    Property,
    ManyToMany,
    Collection, OneToMany,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";
import {Subscription} from "./Subscription";

@Entity()
export class Plan extends BaseEntity {
    @Property({ type: "string", unique: true })
    name!: string;

    @Property({ type: "string" })
    description!: string;

    @Property({ type: "number" })
    price!: number; // Precio del plan

    @Property({ type: "string" })
    currency: string = 'EUR'

    @Property()
    paymentType!: 'MENSUAL' | 'ANUAL';

    @Property({ type: "number" })
    durationInDays: number = 0;

    @OneToMany(() => Subscription, (subscription: Subscription) => subscription.plan)
    users = new Collection<User>(this);
}
