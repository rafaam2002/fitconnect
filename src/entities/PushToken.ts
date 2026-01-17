import { Entity, ManyToOne, Property } from '@mikro-orm/core';

import { BaseEntity } from './BaseEntity';
import { User } from './User';

@Entity()
export class PushToken extends BaseEntity {
  @Property()
  token!: string;

  @ManyToOne(() => User)
  user!: User;
}
