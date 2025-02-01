import { Factory } from "@mikro-orm/seeder";
import { faker } from "@faker-js/faker";
import { User } from "../entities/User";
import { EntityManager } from "@mikro-orm/core";
import { Schedule } from "../entities/Schedule";
import { randomUser } from "../utils/factories";
import { UserRol } from "../types/enums";

export class ScheduleFactory extends Factory<Schedule> {
  model = Schedule;
  private user: User;
  private backupUser: User;

  constructor(em: EntityManager, user: User, backupUser: User) {
    super(em);
    this.model = Schedule;
    this.backupUser = backupUser; 
    if (user.rol === UserRol.COACH || user.rol === UserRol.BOSS) {
      this.user = user;
    }
  }

  definition(): Partial<Schedule> {
    return {
      startDate: faker.date.recent(),
      endDate: faker.date.future(),
      maxUsers: faker.helpers.rangeToNumber({ min: 5, max: 50 }),
      isCancelled: faker.datatype.boolean(),
      admin: this.user || this.backupUser,
    };
  }
}
