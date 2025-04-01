import {Factory} from "@mikro-orm/seeder";
import {faker} from "@faker-js/faker";
import {Plan} from "../entities/Plan";
import {PaymentType} from "../types/enums";

export class PlanFactory extends Factory<Plan> {
    model = Plan;

    definition(): Partial<Plan> {
        return {
            name: faker.commerce.productName(),
            description: faker.commerce.productDescription(),
            price: faker.helpers.rangeToNumber({min: 5, max: 100}),
            currency: faker.finance.currencyCode(),
            icon: 'book',
            paymentType: faker.helpers.arrayElement(Object.values(PaymentType)),
            features: faker.helpers.arrayElements([
                "Feature 1",
                "Feature 2",
                "Feature 3",
                "Feature 4",
                "Feature 5",
            ]),
        };
    }
}
