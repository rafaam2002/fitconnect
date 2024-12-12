import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  Property,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";
import { pollOptionType } from "../types/pollTypes";

@Entity()
export class Poll extends BaseEntity {
  @Property()
  startDate!: Date;

  @Property()
  endDate!: Date; // in minutes

  @Property()
  options!: pollOptionType[];

  @ManyToOne(() => User)
  creator;

  @ManyToOne(() => User)
  adminUsers = new Collection<User>(this);
}
