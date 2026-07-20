import {
  BeforeCreate,
  BeforeUpdate,
  Entity,
  ManyToOne,
  Property,
  Unique,
} from '@mikro-orm/core';

import { BadRequestError } from '../utils/errors.util';

import { BaseEntity } from './BaseEntity';
import { Company } from './Company';
import { User } from './User';

@Entity()
@Unique({ properties: ['user', 'company'] })
export class Rating extends BaseEntity {
  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Company)
  company!: Company;

  @Property()
  score!: number;

  @Property({ nullable: true, type: 'text' })
  comment?: string;

  constructor(rating: Partial<Rating>) {
    super();
    this.user = rating.user!;
    this.company = rating.company!;
    this.score = rating.score!;
    this.comment = rating.comment;
  }

  @BeforeCreate()
  @BeforeUpdate()
  validate() {
    if (!Number.isInteger(this.score) || this.score < 1 || this.score > 5) {
      throw new BadRequestError('Score must be an integer between 1 and 5');
    }
  }
}