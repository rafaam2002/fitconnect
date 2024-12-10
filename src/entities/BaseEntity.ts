import { PrimaryKey, Property} from "@mikro-orm/core";
import {randomUUID} from "node:crypto";

export abstract class BaseEntity {
  // @Field(() => String)
  @PrimaryKey()
  id!: number; //

  // @Field(() => Date)
  @Property( {onCreate: () => new Date()})
  created_at: Date = new Date();

  // @Field(() => Date)
  @Property( {onUpdate: () => new Date()})
  updated_at: Date = new Date();
}
