import { Entity, Enum, Filter, ManyToOne, Unique } from '@mikro-orm/core';

import { UserRoleEnum } from '../types/enums';

import { BaseEntity } from './BaseEntity';
import { Company } from './Company';
import { User } from './User';

@Filter({
  name: 'companyContext',
  cond: args => ({ company: args.companyId }),
  default: true,
})
@Entity()
@Unique({ properties: ['user', 'company'] })
export class UserRole extends BaseEntity {
  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Company, { deleteRule: 'cascade' })
  company!: Company;

  @Enum({ items: () => UserRoleEnum, default: UserRoleEnum.STANDARD })
  role: UserRoleEnum = UserRoleEnum.STANDARD;

  constructor(user: User, company: Company, role: UserRoleEnum) {
    super();
    this.user = user;
    this.company = company;
    this.role = role;
  }
}
