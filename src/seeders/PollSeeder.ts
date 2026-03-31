import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { Poll } from '../entities/Poll';

export class PollSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    await em.findAll(Poll);
  }
}
