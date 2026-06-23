import { Entity, Enum, ManyToOne, Property, t } from '@mikro-orm/core';

import { NotificationType } from '../types/enums';

import { BaseEntity } from './BaseEntity';
import { Company } from './Company';
import { User } from './User';

@Entity()
export class Notification extends BaseEntity {
  @Enum({ items: () => NotificationType })
  type!: NotificationType;

  @Property({ type: t.string })
  title!: string;

  @Property({ type: t.string })
  message!: string;

  @Property({ type: t.string, nullable: true })
  link?: string | null;

  @Property({ type: t.boolean, default: false })
  read: boolean = false;

  @ManyToOne(() => User, { deleteRule: 'cascade', index: true })
  user!: User;

  @ManyToOne(() => Company, {
    nullable: true,
    deleteRule: 'cascade',
    index: true,
  })
  company?: Company | null;
}
