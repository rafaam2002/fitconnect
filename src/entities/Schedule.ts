import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  Property,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";
import { ScheduleProgrammed } from "./ScheduleProgrammed";

@Entity()
export class Schedule extends BaseEntity {
  @Property() //puede haber 2 schedules en la misma hora?
  startDate!: Date;
    
  @Property()
  Duration!: number; // in minutes

  @Property()
  maxUsers!: number;

  @Property({ default: false })
  isCancelled!: boolean;

  @ManyToMany(() => User, (user) => user.schedules)
  users = new Collection<User>(this);

  @ManyToOne(() => User)
  admin!: User;

  @ManyToOne(() => ScheduleProgrammed, { nullable: true })
  scheduleProgrammed?: ScheduleProgrammed;

  constructor(schedule: Schedule) {
    super();
    this.startDate = schedule.startDate;
    this.Duration = schedule.Duration;
    this.maxUsers = schedule.maxUsers;
    this.isCancelled = schedule.isCancelled;
    this.admin = schedule.admin;
  }
}
