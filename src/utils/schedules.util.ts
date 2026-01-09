import { EntityManager } from "@mikro-orm/core";
import moment, { Moment } from "moment";
import { Schedule } from "../entities/Schedule";
import { ScheduleProgrammed } from "../entities/ScheduleProgrammed";
import { User } from "../entities/User";
import { ScheduleState, ScheduleType, UserRoleEnum } from "../types/enums";
import { sendPushNotification } from "./notifications";
import { CurrentUser } from "../types/common.type";
import {
  UnauthorizedError,
  ForbiddenError,
  InternalServerError,
  createServiceResponse
} from "./errors.util";
import { ServiceResponse } from "../types/common.type";

/**
 * Crear fecha con tiempo específico
 */
export function createDateWithTime(time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Crear schedule programado con validaciones y manejo de errores
 */
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
    { em, currentUser }: { em: EntityManager; currentUser: CurrentUser }
): Promise<ScheduleProgrammed> => {
  if (!currentUser) {
    throw new UnauthorizedError();
  }

  if (currentUser.contextRole === UserRoleEnum.STANDARD) {
    throw new ForbiddenError("You don't have permission to create schedules");
  }

  try {
    const newScheduleProgrammed = em.create<ScheduleProgrammed>(
        ScheduleProgrammed,
        {
          daysOfWeek,
          startHour,
          endHour,
          maxUsers,
          admin,
          title,
          age,
          type,
          description,
          company: currentUser.activeCompanyId!
        }
    );

    await em.persistAndFlush(newScheduleProgrammed);

    // Crear schedules iniciales
    await createInitialSchedules(newScheduleProgrammed, em);

   return newScheduleProgrammed;
  } catch (error: any) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      throw error;
    }
    console.error("Error creating schedule:", error);
    throw new InternalServerError("Error creating schedule");
  }
};

/**
 * Crear schedules iniciales para los próximos días programados
 */
const createInitialSchedules = async (
    scheduleProgrammed: ScheduleProgrammed,
    em: EntityManager
): Promise<void> => {
  try {
    const now = moment();

    const promises = scheduleProgrammed.daysOfWeek.map(async (day) => {
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

    await Promise.all(promises);
  } catch (error) {
    console.error("Error creating initial schedules:", error);
    // No lanzar error - los schedules iniciales son secundarios
  }
};

/**
 * Crear schedule en X semanas a partir de una fecha
 */
export const createScheduleInXWeeks = async (
    now: Moment,
    day: number,
    weeksFromNow: number,
    scheduleProgrammed: ScheduleProgrammed,
    em: EntityManager
): Promise<void> => {
  try {
    const daysToAdd = ((7 + day - now.day()) % 7) + weeksFromNow * 7;
    const startDate = now.clone().add(daysToAdd, "days");
    const endDate = now.clone().add(daysToAdd, "days");

    const [startHour, startMinutes] = scheduleProgrammed.startHour
        .split(":")
        .map(Number);
    const [endHour, endMinutes] = scheduleProgrammed.endHour
        .split(":")
        .map(Number);

    // Ajustar la hora en la fecha objetivo
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

    const newSchedule = em.create<Schedule>(Schedule, {
      startDate: startDate.toDate(),
      endDate: endDate.toDate(),
      maxUsers: scheduleProgrammed.maxUsers,
      state: ScheduleState.AVAILABLE,
      admin: scheduleProgrammed.admin!,
      title: scheduleProgrammed.title,
      description: scheduleProgrammed.description,
      type: scheduleProgrammed.type,
      age: scheduleProgrammed.age,
      scheduleProgrammed,
      company: scheduleProgrammed.company!,
    });

    await em.persistAndFlush(newSchedule);
  } catch (error) {
    console.error("Error creating schedule in X weeks:", error);
    // No lanzar error - se intenta crear el siguiente schedule
  }
};

/**
 * Enviar recordatorios de schedules próximos (2-3 horas antes)
 * Esta función se ejecuta por cron job
 */
export const sendScheduleReminders = async (em: EntityManager): Promise<void> => {
  console.log("🚀 Checking for upcoming schedules to send reminders...");

  const now = moment();
  const twoHoursFromNow = now.clone().add(2, "hours");
  const threeHoursFromNow = twoHoursFromNow.clone().add(1, "hour");

  try {
    const scheduleRepo = em.getRepository(Schedule);
    const upcomingSchedules = await scheduleRepo.find(
        {
          startDate: {
            $gte: twoHoursFromNow.toDate(),
            $lt: threeHoursFromNow.toDate(),
          },
          state: ScheduleState.AVAILABLE,
        },
        { populate: ["users", "users.pushTokens"], filters: false }
    );

    if (upcomingSchedules.length === 0) {
      console.log("No upcoming schedules found.");
      return;
    }

    console.log(`Found ${upcomingSchedules.length} upcoming schedules.`);

    for (const schedule of upcomingSchedules) {
      await sendScheduleReminderNotifications(schedule);
    }

    console.log("✅ Finished sending schedule reminders.");
  } catch (error) {
    console.error("Error sending schedule reminders:", error);
    // No lanzar error - es un cron job, solo loguear
  }
};

/**
 * Enviar notificaciones de recordatorio para un schedule específico
 */
const sendScheduleReminderNotifications = async (schedule: Schedule): Promise<void> => {
  try {
    const title = "¡Tu clase está a punto de empezar!";
    const body = `Tu clase de "${schedule.title}" empieza a las ${moment(
        schedule.startDate
    ).format("HH:mm")}.`;
    const data = {
      type: "schedule_reminder",
      scheduleId: schedule.id,
    };

    const users = schedule.users.getItems();

    if (users.length === 0) {
      console.log(`Schedule ${schedule.id} has no users enrolled.`);
      return;
    }

    let notificationsSent = 0;

    for (const user of users) {
      if (user.pushTokens && user.pushTokens.length > 0) {
        const tokens = user.pushTokens.getItems();
        for (const pushToken of tokens) {
          try {
            await sendPushNotification(pushToken.token, title, body, data);
            notificationsSent++;
          } catch (error) {
            console.error(`Failed to send notification to token ${pushToken.token}:`, error);
            // Continuar con el siguiente token
          }
        }
      }
    }

    console.log(`Sent ${notificationsSent} reminder notifications for schedule ${schedule.id}`);
  } catch (error) {
    console.error(`Error sending notifications for schedule ${schedule.id}:`, error);
    // No lanzar error - continuar con el siguiente schedule
  }
};