import { Factory } from "@mikro-orm/seeder";
import { faker } from "@faker-js/faker";
import { Product } from "../entities/Product";

export class ProductFactory extends Factory<Product> {
    model = Product;

    definition(): Partial<Product> {
    return {
      name: faker.person.firstName(),
      description:
        "El producto se deberá adquirir en el establecimiento físico",
      price: faker.number.float({ min: 1, max: 300, fractionDigits: 2 }),
      pictures: faker.datatype.boolean()
        ? Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () =>
            faker.image.avatar()
          )
        : null,
    };
  }
}
