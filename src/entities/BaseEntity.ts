import { Index, OptionalProps, PrimaryKey, Property, t } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';

export abstract class BaseEntity {
  [OptionalProps]?: 'created_at' | 'updated_at' | 'isActive' | 'isBlocked';

  @PrimaryKey({ type: t.uuid })
  id: string = randomUUID();

  @Property({ onCreate: () => new Date() })
  @Index()
  created_at: Date = new Date();

  // IMPORTANTE: Añade onCreate también aquí para que tenga valor inicial
  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updated_at: Date = new Date();
}
