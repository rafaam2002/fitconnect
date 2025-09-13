import {PrimaryKey, Property, UuidType, t, Index} from "@mikro-orm/core";
import {randomUUID} from "node:crypto";

export abstract class BaseEntity {
  // @Field(() => String)
  @PrimaryKey({ type: t.uuid })
  id: string = randomUUID(); //

  // @Field(() => Date)
  @Property({ onCreate: () => new Date() })
  @Index()
  created_at: Date = new Date();

  // @Field(() => Date)
  @Property({ onUpdate: () => new Date() })
  updated_at: Date = new Date();
}
