import { Entity, OneToOne, OptionalProps, Property } from '@mikro-orm/core';

import { BaseEntity } from './BaseEntity';
import { Company } from './Company';

@Entity()
export class CompanyConfig extends BaseEntity {
  [OptionalProps]?:
    | 'created_at'
    | 'updated_at'
    | 'isActive'
    | 'isBlocked'
    | 'pollsEnabled'
    | 'productEnabled'
    | 'chatEnabled'
    | 'trainingEnabled';

  @Property({ default: true })
  pollsEnabled: boolean = true;

  @Property({ default: true })
  productEnabled: boolean = true;

  @Property({ default: true })
  chatEnabled: boolean = true;

  @Property({ default: true })
  trainingEnabled: boolean = true;

  @OneToOne(() => Company, company => company.companyConfig)
  company: Company;
}
