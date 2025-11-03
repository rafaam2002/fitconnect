import { BaseEntity } from "./BaseEntity";
import {
  Collection,
  Entity,
  OneToMany,
  OneToOne,
  Property,
} from "@mikro-orm/core";
import { MemberShip } from "./MemberShip";
import { ScheduleOptions } from "./ScheduleOptions";

@Entity()
export class Company extends BaseEntity {
  @Property({ length: 100 })
  name!: string;

  @Property({ nullable: true })
  logoUrl?: string;

  @Property({ nullable: true })
  address?: string;

  @OneToMany(() => MemberShip, (memberShip) => memberShip.company)
  memberships = new Collection<MemberShip>(this);

  @OneToOne(
    () => ScheduleOptions,
    (scheduleOptions) => scheduleOptions.company,
    { nullable: true, owner: true }
  )
  scheduleOptions?: ScheduleOptions;
}
