import { EntityManager } from "@mikro-orm/postgresql";
import { Company } from "../entities/Company";
import { Message } from "../entities/Message";
import { ScheduleOptions } from "../entities/ScheduleOptions";
import { User } from "../entities/User";
import { UserRoleEnum } from "../types/enums";
import { CompanyProps } from "../types/resolvers";

export const createAdminCompany = (
  em: EntityManager,
  user: User,
  company: CompanyProps
) => {
  const newCompany = em.create(Company, company);

  user.companies.add(newCompany);
  const firstForumMessage = em.create(Message, {
    sender: user,
    receiver: null,
    text: `Welcome to the forum`,
    isForumMessage: true,
    company: newCompany,
    isFixed: false
  });

  const scheduleOptions = em.create(ScheduleOptions, {
    company: newCompany,
    maxActiveReservations: 1,
    maxAdvanceBookingDays: 1,
    sameDayBookingAllowed: false,
    fullOpenHours: 0,
  });
  return {
    newCompany,
    newScheduleOptions: scheduleOptions,
    newFirstForumMessage: firstForumMessage,
    newUser: user,
  };
};
