import { Factory } from "@mikro-orm/seeder";
import { faker } from "@faker-js/faker";
import { User } from "../entities/User";
import { EntityManager } from "@mikro-orm/core";
import { Schedule } from "../entities/Schedule";
import { randomUser } from "../utils/factories";
import { UserRol } from "../types/enums";

export class ScheduleFactory extends Factory<Schedule> {
  model = Schedule;

  constructor(em: EntityManager) {
    super(em);
    this.model = Schedule;
  }

  definition(): Partial<Schedule> {
    return {
      startDate: faker.date.recent(),
      endDate: faker.date.future(),
      maxUsers: faker.helpers.rangeToNumber({ min: 5, max: 50 }),
      isCancelled: faker.datatype.boolean(),
    };
  }
}
