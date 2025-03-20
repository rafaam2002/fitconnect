import { EntityManager } from "@mikro-orm/core";
import { Schedule } from "../entities/Schedule";
import { ScheduleProgrammed } from "../entities/ScheduleProgrammed";
import { ScheduleState, UserRol } from "../types/enums";
import { User } from "../entities/User";
import { UserType } from "../types";
import moment, { Moment } from "moment";

export const createScheduleInXWeeks = async (
  now: Moment,
  day: number,
  weeksFromNow: number,
  scheduleProgrammed: ScheduleProgrammed,
  em: EntityManager
) => {
  const daysToAdd = ((7 + day - now.day()) % 7) + weeksFromNow * 7;
  const startDate = now.clone().add(daysToAdd, "days");
  const endDate = now.clone().add(daysToAdd, "days");
  const [startHour, startMinutes] = scheduleProgrammed.startHour
    .split(":")
    .map(Number);
  // Ajustar la hora en la fecha objetivo
  const [endHour, endMinutes] = scheduleProgrammed.endHour
    .split(":")
    .map(Number);
  startDate.set({
    hour: startHour,
    minute: startMinutes,
    second: 0,
    millisecond: 0,
  });
  endDate.set({
    hour: endHour,
    minute: endMinutes,
    second: 0,
    millisecond: 0,
  });

  try {
    const newSchedule = em.create(Schedule, {
      startDate: startDate.toDate(),
      endDate: endDate.toDate(),
      maxUsers: scheduleProgrammed.maxUsers,
      state: ScheduleState.AVAILABLE,
      admin: scheduleProgrammed.admin,
      title: scheduleProgrammed.title,
      description: scheduleProgrammed.description,
      scheduleProgrammed,
    });
    await em.persistAndFlush(newSchedule);
  } catch (error) {
    console.log("Error creating schedule", error);
  }
};

export function createDateWithTime(time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export const createScheduleProgrammed = async (
  {
    daysOfWeek = [],
    startHour,
    endHour,
    maxUsers,
    title,
    description,
    admin,
  }: {
    daysOfWeek: number[];
    startHour: string;
    endHour: string;
    maxUsers: number;
    title: string;
    description: string;
    admin: User;
  },
  { em, currentUser }: { em: EntityManager; currentUser: UserType }
) => {
  if (!currentUser) {
    return {
      success: false,
      code: "401",
      message: "Please login",
    };
  }
  if (currentUser.rol === UserRol.STANDARD) {
    return {
      success: false,
      code: "401",
      message: "You don't have permission to create schedules",
    };
  }

  try {
    const newScheduleProgrammed = em.create(ScheduleProgrammed, {
      daysOfWeek,
      startHour,
      endHour,
      maxUsers,
      admin,
      title,
      description,
    });

    await em.persistAndFlush(newScheduleProgrammed);

    await createInitialSchedules(newScheduleProgrammed, em);

    return {
      success: true,
      code: "200",
      message: "Schedule created succesfully",
      scheduleProgrammed: newScheduleProgrammed,
    };
  } catch (error) {
    console.log("Error creating schedule", error);
    return {
      success: false,
      code: "500",
      message: "Error creating schedule",
      error: error.toString(),
    };
  }
};

const createInitialSchedules = async (
  scheduleProgramed: ScheduleProgrammed,
  em: EntityManager
) => {
  const now = moment();
  for (let i = 1; i <= 2; i++) {
    scheduleProgramed.daysOfWeek.forEach(async (day) => {
      await createScheduleInXWeeks(now, day, i, scheduleProgramed, em);
    });
  }
};
