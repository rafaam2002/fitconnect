import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { Promotion } from '../entities/Promotion';

export class PromotionSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    await em.findAll(Promotion);
  }
}
