import type { EntityManager } from "@mikro-orm/core";
import { User } from "../entities/User";
import { Message } from "../entities/Message";
import { Seeder } from "@mikro-orm/seeder";
import { UserRole } from "../types/enums";

export class MessageSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const userRepo = em.getRepository(User);
    const adminUsers = await userRepo.find(
      { nickname: { $in: ["rafa", "juan", "isaac"] } },
      {
        filters: false,
      }
    );

    adminUsers.forEach(async (admin) => {
      const forumUser = em.create(User, {
        name: "forum",
        surname: "forum",
        password: "forum",
        email: admin.memberships.getItems()[0].company.id,
        phoneNumber: "123456789",
        nickname: admin.memberships.getItems()[0].company.id,
        isActive: false,
        isBlocked: false,
        //role: UserRoleEnum.BOSS,
      });
      const forumMessage = em.create(Message, {
        text: "Welcome to the forum!",
        sender: admin,
        isFixed: false,
        receiver: forumUser,
        company: admin?.memberships.getItems()[0].company, // no mapear posteriormente
      });
      await em.persistAndFlush(forumMessage);
    });
  }
}
