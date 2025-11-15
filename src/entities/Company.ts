import { BaseEntity } from "./BaseEntity";
import {
  Cascade,
  Collection,
  Entity,
  OneToMany,
  OneToOne,
  Property,
} from "@mikro-orm/core";
import { MemberShip } from "./MemberShip";
import { ScheduleOptions } from "./ScheduleOptions";
import { PictureUrl } from "./PictureUrl";

@Entity()
export class Company extends BaseEntity {
  @Property({ length: 100 })
  name!: string;

  @Property()
  phoneNumber: string;

  @Property()
  email: string;

  @Property()
  address: string;

  @OneToOne(() => PictureUrl, (picture) => picture.companyLogo, {
    nullable: true,
    owner: true,
  })
  logo?: PictureUrl;

  @OneToMany(() => PictureUrl, (picture) => picture.company, {
    cascade: [Cascade.REMOVE],
  })
  pictures = new Collection<PictureUrl>(this);

  @OneToMany(() => MemberShip, (memberShip) => memberShip.company)
  memberships = new Collection<MemberShip>(this);

  @OneToOne(
    () => ScheduleOptions,
    (scheduleOptions) => scheduleOptions.company,
    { nullable: true, owner: true }
  )
  scheduleOptions?: ScheduleOptions;

  constructor(company: Partial<Company>) {
    super();
    this.name = company.name;
    this.address = company.address;
    this.phoneNumber = company.phoneNumber;
    this.email = company.email;
    this.logo = company.logo;
    this.pictures = company.pictures;
    this.scheduleOptions = company.scheduleOptions;
  }
}
