import { EntityRepository } from '@mikro-orm/postgresql';
import { ScheduleProgrammed } from '../entities/ScheduleProgrammed';
import { createScheduleInXWeeks } from '../utils/schedules.util';
import moment from 'moment';

export class CustomScheduleProgrammedRepository extends EntityRepository<ScheduleProgrammed> {
  // Métodos personalizados...
  public async createSchedulesFromSchedulesProgrammed(): Promise<string> {
    const schedulesProgrammed = await this.findAll();
    schedulesProgrammed.forEach(scheduleProgrammed => {
      scheduleProgrammed.daysOfWeek.forEach(async day => {
        await createScheduleInXWeeks(
          moment(),
          day,
          3,
          scheduleProgrammed,
          this.em
        );
        //hace falta poner el await aqui?
      });
    });
    return `Schedules created successfully`;
  }
}
