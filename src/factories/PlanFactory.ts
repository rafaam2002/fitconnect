import { Factory } from "@mikro-orm/seeder";
import { faker } from "@faker-js/faker";
import {Plan} from "../entities/Plan";

export class PlanFactory extends Factory<Plan> {
    model = Plan;

    definition() {
        return {
            name: faker.commerce.productName(),
            description: faker.commerce.productDescription(),
            price: faker.helpers.rangeToNumber({ min: 5, max: 100 }),
            currency: faker.finance.currencyCode(),
            durationInDays: faker.helpers.rangeToNumber({ min: 7, max: 365 }),
            isActive: faker.datatype.boolean(),
        };
    }
}
