import {
  Collection,
  Entity,
  EntityRepositoryType,
  ManyToMany,
  ManyToOne,
  OneToMany,
  Property,
} from "@mikro-orm/core";
import { BaseEntity } from "./BaseEntity";
import { User } from "./User";
import { CustomPollRepository } from "../customRepositories/pollRepository";
import { PollVote } from "./PollVote";
import { NewPollSchema } from "../validation/schemas";

@Entity({ repository: () => CustomPollRepository })
export class Poll extends BaseEntity {
  [EntityRepositoryType]?: CustomPollRepository;

  @Property()
  endDate!: Date; // in minutes

  @Property()
  title!: string;

  @Property()
  options!: string[];

  @ManyToOne(() => User, { nullable: true }) // arreglar
  admin: User;

  @OneToMany(() => PollVote, (pollVote) => pollVote.poll, { eager: true })
  pollVotes = new Collection<PollVote>(this);

  constructor(poll: Poll) {    
    NewPollSchema.parse(poll);
    super();
    this.endDate = poll.endDate;
    this.title = poll.title;
    this.options = poll.options;
    this.admin = poll.admin;
  }
}
