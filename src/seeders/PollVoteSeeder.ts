// @ts-ignore

import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { PollVote } from '../entities/PollVote';

export class PollVoteSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    await em.findAll(PollVote);
  }
}
