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
            paymentDate: faker.helpers.rangeToNumber({ min: 1, max: 31 }),
            isActive: faker.datatype.boolean(),
            paymentType: faker.helpers.arrayElement(['MENSUAL', 'ANUAL']),
        };
    }
}
