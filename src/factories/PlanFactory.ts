import {Factory} from "@mikro-orm/seeder";
import {faker} from "@faker-js/faker";
import {Plan, PlanInterval} from "../entities/Plan";

export class PlanFactory extends Factory<Plan> {
    model = Plan;

    definition(): Partial<Plan> {
        return {
            name: faker.commerce.productName(),
            description: faker.commerce.productDescription(),
            amount: faker.helpers.rangeToNumber({min: 5, max: 100}),
            currency: faker.finance.currencyCode(),
            interval: PlanInterval.MONTH,

        };
    }
}
