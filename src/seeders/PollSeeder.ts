import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import {User, UserRole} from "../entities/User";

export class PollSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const userRepo = em.getRepository(User);
    // const users = await userRepo.find({
    //   e: { $in: [UserRole.BOSS, UserRole.COACH] },
    // });
    // new PollFactory(em, users).each((poll) => {
      
    // }).make(4);
  }
}
