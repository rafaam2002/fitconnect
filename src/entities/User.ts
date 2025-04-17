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
import { TrainingTask } from "./TraningITask";
import { UserWeight } from "./UserWeight";

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

  @Property({ nullable: true })
  phoneNumber: string;

  @Property({ nullable: true }) //{ type: "blob", nullable: true }
  profilePicture?: string;

  @Property({ type: t.string, unique: true })
  nickname!: string;

  @Property()
  isActive!: boolean;

  @Property({ type: t.boolean })
  isBlocked = true;

  @Property({ type: t.string })
  rol!: UserRol;

  @ManyToMany(() => Schedule, (schedule: Schedule) => schedule.users, {
    owner: true,
    eager: true,
  })
  schedules = new Collection<Schedule>(this);

  @ManyToMany(() => Promotion, (promotion) => promotion.users, {
    owner: true,
    eager: true,
  })
  promotions = new Collection<Promotion>(this);

  // Relación OneToMany con Schedule (admin)
  @OneToMany(() => Schedule, (schedule) => schedule.admin, { lazy: true })
  adminSchedules = new Collection<Schedule>(this);

  // Relación OneToMany con Message (sender)
  @OneToMany(() => Message, (message) => message.sender, { lazy: true })
  messagesSent = new Collection<Message>(this);

  // Relación OneToMany con Message (receiver)
  @OneToMany(() => Message, (message) => message.receiver, { lazy: true })
  messagesReceived = new Collection<Message>(this);

  // Relación OneToMany con Notification
  @OneToMany(() => Notification, (notification) => notification.user, {
    lazy: true,
  })
  notifications = new Collection<Notification>(this);

  @OneToMany(() => Poll, (poll) => poll.admin, { lazy: true })
  adminPolls = new Collection<Poll>(this);

  @OneToMany(() => PollVote, (PollVote) => PollVote.user, { lazy: true })
  pollVotes = new Collection<PollVote>(this);

  @OneToMany(() => Card, (card) => card.user)
  cards = new Collection<Card>(this);

  @OneToMany(() => Subscription, (subscription) => subscription.user)
  subscriptions = new Collection<Subscription>(this);

  @Property({ nullable: true })
  stripeCustomerId?: string;

  @OneToMany(() => TrainingTask, (trainingTask) => trainingTask.user, {
    lazy: true,
  })
  trainingTasks = new Collection<TrainingTask>(this);

  @OneToMany(() => UserWeight, (userWeight) => userWeight.user, {
    lazy: true,
  })
  userWeights = new Collection<UserWeight>(this);
  

  constructor(user: User) {
    super();
    this.name = user.name;
    this.surname = user.surname;
    this.email = user.email;
    this.nickname = user.nickname;
    this.rol = UserRol.STANDARD;
    this.isActive = false;
    this.password = user.password;
  }

  @BeforeCreate()
  async hashPassword() {
    if (this.password) {
      // Hasheamos la contraseña con bcrypt
      const saltRounds = 10;
      this.password = await bcrypt.hash(this.password, saltRounds); // Aseguramos que la contraseña se hashee correctamente
    }
  }
}
