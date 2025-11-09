import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { User } from "../entities/User";
import { NotificationFactory } from "../factories/NotificationFactory";

export class NotificationSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    // const userRepo = em.getRepository(User);
    // const users = await userRepo.findAll();
    // new NotificationFactory(em, users).make(50);
  }
}
