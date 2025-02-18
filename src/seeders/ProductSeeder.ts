import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { UserFactory } from "../factories/UserFactory";
import { Schedule } from "../entities/Schedule";
import { faker } from "@faker-js/faker";
import { UserRol } from "../types/enums";
import { User } from "../entities/User";
import { Promotion } from "../entities/Promotion";
import { ScheduleFactory } from "../factories/ScheduleFactory";
import { PollVoteFactory } from "../factories/PollVoteFactory";
import { PollFactory } from "../factories/PollFactory";
import { MessageFactory } from "../factories/MessageFactory";
import { ProductFactory } from "../factories/ProductFactory";

export class ProductSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    new ProductFactory(em).make(12);
  }
}
