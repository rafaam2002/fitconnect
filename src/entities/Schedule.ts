import {BeforeCreate, BeforeUpdate, Collection, Entity, ManyToMany, ManyToOne, Property,} from "@mikro-orm/core";
import {BaseEntity} from "./BaseEntity";
import {User} from "./User";
import {ScheduleProgrammed} from "./ScheduleProgrammed";
import {ScheduleState, ScheduleType} from "../types/enums";
import {Company} from "./Company";

@Entity()
export class Schedule extends BaseEntity {
    @Property()
    title: string;

    @Property({nullable: true})
    description: string;

    @Property({nullable: true})
    age: number;

    @Property() //puede haber 2 schedules en la misma hora?
    startDate: Date;

    @Property()
    endDate: Date;

    @Property()
    maxUsers: number;

    @ManyToOne(() => Company, {nullable: true})
    company: Company;

    @Property({default: ScheduleType.STANDARD})
    type: ScheduleType = ScheduleType.STANDARD;

    @Property({default: ScheduleState.AVAILABLE})
    state: ScheduleState;

    @ManyToMany(() => User, (user) => user.schedules)
    users = new Collection<User>(this);

    @ManyToOne(() => User)
    admin: User;

    @ManyToOne(() => ScheduleProgrammed, {nullable: true})
    scheduleProgrammed?: ScheduleProgrammed;

    constructor(schedule: Schedule) {
        super();
        this.startDate = schedule.startDate;
        this.endDate = schedule.endDate;
        this.maxUsers = schedule.maxUsers;
        this.state = schedule.state;
        this.admin = schedule.admin;
        this.title = schedule.title;
        this.description = schedule.description;
        this.age = schedule.age;
    }

    @BeforeCreate()
    @BeforeUpdate()
    validate() {
        if (this.startDate >= this.endDate) {
            throw new Error("startDate must be before endDate.");
        }
    }
}
