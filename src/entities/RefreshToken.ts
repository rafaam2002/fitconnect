import { Entity, ManyToOne, Property } from '@mikro-orm/core';

import { BaseEntity } from './BaseEntity';
import { User } from './User';

@Entity()
export class RefreshToken extends BaseEntity {
  @ManyToOne(() => User)
  user!: User;

  @Property({ type: 'text' })
  token!: string;

  @Property()
  expiresAt!: Date;

  constructor(user: User, token: string, expiresAt: Date) {
    super();
    this.user = user;
    this.token = token;
    this.expiresAt = expiresAt;
  }
}
