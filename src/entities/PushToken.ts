import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { User } from './User';
import { BaseEntity } from './BaseEntity';

@Entity()
export class PushToken extends BaseEntity {
  @Property()
  token!: string;

  @ManyToOne(() => User)
  user!: User;
}
