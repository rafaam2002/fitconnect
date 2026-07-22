import { Entity, Filter, ManyToOne } from '@mikro-orm/core';

import { BaseEntity } from './BaseEntity';
import { Company } from './Company';
import { Promotion } from './Promotion';
import { User } from './User';

@Entity()
@Filter({
  name: 'companyContext',
  cond: args => ({ company: args.companyId }),
  default: true,
})
export class PromotionRedemption extends BaseEntity {
  @ManyToOne(() => Promotion)
  promotion!: Promotion;

  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Company)
  company!: Company;
}
