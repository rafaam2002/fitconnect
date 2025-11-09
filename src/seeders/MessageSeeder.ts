import type { EntityManager } from "@mikro-orm/core";
import { User } from "../entities/User";
import { Message } from "../entities/Message";
import { Seeder } from "@mikro-orm/seeder";
import { UserRole } from "../types/enums";

export class MessageSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const userRepo = em.getRepository(User);
    const myUser = await userRepo.findOne(
      { nickname: "rafa" },
      {
        filters: false,
      }
    );

    const forumUser = em.create(User, {
      name: "forum",
      surname: "forum",
      password: "forum",
      email: "forum",
      phoneNumber: "123456789",
      nickname: "forum",
      isActive: false,
      isBlocked: false,
      //role: UserRoleEnum.BOSS,
    });

    const forumMessage = em.create(Message, {
      text: "Welcome to the forum!",
      sender: myUser,
      isFixed: false,
      receiver: forumUser,
      company: myUser?.memberships.getItems()[0].company, // no mapear posteriormente
    });
    await em.persistAndFlush(forumMessage);
  }
}
