import { faker } from '@faker-js/faker';
import { EntityManager } from '@mikro-orm/core';
import { Factory } from '@mikro-orm/seeder';

import { PollVote } from '../entities/PollVote';
import { User } from '../entities/User';

export class PollVoteFactory extends Factory<PollVote> {
  model = PollVote;
  private user: User;

  constructor(em: EntityManager, user: User) {
    super(em);
    this.user = user;
  }

  definition(): Partial<PollVote> {
    return {
      optionSelected: faker.helpers.arrayElement(
        Array.from({ length: 2 }, (_, index) => index)
      ),
      user: this.user,
    };
  }
}
