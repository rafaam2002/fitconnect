import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { UserFactory } from "../factories/UserFactory";
import { ScheduleFactory } from "../factories/ScheduleFactory";
import { faker } from "@faker-js/faker";

export class ScheduleSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    new ScheduleFactory(em)
      .each((schedule) => {
        schedule.users.set(
          new UserFactory(em).make(
             faker.number.int({ min: 2, max: 15 })
           // 1
          )
        );
        schedule.admin = schedule.users.getItems()[0];
      })
      .make(80);
  }
}
