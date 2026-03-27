import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { Product } from '../entities/Product';

export class ProductSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    await em.findAll(Product);
  }
}
