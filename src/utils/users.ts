import { Connection, EntityManager, IDatabaseDriver } from "@mikro-orm/core";
import { User } from "../entities/User";
import moment from "moment";

export const setNotActiveUsers = async (
  em: EntityManager<IDatabaseDriver<Connection>>
) => {
  const userRepo = em.getRepository(User);
  const users = await userRepo.findAll();

  const deadline = moment().subtract(1, "month");

  users.forEach(async (user) => {
    if (!user.schedules || user.schedules.length === 0) user.isActive = false;
    else if (user.schedules && user.schedules.length > 0)
      user.schedules.getItems().forEach((schedule) => {
        if (moment(Number(schedule.startDate)).isBefore(deadline)) {
          user.isActive = false;
        }
      });
    else user.isActive = true;
  });
};

export const generateTempPassword = (length: number = 6): string => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};
