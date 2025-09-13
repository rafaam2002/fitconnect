import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { PromotionFactory } from "../factories/PromotionFactory";
import {User, UserRole} from "../entities/User";

export class PromotionSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const userRepo = em.getRepository(User);
    const users = await userRepo.find({
      role: { $in: [UserRole.BOSS, UserRole.COACH] },
    });

    new PromotionFactory(em, users).make(10);
  }
}
