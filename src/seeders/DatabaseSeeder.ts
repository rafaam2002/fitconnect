import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { UserFactory } from "../factories/UserFactory";
import { UserSeeder } from "./UserSeeder";
import {ScheduleSeeder} from "./ScheduleSeeder";

export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    return this.call(em, [ScheduleSeeder,UserSeeder ]);
  }
}
