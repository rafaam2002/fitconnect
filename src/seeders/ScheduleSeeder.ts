import type {EntityManager} from "@mikro-orm/core";
import {Seeder} from "@mikro-orm/seeder";
import {UserFactory} from "../factories/UserFactory";
import {ScheduleFactory} from "../factories/ScheduleFactory";

export class ScheduleSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        new ScheduleFactory(em).make(50);
    }
}

