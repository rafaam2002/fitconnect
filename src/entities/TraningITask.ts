import {
  BeforeCreate,
  Collection,
  Entity,
  ManyToMany,
  OneToMany,
  Property,
  t,
} from "@mikro-orm/core";
import { UserRol } from "../types/enums";
import { BaseEntity } from "./BaseEntity";
import { Schedule } from "./Schedule";
import { Message } from "./Message";
import { Notification } from "./Notification";
import { Poll } from "./Poll";
import { Promotion } from "./Promotion";
import { PollVote } from "./PollVote";
import bcrypt from "bcrypt";
import { Card } from "./Card";
import { Subscription } from "./Subscription";
import { User } from "./User";

@Entity()
export class TrainingTask extends BaseEntity {
  @Property({ type: t.string })
  content!: string;

  @ManyToMany(() => User, (user) => user.trainingTasks)
  users = new Collection<User>(this);

  @Property()
  date!: Date;

  @Property()
  repeat: boolean = false;

  constructor(task: TrainingTask) {
    super();
    this.content = task.content;
    this.date = task.date;
    this.repeat = task.repeat;
  }
}
