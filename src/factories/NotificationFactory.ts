import { Factory } from "@mikro-orm/seeder";
import { faker } from "@faker-js/faker";
import { User } from "../entities/User";
import { EntityManager } from "@mikro-orm/core";
import { Schedule } from "../entities/Schedule";
import { randomUser } from "../utils/factories";
import { NotificationType } from "../types/enums";
import { Notification } from "../entities/Notification";
import { UserSeeder } from "../seeders/UserSeeder";

export class NotificationFactory extends Factory<Notification> {
  model = Notification;

  private users: User[];
  constructor(em: EntityManager, users: User[]) {
    super(em);
    this.users = users;
  }

  definition(): Partial<Notification> {
    return {
        type: faker.helpers.arrayElement(Object.values(NotificationType)),
        message: faker.lorem.sentence(),
        link: faker.internet.url(),
        user: randomUser(this.users),
    };
  }
}
