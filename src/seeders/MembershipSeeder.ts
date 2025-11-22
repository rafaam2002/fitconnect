import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";

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
