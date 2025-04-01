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
import { Currency, PaymentType } from "../types/enums";

@Entity()
export class Plan extends BaseEntity {
    @Property({ type: "string", unique: true })
    name!: string;

    @Property({ type: "string" })
    description!: string;

    @Property({ type: "number" })
    price!: number; // Precio del plan

    @Property({ type: "string" })
    currency: string = Currency.EUR;

    @Property()
    paymentType!: PaymentType;

    @Property({ type: "number" })
    durationInDays: number = 0;

    @Property({ type: "array" })
    features: string[] = [];

    @Property({ type: "string" })
    icon: string = "book";

    @Property({ type: "boolean" })
    isBestChoice: boolean = false;

    @OneToMany(() => Subscription, (subscription: Subscription) => subscription.plan)
    subscriptions = new Collection<Subscription>(this);
}
