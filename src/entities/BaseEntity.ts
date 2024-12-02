import { PrimaryKey, Property} from "@mikro-orm/core";
import {randomUUID} from "node:crypto";

export abstract class BaseEntity {
  // @Field(() => String)
  @PrimaryKey({type: 'uuid'})
  id: string = randomUUID(); //

  // @Field(() => Date)
  @Property()
  created_at: Date = new Date();

  // @Field(() => Date)
  @Property( {onUpdate: () => new Date()})
  updated_at: Date = new Date();
}
