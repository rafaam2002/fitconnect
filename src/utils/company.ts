import { EntityManager } from "@mikro-orm/postgresql";
import { Company } from "../entities/Company";
import { MemberShip } from "../entities/MemberShip";
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

  const membership = em.create(MemberShip, {
    role: UserRoleEnum.BOSS,
    user: user,
    company: newCompany,
  });

  user.memberships.add(membership);
  user.activeMembership = membership;
  const firstForumMessage = em.create(Message, {
    sender: user,
    receiver: null,
    text: `Welcome to the forum`,
    isForumMessage: true,
    company: newCompany,
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
    newMembership: membership,
    newScheduleOptions: scheduleOptions,
    newFirstForumMessage: firstForumMessage,
    newUser: user,
  };
};
