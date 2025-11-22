import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { ScheduleFactory } from "../factories/ScheduleFactory";
import { Company } from "../entities/Company";
import { User } from "../entities/User";
import { UserRole } from "../types/enums";
import { faker } from "@faker-js/faker";
import { MemberShip } from "../entities/MemberShip";
import { filter } from "lodash";

export class ScheduleSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    // Get all companies that have been created by the UserSeeder
    try {
      const companies = await em.find(Company, {}, { filters: false });

      if (companies.length === 0) {
        console.log(
          "Please run the UserSeeder first to create companies and users."
        );
        return;
      }

      // For each company, create a set of schedules with users from that company
      for (const company of companies) {
        // Find the admin for this company
        const adminMembership = await em.findOne(
          MemberShip,
          {
            company: company,
            role: { $in: [UserRole.BOSS, UserRole.COACH] },
          },
          { populate: ["user"], filters: false }
        );

        if (!adminMembership) {
          console.log(
            `No admin found for company ${company.name}. Skipping schedule creation.`
          );
          continue;
        }
        const admin = adminMembership.user;

        // Find a sample of standard users for this company
        const memberShips = await em.find(
          MemberShip,
          {
            company: company,
            role: UserRole.STANDARD,
          },
          { populate: ["user"], limit: 20, filters: false }
        );
        const usersInCompany = memberShips.map((m) => m.user);

        if (usersInCompany.length === 0) {
          console.log(
            `No standard users found for company ${company.name}. Skipping schedule creation.`
          );
          continue;
        }

        // Create 20 schedules for the current company
        new ScheduleFactory(em)
          .each((schedule) => {
            // Assign the schedule to the company
            schedule.company = company;
            // Assign the admin from this company
            schedule.admin = admin;
            // Assign a random number of users from the pool of users in this company
            schedule.users.set(
              faker.helpers.arrayElements(
                usersInCompany,
                faker.number.int({
                  min: usersInCompany.length < 4 ? 1 : 4,
                  max: Math.min(usersInCompany.length, 15),
                })
              )
            );
          })
          .make(200);
      }
    } catch (error) {
      console.error("Error in ScheduleSeeder:", error);
    }
  }
}
