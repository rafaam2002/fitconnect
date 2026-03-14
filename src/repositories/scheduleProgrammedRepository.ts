import { EntityRepository } from '@mikro-orm/postgresql';
import moment from 'moment';

import { ScheduleProgrammed } from '../entities/ScheduleProgrammed';
import { createScheduleInXWeeks } from '../utils/schedules.util';

export class CustomScheduleProgrammedRepository extends EntityRepository<ScheduleProgrammed> {
  // Métodos personalizados...
  public async createSchedulesFromSchedulesProgrammed(): Promise<string> {
    const schedulesProgrammed = await this.findAll();

    await this.em.transactional(async tem => {
      for (const scheduleProgrammed of schedulesProgrammed) {
        for (const day of scheduleProgrammed.daysOfWeek) {
          await createScheduleInXWeeks(
            moment(),
            day,
            3,
            scheduleProgrammed,
            tem
          );
        }
      }
      await tem.flush();
    });

    return `Schedules created successfully`;
  }
}
