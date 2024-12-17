import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { PollFactory } from "../factories/PollFactory";
import { User } from "../entities/User";
import { UserRol } from "../types/enums";

export class PollSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const userRepo = em.getRepository(User);
    const users = await userRepo.find({
      rol: { $in: [UserRol.BOSS, UserRol.COACH] },
    });
    new PollFactory(em,users).make(50);
  }
}
