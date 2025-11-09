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
import { CompanyFactory } from "../factories/CompanyFactory";
import { UserRole } from "../types/enums";
import { MemberShip } from "../entities/MemberShip";
import { Company } from "../entities/Company";
import { MemberShipFactory } from "../factories/MemebershipFactory";

export class UserSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    // Explicitly disable filters for all 'find' operations in this seeder.
    // This is the most direct way to prevent "No arguments provided for filter"
    // errors when the seeding context doesn't have filter parameters.

    // em.setFilterParams('company', {});
    // em.getFilterParams.dis

    try {
      const schedules = await em.find(Schedule, {}, { filters: false });
      const promotions = await em.find(Promotion, {}, { filters: false });

      let cont = 0;

      const admins = [
        em.create(User, {
          name: "Rafa",
          surname: "Mesa",
          password: "rafa",
          email: "rafa@mail.com",
          phoneNumber: "123456789",
          nickname: "rafa",
          isActive: true,
          isBlocked: false,
        }),
        em.create(User, {
          name: "Juan",
          surname: "Miguel",
          password: "juan",
          email: "juan@mail.com",
          phoneNumber: "987654321",
          nickname: "juan",
          isActive: true,
          isBlocked: false,
        }),
        em.create(User, {
          name: "Isaac",
          surname: "Pinga",
          password: "isaac",
          email: "isaac@mail.com",
          phoneNumber: "123123123",
          nickname: "isaac",
          isActive: true,
          isBlocked: false,
        }),
      ];

      await em.persistAndFlush(admins);

      const companies = new CompanyFactory(em).make(3, {
        scheduleOptions: em.create(ScheduleOptions, {
          maxActiveReservations: 3,
          sameDayBookingAllowed: true,
          fullOpenHours: 2, // 0 means always full
          maxAdvanceBookingDays: 3,
        }),
      });

      await em.persistAndFlush(companies);
      const createdCompanies = await em.find(Company, {});
      const createdAdmins = await em.find(
        User,
        {
          nickname: { $in: ["rafa", "juan", "isaac"] },
        },
        { filters: false }
      );

      const adminMemberships = createdCompanies.map((company, index) => {
        const membership = em.create(MemberShip, {
          user: createdAdmins[index],
          company: company,
          role: UserRole.BOSS,
        });
        return membership;
      });
      await em.persistAndFlush(adminMemberships);

      new UserFactory(em)
        .each((user) => {
          createdCompanies.forEach((company) => {
            if (cont < 2) {
              cont++;
              new PollFactory(em, user)
                .each(async (poll) => {
                  poll.pollVotes.set(new PollVoteFactory(em, user).make(1));
                  poll.company = faker.helpers.arrayElement(createdCompanies);
                })
                .make(1);
            } else {
              cont = 0;
            }
          });
          new MemberShipFactory(em)
            .each((membership) => {
              membership.company = faker.helpers.arrayElement(createdCompanies);
              membership.user = user;
            })
            .make(1);
        })
        .make(50, {
          schedules: faker.helpers.arrayElements(schedules, {
            min: 5,
            max: 10,
          }),
          promotions: faker.helpers.arrayElements(promotions, {
            min: 5,
            max: 10,
          }),
        });
    } catch (error) {
      console.error("Error during UserSeeder execution:", error);
    }
  }
}
