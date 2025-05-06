import { Factory } from "@mikro-orm/seeder";
import { faker } from "@faker-js/faker";
import { User } from "../entities/User";
import { UserRol } from "../types/enums";
import { Schedule } from "../entities/Schedule";
import { array } from "zod";

export class UserFactory extends Factory<User> {
  model = User;

  definition(): Partial<User> {
    const userSchedules: Schedule[] = [];

    return {
      name: faker.person.firstName(),
      surname: faker.person.lastName(),
      password: process.env.DEFAULT_PASSWORD || "123456",
      email: faker.internet.email(),
      phoneNumber: faker.phone.number(),
      //profilePicture: faker.datatype.boolean() ? faker.image.avatar() : null,
      nickname: faker.internet.username(),
      isActive: faker.datatype.boolean(),
      isBlocked: faker.datatype.boolean(),
      rol: faker.helpers.weightedArrayElement([
        { value: UserRol.BOSS, weight: 0.1 },
        { value: UserRol.COACH, weight: 0.1 },
        { value: UserRol.STANDARD, weight: 0.8},
      ]),
      created_at: new Date(),
    };
  }
}
