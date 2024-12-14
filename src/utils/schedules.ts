import { EntityManager } from "@mikro-orm/core";
import { Schedule } from "../entities/Schedule";
import { ScheduleProgrammed } from "../entities/ScheduleProgrammed";

export const createScheduleInXWeeks = async (
    now: Date,
    day: number,
    weeksFromNow: number,
    scheduleProgrammed: ScheduleProgrammed,
    em: EntityManager
  ) => {
    const daysToAdd = ((7 + day - now.getDay()) % 7) + weeksFromNow * 7;
    const startDate = new Date();
    startDate.setDate(now.getDate() + daysToAdd);
    const [hours, minutes, seconds] = scheduleProgrammed.startHour
      .split(":")
      .map(Number);
    // Ajustar la hora en la fecha objetivo
    startDate.setHours(hours, minutes, seconds, 0);
    const newSchedule = em.create(Schedule, {
      startDate,
      Duration: scheduleProgrammed.Duration,
      maxUsers: scheduleProgrammed.maxUsers,
      isCancelled: false,
      admin: scheduleProgrammed.admin,
      scheduleProgrammed,
    });
    await em.persistAndFlush(newSchedule); 
  }; 