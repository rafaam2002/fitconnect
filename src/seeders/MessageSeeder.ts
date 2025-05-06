import type { EntityManager } from "@mikro-orm/core";
import { User } from "../entities/User";
import { UserRol } from "../types/enums";
import { Message } from "../entities/Message";
import { Seeder } from "@mikro-orm/seeder";
import { FORUM } from "../constants/forum";

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
      // profilePicture:
      //   "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSvWcDiCogDIw_r-bnJSjJz67ZnDdelV-eb2w&s",
    });

    const forumMessage = em.create(Message, {
      text: "Welcome to the forum!",
      sender: myUser,
      isFixed: false,
      receiver: forumUser,
    });
    await em.persistAndFlush(forumMessage);

    const forum = await em.findOne(User, { nickname: "forum" });
    FORUM.id = forum.id;
    console.log(forum.id);
  }
}
