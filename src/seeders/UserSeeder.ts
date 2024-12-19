import type {EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import {UserFactory} from "../factories/UserFactory";
import {Schedule} from "../entities/Schedule";
import {faker} from "@faker-js/faker";
import { UserRol } from "../types/enums";
import { User } from "../entities/User";

export class UserSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {

        const schedules = await em.find(Schedule, {});
        await new UserFactory(em).create(100, { schedules: faker.helpers.arrayElements(schedules, { min: 5, max: 10 }) });
        const myUser = em.create(User,{
            name: "Rafa",
            surname: "Mesa",
            password: "1234",
            email: "rafa",
            phoneNumber: "123456789",
            nickname: "rafa",
            isActive: true,
            isBlocked: false,
            rol: UserRol.BOSS,
            endSubscriptionDate: faker.date.future(),
        });
        await em.persistAndFlush(myUser);
    }
}

