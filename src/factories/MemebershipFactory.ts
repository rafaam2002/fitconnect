import { Factory } from "@mikro-orm/seeder";
import { faker } from "@faker-js/faker";
import { MemberShip } from "../entities/MemberShip";
import { Schedule } from "../entities/Schedule";
import { UserRole } from "../types/enums";

export class MemberShipFactory extends Factory<MemberShip> {
  model = MemberShip;

  definition(): Partial<MemberShip> {
    const MemberShipSchedules: Schedule[] = [];

    return {
      role: faker.helpers.arrayElement([
        UserRole.STANDARD,
        UserRole.COACH,
        UserRole.PREMIUM,
      ]),
    };
  }
}
