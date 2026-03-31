import { faker } from '@faker-js/faker';
import { EntityManager } from '@mikro-orm/core';
import { Factory } from '@mikro-orm/seeder';

import { Company } from '../entities/Company';

export class CompanyFactory extends Factory<Company> {
  model = Company;

  constructor(em: EntityManager) {
    super(em);
  }
  protected definition(): Partial<Company> {
    return {
      name: faker.company.name(),
      address: faker.location.streetAddress(true),
      phoneNumber: faker.phone.number(),
      email: faker.internet.email(),
      isValidated: true,
    };
  }
}
