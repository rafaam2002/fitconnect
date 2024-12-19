import { Factory } from "@mikro-orm/seeder";
import { faker } from "@faker-js/faker";
import { User } from "../entities/User";
import { EntityManager } from "@mikro-orm/core";
import { Schedule } from "../entities/Schedule";
import { Poll } from "../entities/Poll";
import { randomUser } from "../utils/factories";

export class PollFactory extends Factory<Poll> {
  model = Poll;

    private users;
  constructor(em: EntityManager,users: User[]) {
    super(em);
        this.users = users;
  }

  definition(): Partial<Poll> {
    return {
      startDate: faker.date.future(),
      endDate: faker.date.future(),
      title: faker.lorem.sentence(),
      options: faker.helpers.arrayElements(
        [
          "option 1",
          "option 2",
          "option 3",
          "option 4",
          "option 5",
          "option 6",
          "option 7",
          "option 8",
          "option 9",
          "option 10",
        ],
        { min: 2, max: 10 }
        ),
      admin: randomUser(this.users),
    };
  }
}
