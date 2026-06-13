import { randomUUID } from 'node:crypto';

import { OptionalProps, PrimaryKey, Property, t } from '@mikro-orm/core';

export abstract class BaseEntity {
  [OptionalProps]?: any;

  @PrimaryKey({ type: t.uuid })
  id: string = randomUUID();

  @Property({ onCreate: () => new Date() })
  created_at: Date = new Date();

  // IMPORTANTE: Añade onCreate también aquí para que tenga valor inicial
  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updated_at: Date = new Date();
}
