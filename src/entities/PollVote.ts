import {
  Entity,
  EntityRepositoryType,
  ManyToOne,
  Property,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { Poll } from "./Poll";
import { User } from "./User";
import { CustomPollRepository } from "../customRepositories/pollRepository";

@Entity({ repository: () => CustomPollRepository })
export class PollVote {
  [EntityRepositoryType]?: CustomPollRepository;
  @ManyToOne(() => Poll, { primary: true, deleteRule: "cascade" })
  poll!: Poll;

  @ManyToOne(() => User, { primary: true, deleteRule: "cascade" })
  user!: User;

  @Property()
  optionSelected!: number;
}
