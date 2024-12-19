import { EntityRepository } from "@mikro-orm/postgresql";
import { Schedule } from "../entities/Schedule";
import { ScheduleProgrammed } from "../entities/ScheduleProgrammed";
import { createScheduleInXWeeks } from "../utils/schedules";

export class CustomScheduleProgrammedRepository extends EntityRepository<ScheduleProgrammed> {
  // Métodos personalizados...
  public async createSchedulesFromSchedulesProgrammed(): Promise<string> {
    const weeksFromNow = 3;
    const schedulesProgrammed = await this.findAll();
    schedulesProgrammed.forEach((scheduleProgrammed) => {
      const now = new Date();
      scheduleProgrammed.daysOfWeek.forEach(async (day) => {
        await createScheduleInXWeeks(now, day, 3, scheduleProgrammed, this.em);
        //hace falta poner el await aqui?
      });
    });
    return `Schedules created successfully`;
  }
}
