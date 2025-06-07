import {
  Collection,
  Entity,
  EntityRepositoryType,
  ManyToOne,
  OneToMany,
  Property,
  EntityManager,
  Cascade,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";
import { Schedule } from "./Schedule";
import { CustomScheduleProgrammedRepository } from "../customRepositories/scheduleProgrammedRepository";
import { ScheduleType } from "../types/enums";
@Entity({ repository: () => CustomScheduleProgrammedRepository })
export class ScheduleProgrammed extends BaseEntity {
  [EntityRepositoryType]?: CustomScheduleProgrammedRepository;
  @Property()
  daysOfWeek: number[];

  @Property({ type: "time" })
  startHour: string;

  @Property({ type: "time" })
  endHour: string; // in minutes

  @Property()
  maxUsers: number;

  @ManyToOne(() => User, { nullable: true })
  admin?: User;

  @Property()
  title: string;

  @Property()
  description: string;

  @Property({ default: ScheduleType.STANDARD })
  type: ScheduleType = ScheduleType.STANDARD;

  @Property({ nullable: true })
  age: number;

  @OneToMany(() => Schedule, (schedule) => schedule.scheduleProgrammed, {
    cascade: [Cascade.REMOVE],
  })
  schedules = new Collection<Schedule>(this);

  constructor(scheduleProgrammed: ScheduleProgrammed, em: EntityManager) {
    super();
    this.daysOfWeek = scheduleProgrammed.daysOfWeek;
    this.startHour = scheduleProgrammed.startHour;
    this.endHour = scheduleProgrammed.endHour;
    this.maxUsers = scheduleProgrammed.maxUsers;
    this.admin = scheduleProgrammed.admin;
    this.title = scheduleProgrammed.title;
    this.description = scheduleProgrammed.description;
    this.age = scheduleProgrammed.age;
  }
}
