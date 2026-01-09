import {Factory} from "@mikro-orm/seeder";
import {faker} from "@faker-js/faker";
import {User} from "../entities/User";
import {EntityManager} from "@mikro-orm/core";
import {Promotion} from "../entities/Promotion";

export class PromotionFactory extends Factory<Promotion> {
    model = Promotion;

    constructor(em: EntityManager, users: User[]) {
        super(em);
    }

    definition(): Partial<Promotion> {
        return {
            title: faker.lorem.sentence(),
            startDate: faker.date.future(),
            endDate: faker.date.future(),
            price: faker.helpers.rangeToNumber({min: 5, max: 50}),
            description: faker.lorem.sentence(),
        };
    }
}
