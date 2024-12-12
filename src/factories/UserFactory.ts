import {Factory} from "@mikro-orm/seeder";
import {faker} from "@faker-js/faker";
import {User} from "../entities/User";
import {UserRol} from "../types/enums";
import {Collection, EntityManager} from "@mikro-orm/core";
import {Schedule} from "../entities/Schedule";
import crypto from "crypto";
import {ScheduleFactory} from "./ScheduleFactory";

export class UserFactory extends Factory<User> {
    model = User;

    definition(): Partial<User> {
        const userSchedules: Schedule[] = [];

        return {
            name: faker.person.firstName(),
            surname: faker.person.lastName(),
            password: crypto.createHmac("sha256", "1234").digest("hex"),
            email: faker.internet.email(),
            phoneNumber: faker.phone.number(),
            profilePicture: faker.image.avatar(),
            nickname: faker.internet.username(),
            isActive: faker.datatype.boolean(),
            isBlocked: faker.datatype.boolean(),
            startPaymentDate: faker.date.past(),
            endPaymentDate: faker.date.future(),
            rol: faker.helpers.arrayElement([
                "standard",
                "premium",
                "boss",
            ]) as UserRol,
            created_at: new Date()
        };
    }

}

