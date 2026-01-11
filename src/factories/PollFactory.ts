import { Factory } from '@mikro-orm/seeder';
import { faker } from '@faker-js/faker';
import { User } from '../entities/User';
import { EntityManager } from '@mikro-orm/core';
import { Poll } from '../entities/Poll';

export class PollFactory extends Factory<Poll> {
  model = Poll;

  private user;

  constructor(em: EntityManager, user: User) {
    super(em);
    this.user = user;
  }

  definition(): Partial<Poll> {
    return {
      endDate: faker.date.future(),
      title: faker.lorem.sentence().slice(0, 50),
      options: faker.helpers.arrayElements(
        ['si', 'no', 'tal vez', 'podria', 'eventualmente', 'no me apetece'],
        { min: 2, max: 10 }
      ),
      admin: this.user,
    };
  }
}
