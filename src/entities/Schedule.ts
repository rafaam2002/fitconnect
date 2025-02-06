import {
  BeforeCreate,
  BeforeUpdate,
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  Property,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";
import { ScheduleProgrammed } from "./ScheduleProgrammed";
import { ScheduleState } from "../types/enums";

@Entity()
export class Schedule extends BaseEntity {
  @Property()
  title!: string;

  @Property() //puede haber 2 schedules en la misma hora?
  startDate!: Date;

  @Property()
  endDate!: Date;

  @Property()
  maxUsers!: number;

  @Property({ default: ScheduleState.AVAILABLE })
  state: ScheduleState;

  @ManyToMany(() => User, (user) => user.schedules)
  users = new Collection<User>(this);

  @ManyToOne(() => User)
  admin: User;

  @ManyToOne(() => ScheduleProgrammed, { nullable: true })
  scheduleProgrammed?: ScheduleProgrammed;

  @BeforeCreate()
  @BeforeUpdate()
  validate() {
    if (this.startDate >= this.endDate) {
      throw new Error("startDate must be before endDate.");
    }
  }

  constructor(schedule: Schedule) {
    super();
    this.startDate = schedule.startDate;
    this.endDate = schedule.endDate;
    this.maxUsers = schedule.maxUsers;
    this.state = schedule.state;
    this.admin = schedule.admin;
  }
}
