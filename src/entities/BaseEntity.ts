import {Entity, PrimaryKey, Property} from "@mikro-orm/core";
import {randomUUID} from "node:crypto";

export abstract class BaseEntity {
  // @Field(() => String)
  @PrimaryKey()
  id: string = randomUUID(); //

  // @Field(() => Date)
  @Property()
  created_at: Date = new Date();

  // @Field(() => Date)
  @Property()
  updated_at: Date;
}
