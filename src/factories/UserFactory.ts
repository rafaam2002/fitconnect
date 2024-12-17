import {Factory} from "@mikro-orm/seeder";
import {faker} from "@faker-js/faker";
import {User} from "../entities/User";
import {UserRol} from "../types/enums";
import {Schedule} from "../entities/Schedule";

export class UserFactory extends Factory<User> {
    model = User;

    definition(): Partial<User> {
        const userSchedules: Schedule[] = [];

        return {
            name: faker.person.firstName(),
            surname: faker.person.lastName(),
            password: "1111",
            email: faker.internet.email(),
            phoneNumber: faker.phone.number(),
            profilePicture: faker.image.avatar(),
            nickname: faker.internet.username(),
            isActive: faker.datatype.boolean(),
            isBlocked: faker.datatype.boolean(),
            startPaymentDate: faker.date.past(),
            endSubscriptionDate: faker.date.future(),
            rol: faker.helpers.arrayElement(Object.values(UserRol)),
            created_at: new Date()
        };
    }

}

