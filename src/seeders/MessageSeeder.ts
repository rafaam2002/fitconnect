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
    const myUser = await userRepo.findOne({ nickname: "rafa" });

    const forumUser = em.create(User, { 
      name: "forum",
      surname: "forum",
      password: "forum",
      email: "forum",
      phoneNumber: "123456789",
      nickname: "forum",
      isActive: false,
      isBlocked: false,
      rol: UserRol.BOSS,
    });

    const forumMessage = em.create(Message, {
      text: "Welcome to the forum!",
      isFixed: true,
      sender: myUser,
      receiver: forumUser,
    });
    await em.persistAndFlush(forumMessage);
  }
}
