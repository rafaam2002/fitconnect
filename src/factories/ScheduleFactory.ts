import { Factory } from "@mikro-orm/seeder";
import { faker } from "@faker-js/faker";
import { User } from "../entities/User";
import { EntityManager } from "@mikro-orm/core";
import { Schedule } from "../entities/Schedule";
import { randomUser } from "../utils/factories";

export class ScheduleFactory extends Factory<Schedule> {
  model = Schedule;

  private users: User[];
  constructor(em: EntityManager, users: User[]) {
    super(em);
    this.users = users;
  }

  definition(): Partial<Schedule> {
    return {
      startDate: faker.date.future(),
      Duration: faker.helpers.rangeToNumber({ min: 30, max: 180 }),
      maxUsers: faker.helpers.rangeToNumber({ min: 5, max: 50 }),
      isCancelled: faker.datatype.boolean(),
      admin: randomUser(this.users),
    };
  }
}
