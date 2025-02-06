import { EntityManager } from "@mikro-orm/core";
import { Schedule } from "../entities/Schedule";
import { ScheduleProgrammed } from "../entities/ScheduleProgrammed";
import { ScheduleState } from "../types/enums";

export const createScheduleInXWeeks = async (
  now: Date,
  day: number,
  weeksFromNow: number,
  scheduleProgrammed: ScheduleProgrammed,
  em: EntityManager
) => {
  const daysToAdd = ((7 + day - now.getDay()) % 7) + weeksFromNow * 7;
  const startDate = new Date();
  const endDate = new Date();
  startDate.setDate(now.getDate() + daysToAdd);
  endDate.setDate(now.getDate() + daysToAdd);
  const [startHour, startMinutes, startSeconds] = scheduleProgrammed.startHour
    .split(":")
    .map(Number);
  // Ajustar la hora en la fecha objetivo
  const [endHour, endMinutes, endSeconds] = scheduleProgrammed.endHour
    .split(":")
    .map(Number);
  startDate.setHours(startHour, startMinutes, startSeconds, 0);
  endDate.setHours(endHour, endMinutes, endSeconds, 0);

  const newSchedule = em.create(Schedule, {
    startDate,
    endDate,
    maxUsers: scheduleProgrammed.maxUsers,
    state: ScheduleState.AVAILABLE,
    admin: scheduleProgrammed.admin,
    scheduleProgrammed,
  });
  await em.persistAndFlush(newSchedule);
};

export function createDateWithTime(time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}