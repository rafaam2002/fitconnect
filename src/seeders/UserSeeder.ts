import { faker } from '@faker-js/faker';
import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { Company } from '../entities/Company';
import { Promotion } from '../entities/Promotion';
import { Schedule } from '../entities/Schedule';
import { ScheduleOptions } from '../entities/ScheduleOptions';
import { User } from '../entities/User';
import { UserRole } from '../entities/UserRole';
import { CompanyFactory } from '../factories/CompanyFactory';
import { PollFactory } from '../factories/PollFactory';
import { PollVoteFactory } from '../factories/PollVoteFactory';
import { UserFactory } from '../factories/UserFactory';
import { UserRoleEnum } from '../types/enums';

export class UserSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    // Explicitly disable filters for all 'find' operations in this seeder.
    // This is the most direct way to prevent "No arguments provided for filter"
    // errors when the seeding context doesn't have filter parameters.

    // em.setFilterParams('company', {});
    // em.getFilterParams.dis

    try {
      let cont = 0;

      const schedules = await em.find(Schedule, {}, { filters: false });
      const promotions = await em.find(Promotion, {}, { filters: false });
      const companies = new CompanyFactory(em).make(3, {
        scheduleOptions: em.create(ScheduleOptions, {
          maxActiveReservations: 3,
          sameDayBookingAllowed: true,
          fullOpenHours: 2, // 0 means always full
          maxAdvanceBookingDays: 3,
        }),
      });
      await em.persistAndFlush(companies);
      const createdCompanies: Company[] = await em.find(
        Company,
        {},
        { filters: false }
      );

      const admins = [
        em.create<User>(User, {
          name: 'Rafa',
          surname: 'Mesa',
          password: 'rafa',
          email: 'rafa@mail.com',
          phoneNumber: '123456789',
          nickname: 'rafa',
          isActive: true,
          isBlocked: false,
          companies: [createdCompanies[0]],
          roles: [
            em.create(UserRole, {
              role: UserRoleEnum.BOSS,
              company: createdCompanies[0],
            }),
          ],
        }),
        em.create<User>(User, {
          name: 'Juan',
          surname: 'Miguel',
          password: 'juan',
          email: 'juan@mail.com',
          phoneNumber: '987654321',
          nickname: 'juan',
          isActive: true,
          isBlocked: false,
          companies: [createdCompanies[1]],
          roles: [
            em.create(UserRole, {
              role: UserRoleEnum.BOSS,
              company: createdCompanies[1],
            }),
          ],
        }),
        em.create<User>(User, {
          name: 'Isaac',
          surname: 'Pinga',
          password: 'isaac',
          email: 'isaac@mail.com',
          phoneNumber: '123123123',
          nickname: 'isaac',
          isActive: true,
          isBlocked: false,
          companies: [createdCompanies[2]],
          roles: [
            em.create(UserRole, {
              role: UserRoleEnum.BOSS,
              company: createdCompanies[2],
            }),
          ],
        }),
      ];

      await em.persistAndFlush(admins);

      const createdAdmins = await em.find(
        User,
        {
          nickname: { $in: ['rafa', 'juan', 'isaac'] },
        },
        { filters: false }
      );

      await em.persistAndFlush(createdAdmins);
      let PollsCreated = false;

      new UserFactory(em)
        .each(user => {
          const company = faker.helpers.arrayElement(createdCompanies);
          if (!PollsCreated) {
            createdCompanies.forEach(company => {
              cont++;
              new PollFactory(em, user)
                .each(async poll => {
                  poll.pollVotes.set(new PollVoteFactory(em, user).make(1));
                  poll.company = company;
                })
                .make(3);
            });
            PollsCreated = true;
          }
          user.companies.set([company]);

          user.roles.set([
            em.create<UserRole>(UserRole, {
              role: UserRoleEnum.STANDARD,
              company,
            }),
          ]);
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
      console.error('Error during UserSeeder execution:', error);
    }
  }
}
