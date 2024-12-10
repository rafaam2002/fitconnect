import {Factory} from "@mikro-orm/seeder";
import {faker} from "@faker-js/faker";
import {User} from "../entities/User";
import {EntityManager} from "@mikro-orm/core";
import {Schedule} from "../entities/Schedule";

export class ScheduleFactory extends Factory<Schedule> {
    model = Schedule;

    private em_2: EntityManager;
    constructor(em: EntityManager) {
        super(em);

        this.em_2 = em

    }

    definition(): Partial<Schedule> {

        return {
            startDate: faker.date.future(),
            Duration: faker.helpers.rangeToNumber({min: 30, max: 180}),
            maxUsers: faker.helpers.rangeToNumber({min: 5, max: 50}),
            isCancelled: faker.datatype.boolean(),
            isProgrammed: faker.datatype.boolean(),
        };
    }
}

