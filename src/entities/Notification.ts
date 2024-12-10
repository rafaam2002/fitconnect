import {Entity, ManyToOne, Property} from "@mikro-orm/core";
import {NotificationType} from "../types/enums";
import {BaseEntity} from "./BaseEntity";
import {User} from "./User";

@Entity()
export class Notification extends BaseEntity {

    @Property()
    type!: NotificationType;

    @Property()
    message!: string;

    @Property()
    link!: string;

    @ManyToOne( () => User)
    user!: User;
}
