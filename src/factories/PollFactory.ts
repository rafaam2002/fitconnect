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
      endDate: faker.date.future(),
      title: faker.lorem.sentence(),
      options: faker.helpers.arrayElements(
        [
          "si",
          "no",
          "tal vez",
          "podria",
          "eventualmente",
          "no me apetece",
        ],
        { min: 2, max: 10 }
        ),
      admin: randomUser(this.users),
    };
  }
}
