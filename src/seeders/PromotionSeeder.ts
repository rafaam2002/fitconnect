import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";

export class PromotionSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    // const userRepo = em.getRepository(User);
    // const users = await userRepo.find({
    //   //role: { $in: [UserRoleEnum.BOSS, UserRoleEnum.COACH] },
    // }, {
    //   filters: false,
    // });
    // new PromotionFactory(em, users).make(10);
  }
}
