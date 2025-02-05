import { Factory } from "@mikro-orm/seeder";
import { faker } from "@faker-js/faker";
import { User } from "../entities/User";
import { EntityManager } from "@mikro-orm/core";
import { Schedule } from "../entities/Schedule";
import { randomUser } from "../utils/factories";
import { ScheduleState, UserRol } from "../types/enums";

export class ScheduleFactory extends Factory<Schedule> {
  model = Schedule;

  constructor(em: EntityManager) {
    super(em);
    this.model = Schedule;
  }

  definition(): Partial<Schedule> {
    const startDate = faker.date.soon({ days: 14 });
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Añadir 1 hora a startDate
    return {
      title: faker.lorem.words(2),
      startDate,
      endDate,
      maxUsers: faker.helpers.rangeToNumber({ min: 5, max: 50 }),
      state: faker.helpers.weightedArrayElement([
        { value: ScheduleState.AVAILABLE, weight: 0.7 },
        { value: ScheduleState.FULL, weight: 0.15 },
        { value: ScheduleState.CANCELLED, weight: 0.15 },
      ]),
    };
  }
}
