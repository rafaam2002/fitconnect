import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { randomUUID } from "node:crypto";

@Entity()
export class Message {
 // @Field(() => String)
  @PrimaryKey()
  id: string = randomUUID(); //

 // @Field(() => Date)
  @Property()
  created_at: Date = new Date();

 // @Field(() => Date)
  @Property()
  updated_at: Date;

//  @Field(() => String)
  @Property()
  message!: string;

 // @Field(() => Boolean)
  @Property()
  isFixed!: boolean;

//  @Field(() => Number, { nullable: true })
  @Property({ nullable: true })
  fixedDuration?: number;

//  @Field(() => String)
  @Property()
  sender!: string;

//  @Field(() => String)
  @Property()
  reciver!: string;
}
