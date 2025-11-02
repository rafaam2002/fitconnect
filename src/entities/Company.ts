import {BaseEntity} from "./BaseEntity";
import {Collection, Entity, OneToMany, Property} from "@mikro-orm/core";
import {User} from "./User";

@Entity()
export class Company extends BaseEntity {

    @Property({ length: 100 })
    name!: string;

    @Property({ nullable: true })
    logoUrl?: string;

    @Property({ nullable: true })
    address?: string;

    @OneToMany(() => User, (user) => user.company)
    users = new Collection<User>(this);

}