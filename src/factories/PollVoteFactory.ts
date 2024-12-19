import { Factory } from "@mikro-orm/seeder";
import { faker } from "@faker-js/faker";
import { User } from "../entities/User";
import { EntityManager } from "@mikro-orm/core";
import { PollVote } from "../entities/PollVote";
import { randomPoll, randomUser, randomUserAndPoll } from "../utils/factories";
import { Poll } from "../entities/Poll";

export class PollVoteFactory extends Factory<PollVote> {
  model = PollVote;
  private usersAndPollsAviable: [User, Poll][] = [];
  private users: User[];
  private polls: Poll[];
  constructor(em: EntityManager, users: User[], polls: Poll[]) {
    super(em);
    this.usersAndPollsAviable = users.flatMap((user) =>
      polls.map((poll) => [user, poll] as [User, Poll])
    );
  }

  definition(): Partial<PollVote> {
    try {
      const { user, poll } = randomUserAndPoll(this.usersAndPollsAviable);
      return {
        poll: poll,
        optionSelected: faker.helpers.arrayElement(
          Array.from({ length: poll.options.length }, (_, index) => index)
        ),
        user: user,
      };
    } catch (e) {
      console.log(e);
    }
  }
}
