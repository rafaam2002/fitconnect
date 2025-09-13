import { EntityManager } from "@mikro-orm/core";
import { Schedule } from "../entities/Schedule";
import { ScheduleProgrammed } from "../entities/ScheduleProgrammed";
import { ScheduleState, ScheduleType } from "../types/enums";
import {User, UserRole} from "../entities/User";
import { UserType } from "../types";
import moment, { Moment } from "moment";
import { sendPushNotification } from "./notifications";

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
    age,
    type,
  }: {
    daysOfWeek: number[];
    startHour: string;
    endHour: string;
    maxUsers: number;
    title: string;
    description: string;
    admin: User;
    age: number | null;
    type: ScheduleType;
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
  if (currentUser.role === UserRole.STANDARD) {
    return {
      success: false,
      code: "401",
      message: "You don't have permission to create schedules",
    };
  }

  try {
    const newScheduleProgrammed = em.create<ScheduleProgrammed>(ScheduleProgrammed, {
      daysOfWeek,
      startHour,
      endHour,
      maxUsers,
      admin,
      title,
      age,
      type,
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
  scheduleProgrammed: ScheduleProgrammed,
  em: EntityManager
) => {
  const now = moment();

  scheduleProgrammed.daysOfWeek.forEach(async (day) => {
    // Crear horarios para los dos días más cercanos con el mismo número
    for (let i = 0; i < 2; i++) {
      const targetDay = now
        .clone()
        .day(day)
        .add(i * 7, "days");
      if (targetDay.isSameOrAfter(now, "day")) {
        await createScheduleInXWeeks(targetDay, day, 0, scheduleProgrammed, em);
      }
    }
  });
};

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
    const newSchedule = em.create<Schedule>(Schedule, {
      startDate: startDate.toDate(),
      endDate: endDate.toDate(),
      maxUsers: scheduleProgrammed.maxUsers,
      state: ScheduleState.AVAILABLE,
      admin: scheduleProgrammed.admin,
      title: scheduleProgrammed.title,
      description: scheduleProgrammed.description,
      type: scheduleProgrammed.type,
      age: scheduleProgrammed.age,
      scheduleProgrammed,
    });
    await em.persistAndFlush(newSchedule);
  } catch (error) {
    console.log("Error creating schedule", error);
  }
};


export const sendScheduleReminders = async (em: EntityManager) => {
  console.log("🚀 Checking for upcoming schedules to send reminders...");

  const now = moment();
  const twoHoursFromNow = now.clone().add(2, "hours");
  const threeHoursFromNow = twoHoursFromNow.clone().add(1, "hour"); // Changed from 10 minutes to 1 hour

  try {
    const scheduleRepo = em.getRepository(Schedule);
    const upcomingSchedules = await scheduleRepo.find(
      {
        startDate: {
          $gte: twoHoursFromNow.toDate(),
          $lt: threeHoursFromNow.toDate(), // Use the new 1-hour window
        },
        state: ScheduleState.AVAILABLE,
      },
      { populate: ["users", "users.pushTokens"] }
    );

    if (upcomingSchedules.length > 0) {
      console.log(`Found ${upcomingSchedules.length} upcoming schedules.`);
      for (const schedule of upcomingSchedules) {
        const title = "¡Tu clase está a punto de empezar!";
        const body = `Tu clase de "${
          schedule.title
        }" empieza a las ${moment(schedule.startDate).format("HH:mm")}.`;
        const data = {
          type: "schedule_reminder",
          scheduleId: schedule.id,
        };

        schedule.users.getItems().forEach((user) => {
          if (user.pushTokens && user.pushTokens.length > 0) {
            user.pushTokens.getItems().forEach((pushToken) => {
              sendPushNotification(pushToken.token, title, body, data);
            });
          }
        });
      }
    }
  } catch (error) {
    console.error("Error sending schedule reminders:", error);
  }
  console.log("✅ Finished checking for upcoming schedules.");
};