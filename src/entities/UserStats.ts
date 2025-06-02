import {
  BeforeCreate,
  Collection,
  Entity,
  ManyToMany,
  OneToMany,
  OneToOne,
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
import { TrainingTask } from "./TraningITask";
import { UserWeight } from "./UserWeight";
import { PictureUrl } from "./PictureUrl";
import { User } from "./User";

@Entity()
export class UserStats extends BaseEntity {
  // Relación OneToMany con Schedule (admin)
  @OneToMany(() => User, (user) => user.isNotActiveStats, { lazy: true })
  isNotActiveUsers = new Collection<User>(this);

  // Relación OneToMany con Message (sender)
  @OneToMany(() => User, (user) => user.isBlockedStats, { lazy: true })
  isBlockedUsers = new Collection<User>(this);

  @OneToMany(() => User, (user) => user.isNotVerifiedStats, { lazy: true })
  isNotVerifiedUsers = new Collection<User>(this);

  @OneToMany(() => User, (user) => user.isNewStats, { lazy: true })
  isNewUsers = new Collection<User>(this);
}
