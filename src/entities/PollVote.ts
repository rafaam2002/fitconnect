import {
  Entity,
  EntityRepositoryType,
  ManyToOne,
  PrimaryKey,
  Property,
  EntityManager,
  BeforeCreate,
  BeforeUpdate,
  Unique,
  t,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { Poll } from "./Poll";
import { User } from "./User";
import { CustomPollRepository } from "../customRepositories/pollRepository";
import { randomUUID } from "crypto";

@Entity({ repository: () => CustomPollRepository })
export class PollVote {
  [EntityRepositoryType]?: CustomPollRepository;
  @Unique()
  @Property({ type: t.uuid })
  id: string = randomUUID();

  @ManyToOne(() => Poll, { primary: true, deleteRule: "cascade" })
  poll!: Poll;

  @ManyToOne(() => User, { primary: true, deleteRule: "cascade" })
  user!: User;

  @Property()
  optionSelected!: number;

  @BeforeCreate()
  @BeforeUpdate()
  validate() {
    if (
      this.optionSelected < 0 ||
      this.optionSelected >= this.poll.options.length
    ) {
      throw new Error("The selected option is not valid");
    }
  }

  constructor(pollVote: PollVote, em: EntityManager) {
    this.poll = pollVote.poll;
    this.user = pollVote.user;
    this.optionSelected = pollVote.optionSelected;
  }
}
