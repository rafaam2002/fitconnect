import {
  Cascade,
  Collection,
  Entity,
  Filter,
  ManyToMany,
  OneToMany,
  OneToOne,
  Property,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { PictureUrl } from "./PictureUrl";
import { ScheduleOptions } from "./ScheduleOptions";
import { User } from "./User";

@Entity()
@Filter({
  name: "validatedCompanies",
  cond: (args) => ({ isValidated: true }),
})
export class Company extends BaseEntity {
  @Property({ length: 100 })
  name!: string;

  @Property()
  phoneNumber: string;

  @Property()
  email: string;

  @Property()
  address: string;

  @Property()
  isValidated: boolean = false;

  @ManyToMany(() => User, (user: User) => user.companies)
  users = new Collection<User>(this);

  @ManyToMany(() => User, (user: User) => user.pendingCompanies)
  pendingUsers = new Collection<User>(this);

  @OneToOne(() => PictureUrl, (picture) => picture.companyLogo, {
    nullable: true,
    owner: true,
    eager: true,
  })
  logo?: PictureUrl;

  @OneToMany(() => PictureUrl, (picture) => picture.company, {
    cascade: [Cascade.REMOVE],
  })
  pictures = new Collection<PictureUrl>(this);

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
