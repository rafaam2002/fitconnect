import {Factory} from "@mikro-orm/seeder";
import {Company} from "../entities/Company";
import {EntityData, EntityManager} from "@mikro-orm/core";
import {PlanInterval} from "../entities/Plan";
import {faker} from "@faker-js/faker";

export class CompanyFactory extends Factory<Company> {
    model = Company;

    constructor(em: EntityManager) {
        super(em);
    }
    protected definition(): Partial<Company> {
      return {
          name: faker.company.name(),
          address: faker.location.streetAddress(true),
          logoUrl: faker.image.url({width: 80, height: 80}),
      }
    }
}