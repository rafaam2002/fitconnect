import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { UserFactory } from "../factories/UserFactory";
import { Schedule } from "../entities/Schedule";
import { faker } from "@faker-js/faker";
import { UserRol } from "../types/enums";
import { User } from "../entities/User";
import { Promotion } from "../entities/Promotion";
import { ScheduleFactory } from "../factories/ScheduleFactory";
import { PollVoteFactory } from "../factories/PollVoteFactory";

export class UserSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const schedules = await em.find(Schedule, {});
    const promotions = await em.find(Promotion, {});

    const myUser = em.create(User, {
      name: "Rafa",
      surname: "Mesa",
      password: "rafa",
      email: "rafa",
      phoneNumber: "123456789",
      nickname: "rafa",
      isActive: true,
      isBlocked: false,
      rol: UserRol.BOSS,
    });
    await em.persistAndFlush(myUser);

    await new UserFactory(em)
      .each((user) => {
          user.schedules.set(new ScheduleFactory(em, user, myUser).make(2));
        //   user.pollVotes.set(new PollVoteFactory(em, user).make(2));
      })
      .make(100, {
        schedules: faker.helpers.arrayElements(schedules, { min: 5, max: 10 }),
        promotions: faker.helpers.arrayElements(promotions, {
          min: 5,
          max: 10,
        }),
      })
        
        ;
  }
}
