import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { UserFactory } from "../factories/UserFactory";
import { PollVoteFactory } from "../factories/PollVoteFactory";
import { User } from "../entities/User";
import { UserRol } from "../types/enums";
import { Poll } from "../entities/Poll";

export class PollVoteSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const users = await em.find(User, {
      rol: { $in: [UserRol.BOSS, UserRol.COACH] },
    });
    const polls = await em.find(Poll, {});
    try {
      new PollVoteFactory(em, users, polls).make(100);
    } catch (error) {
      console.error("Error seeding poll votes");
      console.error(error.message);
    }
  }
}
