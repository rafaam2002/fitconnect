import {
  Collection,
  Entity,
  EntityRepositoryType,
  ManyToOne,
  OneToMany,
  Property,
  EntityManager,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";
import { Schedule } from "./Schedule";
import { CustomScheduleProgrammedRepository } from "../customRepositories/scheduleProgrammedRepository";
import { createScheduleInXWeeks } from "../utils/schedules";
@Entity({ repository: () => CustomScheduleProgrammedRepository })
export class ScheduleProgrammed extends BaseEntity {
  [EntityRepositoryType]?: CustomScheduleProgrammedRepository;
  @Property()
  daysOfWeek!: number[];

  @Property({ type: "time" })
  startHour!: string;

  @Property({ type: "time" })
  endHour!: string; // in minutes

  @Property()
  maxUsers!: number;

  @ManyToOne(() => User, { nullable: true })
  admin?: User;

  @OneToMany(() => Schedule, (schedule) => schedule.scheduleProgrammed)
  schedules = new Collection<Schedule>(this);

  constructor(scheduleProgrammed: ScheduleProgrammed, em: EntityManager) {
    super();
    this.daysOfWeek = scheduleProgrammed.daysOfWeek;
    this.startHour = scheduleProgrammed.startHour;
    this.endHour = scheduleProgrammed.endHour;
    this.maxUsers = scheduleProgrammed.maxUsers;
    this.admin = scheduleProgrammed.admin;
  }
  createInitialSchedules = async (em: EntityManager) => {
    const now = new Date();
    for (let i = 1; i <= 3; i++) {
      this.daysOfWeek.forEach(async (day) => {
        await createScheduleInXWeeks(now, day, i, this, em);
      });
    }
  };
}
