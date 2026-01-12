import {
  Cascade,
  Collection,
  Entity,
  EntityRepositoryType,
  Filter,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/core';

import { CustomScheduleProgrammedRepository } from '../repositories/scheduleProgrammedRepository';
import { ScheduleType } from '../types/enums';

import { BaseEntity } from './BaseEntity';
import { Company } from './Company';
import { Schedule } from './Schedule';
import { User } from './User';

@Filter({
  name: 'companyContext',
  cond: args => ({ company: args.companyId }),
  default: true,
})
@Entity({ repository: () => CustomScheduleProgrammedRepository })
export class ScheduleProgrammed extends BaseEntity {
  [EntityRepositoryType]?: CustomScheduleProgrammedRepository;
  @Property()
  daysOfWeek: number[];

  @Property({ type: 'time' })
  startHour: string;

  @Property({ type: 'time' })
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
  age: number | null;

  @OneToMany(() => Schedule, schedule => schedule.scheduleProgrammed, {
    cascade: [Cascade.REMOVE],
  })
  schedules = new Collection<Schedule>(this);

  @ManyToOne(() => Company)
  company: Company;

  constructor(scheduleProgrammed: ScheduleProgrammed) {
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
