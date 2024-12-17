import type { EntityManager } from "@mikro-orm/core";
import { UserFactory } from "../factories/UserFactory";
import { ScheduleFactory } from "../factories/ScheduleFactory";
import { User } from "../entities/User";
import { UserRol } from "../types/enums";
import { Message } from "../entities/Message";
import { Seeder } from "@mikro-orm/seeder";
import { MessageFactory } from "../factories/MessageFactory";

export class MessageSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const userRepo = em.getRepository(User);
    const users = await userRepo.findAll();
    try {
      new MessageFactory(em, users).make(50);
    } catch (error) {
      console.error("Error seeding messages");
      console.error(error.message);
    }
  }
}
