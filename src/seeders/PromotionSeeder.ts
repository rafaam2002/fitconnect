import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { UserFactory } from "../factories/UserFactory";
import { PromotionFactory } from "../factories/PromotionFactory";
import { User } from "../entities/User";
import { UserRol } from "../types/enums";

export class PromotionSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const userRepo = em.getRepository(User);
    const users = await userRepo.find({
      rol: { $in: [UserRol.BOSS, UserRol.COACH] },
    });

    new PromotionFactory(em, users).make(10);
  }
}
