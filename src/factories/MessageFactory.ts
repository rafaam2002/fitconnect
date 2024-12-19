import { Factory } from "@mikro-orm/seeder";
import { faker } from "@faker-js/faker";
import { User } from "../entities/User";
import { EntityManager } from "@mikro-orm/core";
import { Message } from "../entities/Message";
import { UserRol } from "../types/enums";
import { randomSenderAndReceiver, randomUser } from "../utils/factories";

export class MessageFactory extends Factory<Message> {
  model = Message;

  private users: User[];
  constructor(em: EntityManager, users: User[]) {
    super(em);
    this.users = users;
  }

  definition(): Partial<Message> {
    const {sender, receiver} = randomSenderAndReceiver(this.users);
    return {
      text: faker.lorem.sentence(),
      isFixed: false,
      sender: sender,
      receiver: receiver,
    };
  }
}
