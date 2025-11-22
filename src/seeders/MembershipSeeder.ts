import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { UserFactory } from "../factories/UserFactory";
import { Schedule } from "../entities/Schedule";
import { faker } from "@faker-js/faker";
import { User } from "../entities/User";
import { Promotion } from "../entities/Promotion";
import { PollVoteFactory } from "../factories/PollVoteFactory";
import { PollFactory } from "../factories/PollFactory";
import { ScheduleOptions } from "../entities/ScheduleOptions";
import { stripe } from "../utils/const";
import { Stripe } from "stripe";
import { CompanyFactory } from "../factories/CompanyFactory";
import { UserRole } from "../types/enums";
import { MemberShip } from "../entities/MemberShip";
import { Company } from "../entities/Company";
import { MemberShipFactory } from "../factories/MemebershipFactory";

export class MembershipSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    // const companies = new CompanyFactory(em).make(3, {
    //   scheduleOptions: em.create(ScheduleOptions, {
    //     maxActiveReservations: 3,
    //     sameDayBookingAllowed: true,
    //     fullOpenHours: 2, // 0 means always full
    //     maxAdvanceBookingDays: 3,
    //   }),
    // });
    // await em.persistAndFlush(companies);
    // const createdCompanies = await em.find(Company, {});
    // new MemberShipFactory(em)
    //   .make(50);
  }
}
