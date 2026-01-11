import {
  Collection,
  Entity,
  Filter,
  ManyToMany,
  ManyToOne,
  Property,
} from '@mikro-orm/core';
import { BaseEntity } from './BaseEntity';
import { User } from './User';
import { Company } from './Company';

@Entity()
@Filter({
  name: 'companyContext',
  cond: args => ({ company: args.companyId }),
  default: true,
})
export class Promotion extends BaseEntity {
  @Property()
  title!: string;

  @Property()
  startDate!: Date;

  @Property()
  endDate!: Date; // in minutes

  @Property()
  price!: number;

  @Property({ nullable: true })
  picture: string;

  @Property()
  description!: string;

  @ManyToOne(() => Company, { nullable: true })
  company: Company;

  @ManyToMany(() => User, user => user.promotions)
  users = new Collection<User>(this);
}
