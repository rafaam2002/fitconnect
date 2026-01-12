import {
  Collection,
  Entity,
  EntityRepositoryType,
  Filter,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/core';

import { CustomPollRepository } from '../customRepositories/pollRepository';
import { NewPollSchema } from '../validation/schemas';

import { BaseEntity } from './BaseEntity';
import { Company } from './Company';
import { PollVote } from './PollVote';
import { User } from './User';

@Entity({ repository: () => CustomPollRepository })
@Filter({
  name: 'companyContext',
  cond: args => ({ company: args.companyId }),
  default: true,
})
export class Poll extends BaseEntity {
  [EntityRepositoryType]?: CustomPollRepository;

  @Property()
  endDate: Date; // in minutes

  @Property()
  title: string;

  @Property()
  options: string[];

  @ManyToOne(() => User) // arreglar
  admin: User;

  @OneToMany(() => PollVote, pollVote => pollVote.poll, { eager: true })
  pollVotes = new Collection<PollVote>(this);

  @ManyToOne(() => Company)
  company: Company;

  constructor(poll: Poll) {
    NewPollSchema.parse(poll);
    super();
    this.endDate = poll.endDate;
    this.title = poll.title;
    this.options = poll.options;
    this.admin = poll.admin;
  }
}
