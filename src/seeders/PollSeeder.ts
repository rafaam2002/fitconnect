import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import {User} from "../entities/User";

export class PollSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
  }
}
