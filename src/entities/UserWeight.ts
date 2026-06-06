import { Entity, Filter, ManyToOne, Property, t } from '@mikro-orm/core';

import { BaseEntity } from './BaseEntity';
import { Company } from './Company';
import { User } from './User';

@Entity()
@Filter({
  name: 'companyContext',
  cond: args => ({ company: args.companyId }),
  default: true,
})
export class UserWeight extends BaseEntity {
  @Property({ type: t.float })
  weight!: number;

  @Property({ type: t.string })
  date!: string;

  @ManyToOne(() => User, { nullable: true })
  user!: User;

  @ManyToOne(() => Company)
  company!: Company;

  constructor(userWeight: UserWeight) {
    super();
    this.date = userWeight.date;
    this.weight = userWeight.weight;
    this.user = userWeight.user;
  }
}
