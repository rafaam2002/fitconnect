import { faker } from '@faker-js/faker';
import { EntityManager } from '@mikro-orm/core';
import { Factory } from '@mikro-orm/seeder';

import { Promotion } from '../entities/Promotion';

export class PromotionFactory extends Factory<Promotion> {
  model = Promotion;

  constructor(em: EntityManager) {
    super(em);
  }

  definition(): Partial<Promotion> {
    const originalPrice = faker.helpers.rangeToNumber({ min: 20, max: 150 });
    const discountPercent = faker.helpers.rangeToNumber({ min: 10, max: 50 });
    const newPrice = Number(
      (originalPrice * (1 - discountPercent / 100)).toFixed(2)
    );

    return {
      title: faker.lorem.sentence(),
      description: faker.lorem.sentence(),
      discountTag: `-${discountPercent}% OFF`,
      originalPrice,
      newPrice,
      expiresAt: faker.date.future(),
      accentColor: faker.color.rgb(),
      isHero: faker.datatype.boolean({ probability: 0.2 }),
      isActive: true,
    };
  }
}
