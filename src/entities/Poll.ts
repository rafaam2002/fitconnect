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

@Entity({ repository: () => CustomPollRepository })
export class Poll extends BaseEntity {
  [EntityRepositoryType]?: CustomPollRepository;
  @Property()
  startDate!: Date;

  @Property()
  endDate!: Date; // in minutes

  @Property()
  title!: string;

  @Property()
  options!: string[];

  @ManyToOne(() => User, { nullable: true }) // arreglar
  admin: User;

  @OneToMany(() => PollVote, (pollVote) => pollVote.poll)
  pollVotes = new Collection<PollVote>(this);
}
