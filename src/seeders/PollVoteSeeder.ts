import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

export class PollVoteSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    //   const users = await em.find(User, {
    //     rol: { $in: [UserRol.BOSS, UserRol.COACH] },
    //   });
    //   const polls = await em.find(Poll, {});
    //   try {
    //     new PollVoteFactory(em, users, polls).make(100);
    //   } catch (error) {
    //     console.error("Error seeding poll votes");
    //     console.error(error.message);
    //   }
  }
}
