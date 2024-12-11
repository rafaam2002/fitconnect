import {
  Collection,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  Property,
  t,
} from "@mikro-orm/core";
import { UserRol } from "../types/enums";
import crypto from "crypto";
import { BaseEntity } from "./BaseEntity";
import { Schedule } from "./Schedule";
import { Message } from "./Message";
import { Notification } from "./Notification";
import { Poll } from "./Poll";
import { Promotion } from "./Promotion";
import { PollOptionSelection } from "./PollOptionSelection";

@Entity()
export class User extends BaseEntity {
  @Property({ type: t.string })
  name!: string;

  @Property({ type: t.string })
  surname!: string;

  @Property({ type: t.string, lazy: true }) // means that the property will be loaded only when accessed
  password!: string;

  @Property({ type: t.string, unique: true })
  email!: string;

  @Property()
  phoneNumber!: string;

  @Property() //{ type: "blob", nullable: true }
  profilePicture?: string;

  @Property({ type: t.string, unique: true })
  nickname!: string;

  @Property()
  isActive!: boolean;

  @Property()
  isBlocked!: boolean;

  @Property()
  startPaymentDate: Date;

  @Property()
  endPaymentDate: Date;

  @Property({ type: t.string })
  rol!: UserRol;

  @ManyToMany(() => Schedule, (schedule:Schedule) => schedule.users, { owner: true })
  schedules = new Collection<Schedule>(this);

  @ManyToMany(() => Promotion, (promotion) => promotion.users, { owner: true })
  promotions = new Collection<Promotion>(this);

  // Relación OneToMany con Schedule (admin)
  @OneToMany(() => Schedule, (schedule) => schedule.admin, { lazy: true })
  adminSchedules = new Collection<Schedule>(this);

  // Relación OneToMany con Message (sender)
  @OneToMany(() => Message, (message) => message.sender)
  messagesSent = new Collection<Message>(this);

  // Relación OneToMany con Message (receiver)
  @OneToMany(() => Message, (message) => message.receiver)
  messagesReceived = new Collection<Message>(this);

  // Relación OneToMany con Notification
  @OneToMany(() => Notification, (notification) => notification.user)
  notifications = new Collection<Notification>(this);

  @OneToMany(() => Poll, (poll) => poll.creator)
  adminPolls = new Collection<Poll>(this);

  @OneToMany(() => PollOptionSelection, (PollOptionSelection) => PollOptionSelection.user)
  pollOptionSelections = new Collection<PollOptionSelection>(this);


  constructor(user: User) {
    super();

    this.name = user.name;
    this.surname = user.surname;
    this.password = User.hashPassword(user.password);
    this.email = user.email;
    this.nickname = user.nickname;
    this.rol = user.rol;
    this.isActive = false;
  }

  static hashPassword = (password: string) => {
    return crypto.createHmac("sha256", password).digest("hex");
  };
}
