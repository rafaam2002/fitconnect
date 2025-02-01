import { Factory } from "@mikro-orm/seeder";
import { faker } from "@faker-js/faker";
import { User } from "../entities/User";
import { EntityManager } from "@mikro-orm/core";
import { PollVote } from "../entities/PollVote";
import { randomPoll, randomUser, randomUserAndPoll } from "../utils/factories";
import { Poll } from "../entities/Poll";
import { UserRol } from "../types/enums";

export class PollVoteFactory extends Factory<PollVote> {
  model = PollVote;
  private usersAndPollsAviable: [User, Poll][] = [];
  private user: User;
  constructor(em: EntityManager, user: User) {
    super(em);
    this.user = user;
  }

  definition(): Partial<PollVote> {
    try {
      return {
        optionSelected: faker.helpers.arrayElement(
          Array.from({ length: 2 }, (_, index) => index)
        ),
        user: this.user,  
      };
    } catch (e) {
      console.log(e);
    }
  }
}
