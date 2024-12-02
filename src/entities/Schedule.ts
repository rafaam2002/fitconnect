import {Collection, Entity, ManyToMany, ManyToOne, Property} from "@mikro-orm/core";
import {BaseEntity} from "./BaseEntity";
import {User} from "./User";

@Entity()
export class Schedule extends BaseEntity {

    @Property()
    startTime!: Date;

    @Property()
    Duration!: number; // in minutes

    @Property()
    maxUsers!: number;

    @Property({default: false})
    isCancelled!: boolean;

    @Property({default: false})
    isProgrammed!: boolean;

    @ManyToMany({mappedBy: 'schedules'})
    users = new Collection<User>(this);

    @ManyToOne()
    admin = new Collection<User>(this);

}
