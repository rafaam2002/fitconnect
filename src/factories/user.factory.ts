import { faker } from '@faker-js/faker';
import { Factory } from '@mikro-orm/seeder';

import { User } from '../entities/User';

export class UserFactory extends Factory<User> {
  model = User;

  definition(): Partial<User> {
    return {
      name: faker.person.firstName(),
      surname: faker.person.lastName(),
      password: process.env.DEFAULT_PASSWORD || '123456',
      email: faker.internet.exampleEmail({
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
      }),
      phoneNumber: faker.phone.number(),
      //profilePicture: faker.datatype.boolean() ? faker.image.avatar() : null,
      nickname: faker.person.fullName({
        firstName: `${faker.internet.password({
          length: 3,
        })}_${faker.person.firstName()}`,
      }),
      isActive: faker.datatype.boolean(),
      isBlocked: faker.datatype.boolean(),
      created_at: new Date(),
    };
  }
}
