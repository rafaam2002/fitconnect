import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { UserFactory } from "../factories/UserFactory";
import { ScheduleFactory } from "../factories/ScheduleFactory";
import { User } from "../entities/User";
import { UserRol } from "../types/enums";

export class ScheduleSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const userRepo = em.getRepository(User);
    const users = await userRepo.find({
      rol: { $in: [UserRol.BOSS, UserRol.COACH] },
    });

    new ScheduleFactory(em).each((eschedule) => {
      eschedule.users.set(new UserFactory(em).make(10));
      eschedule.admin = eschedule.users.getItems()[0];
    }).make(20);
  }
}
