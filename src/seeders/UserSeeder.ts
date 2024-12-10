import type {EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import {UserFactory} from "../factories/UserFactory";
import {Schedule} from "../entities/Schedule";
import {faker} from "@faker-js/faker";

export class UserSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {

        const schedules = await em.find(Schedule, {});
        await new UserFactory(em).create(100, {schedules: faker.helpers.arrayElements(schedules, {min: 5, max: 10})});
    }
}

