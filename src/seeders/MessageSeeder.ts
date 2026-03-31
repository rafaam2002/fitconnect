import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { Message } from '../entities/Message';
import { User } from '../entities/User';

export class MessageSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const userRepo = em.getRepository(User);
    const adminUsers: User[] = await userRepo.find(
      { nickname: { $in: ['rafa', 'juan', 'isaac'] } },
      {
        filters: false,
        populate: ['companies'],
      }
    );

    adminUsers.forEach(async admin => {
      const forumMessage = em.create<Message>(Message, {
        text: 'Welcome to the forum!',
        sender: admin,
        isFixed: false,
        receiver: null,
        company: admin?.companies.getItems()[0].id, // no mapear posteriormente
        isForumMessage: true,
      });
      em.persist(forumMessage);
      await em.flush();
    });
  }
}
