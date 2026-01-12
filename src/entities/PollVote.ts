import {
  BeforeCreate,
  BeforeUpdate,
  Entity,
  EntityManager,
  EntityRepositoryType,
  Filter,
  ManyToOne,
  Property,
} from '@mikro-orm/core';

import { CustomPollRepository } from '../customRepositories/pollRepository';

import { Company } from './Company';
import { Poll } from './Poll';
import { User } from './User';

@Entity({ repository: () => CustomPollRepository })
export class PollVote {
  [EntityRepositoryType]?: CustomPollRepository;

  @ManyToOne(() => Poll, { primary: true, deleteRule: 'cascade' })
  poll!: Poll;

  @ManyToOne(() => User, { primary: true, deleteRule: 'cascade' })
  user!: User;

  @Property()
  optionSelected!: number;

  constructor(pollVote: PollVote, em: EntityManager) {
    this.poll = pollVote.poll;
    this.user = pollVote.user;
    this.optionSelected = pollVote.optionSelected;
  }

  @BeforeCreate()
  @BeforeUpdate()
  validate() {
    if (
      this.optionSelected < 0 ||
      this.optionSelected >= this.poll.options.length
    ) {
      throw new Error('The selected option is not valid');
    }
  }
}
