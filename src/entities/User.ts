import {
  BeforeCreate,
  Collection,
  Entity,
  Enum,
  Filter,
  Index,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  Property,
  t,
} from "@mikro-orm/core";
import { UserProviderType, UserRole } from "../types/enums";
import { BaseEntity } from "./BaseEntity";
import { Schedule } from "./Schedule";
import { Message } from "./Message";
import { Poll } from "./Poll";
import { Promotion } from "./Promotion";
import { PollVote } from "./PollVote";
import bcrypt from "bcrypt";
import { Subscription } from "./Subscription";
import { TrainingTask } from "./TraningITask";
import { UserWeight } from "./UserWeight";
import { PictureUrl } from "./PictureUrl";
import { RefreshToken } from "./RefreshToken";
import { Transaction } from "./Transaction";
import { PushToken } from "./PushToken";
import { MemberShip } from "./MemberShip";
import { Company } from "./Company";

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  PENDING = "pending",
}

@Entity()
@Filter({
  name: "company",
  cond: (args) => ({ memberships: { company: args.companyId } }),
  default: false,
})
export class User extends BaseEntity {
  @Property({ type: t.string, nullable: true })
  name?: string | null;

  @Property({ type: t.string, nullable: true })
  surname?: string | null;

  @Property({ type: t.string, lazy: true, nullable: true }) // means that the property will be loaded only when accessed
  password?: string | null;

  @Property({ type: t.string, unique: true })
  @Index()
  email: string | undefined;

  @Property({ nullable: true })
  phoneNumber?: string | null;

  // @Property({ nullable: true })
  // profilePicture?: string;

  @Property({ type: t.string, unique: true })
  nickname: string;

  @Property()
  isActive: boolean;

  @Property({ type: t.boolean })
  isBlocked: boolean;

  @Property({ type: t.boolean })
  isVerified: boolean = false;

  @Property({ type: t.string })
  provider: UserProviderType = UserProviderType.LOCAL;

  @OneToMany(() => MemberShip, (memberShip) => memberShip.user, { eager: true })
  memberships = new Collection<MemberShip>(this);

  @ManyToOne(() => MemberShip, { nullable: true, eager: true })
  activeMembership?: MemberShip;

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

  @OneToMany(() => Poll, (poll) => poll.admin, { lazy: true })
  adminPolls = new Collection<Poll>(this);

  @OneToMany(() => PollVote, (PollVote) => PollVote.user, { lazy: true })
  pollVotes = new Collection<PollVote>(this);

  @OneToMany(() => Subscription, (subscription) => subscription.user)
  subscriptions = new Collection<Subscription>(this);

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions = new Collection<Transaction>(this);

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

  @OneToOne(() => PictureUrl, (picture) => picture.user, {
    nullable: true,
    owner: true,
    eager: true,
  })
  pictureUrl?: PictureUrl;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user, {
    lazy: true,
  })
  refreshTokens = new Collection<RefreshToken>(this);

  @OneToMany(() => PushToken, (pushToken) => pushToken.user, { lazy: true })
  pushTokens = new Collection<PushToken>(this);

  constructor(user: User) {
    super();
    this.name = user.name;
    this.surname = user.surname;
    this.nickname = user.nickname;
    this.isActive = true;
    this.isBlocked = false;
    this.password = user.password;
    this.provider = user.provider || UserProviderType.LOCAL;
  }

  get fullName(): string {
    return `${this.name} ${this.surname}`;
  }

  get currentRole(): UserRole | null {
    return this.activeMembership ? this.activeMembership.role : null;
  }

  /* @BeforeCreate()
     @BeforeUpdate()
     validateEmail() {
         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
         if (!emailRegex.test(this.email)) {
             throw new Error('Invalid email format');
         }
     }*/

  @BeforeCreate()
  async hashPassword() {
    if (this.password) {
      // Hasheamos la contraseña con bcrypt
      const saltRounds = 10;
      this.password = await bcrypt.hash(this.password, saltRounds); // Aseguramos que la contraseña se hashee correctamente
    }
  }
}
