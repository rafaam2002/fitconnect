import { Entity, Filter, ManyToOne, Property, t } from '@mikro-orm/core';

import { BaseEntity } from './BaseEntity';
import { Company } from './Company';
import { Product } from './Product';
import { User } from './User';

@Entity()
@Filter({
  name: 'companyContext',
  cond: args => ({ company: args.companyId }),
  default: true,
})
export class ProductPurchase extends BaseEntity {
  @ManyToOne(() => Product)
  product!: Product;

  @ManyToOne(() => Company)
  company!: Company;

  @ManyToOne(() => User, { nullable: true })
  user?: User | null;

  @Property({ type: t.integer })
  quantity!: number;

  @Property({ type: 'bigint' })
  unitPrice!: number; // en centavos
}
