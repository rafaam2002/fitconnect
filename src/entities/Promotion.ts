import { Entity, Filter, ManyToOne, Property, t } from '@mikro-orm/core';

import { BaseEntity } from './BaseEntity';
import { Company } from './Company';

@Entity()
@Filter({
  name: 'companyContext',
  cond: args => ({ company: args.companyId }),
  default: true,
})
export class Promotion extends BaseEntity {
  @Property({ type: t.string })
  title!: string;

  @Property({ type: t.string })
  description!: string;

  @Property({ type: t.string })
  discountTag!: string;

  @Property({ type: t.float })
  originalPrice!: number;

  @Property({ type: t.float })
  newPrice!: number;

  @Property()
  expiresAt!: Date;

  @Property({ type: t.string, nullable: true })
  accentColor?: string | null;

  @Property({ type: t.boolean, default: false })
  isHero: boolean = false;

  @Property({ type: t.boolean, default: true })
  isActive: boolean = true;

  @ManyToOne(() => Company, { nullable: true })
  company: Company;
}
