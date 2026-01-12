import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { ProductFactory } from '../factories/ProductFactory';

export class ProductSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    // new ProductFactory(em).make(12);
  }
}
