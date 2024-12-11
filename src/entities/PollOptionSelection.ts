import {
  Entity,
  ManyToOne,
  Property,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { Poll } from "./Poll";
import { User } from "./User";

@Entity()
export class PollOptionSelection {
  @ManyToOne(() => Poll, {primary: true, deleteRule: 'cascade'})
  poll!: Poll;

  @ManyToOne(() => User, {primary: true, deleteRule: 'cascade'})
  user!: User;

  @Property()
  optionSelected!: number;
}
