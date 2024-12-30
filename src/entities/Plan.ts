import {
    Entity,
    PrimaryKey,
    Property,
    ManyToMany,
    Collection, OneToMany,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";

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

    @Property({ type: "boolean", default: true })
    isActive: boolean = true;

    @Property({ type: "number" })
    durationInDays: number = 0;

    @OneToMany(() => User, (user: User) => user.plan)
    users = new Collection<User>(this);
}
