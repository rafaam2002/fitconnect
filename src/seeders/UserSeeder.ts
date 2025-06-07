import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { UserFactory } from "../factories/UserFactory";
import { Schedule } from "../entities/Schedule";
import { faker } from "@faker-js/faker";
import { UserRol } from "../types/enums";
import { User } from "../entities/User";
import { Promotion } from "../entities/Promotion";
import { PollVoteFactory } from "../factories/PollVoteFactory";
import { PollFactory } from "../factories/PollFactory";
import { ScheduleOptions } from "../entities/ScheduleOptions";


export class UserSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const schedules = await em.find(Schedule, {});
    const promotions = await em.find(Promotion, {});
    let cont = 0;

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

    const schedulesOptions = em.create(ScheduleOptions, {
      maxActiveReservations: 3,
      sameDayBookingAllowed: true,
      fullOpenHours: 2, // 0 means always full
      maxAdvanceBookingDays: 3,
    });

    await em.persistAndFlush(schedulesOptions);

    new UserFactory(em)
      .each((user) => {
        if (cont < 2) {
          cont++;
          new PollFactory(em, user)
            .each(async (poll) => {
              poll.pollVotes.set(new PollVoteFactory(em, user).make(1));
            })
            .make(1);
        }
      })
      .make(50, {
        schedules: faker.helpers.arrayElements(schedules, { min: 5, max: 10 }),
        promotions: faker.helpers.arrayElements(promotions, {
          min: 5,
          max: 10,
        }),
      });
  }
}
