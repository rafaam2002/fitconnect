import { EntityRepository } from '@mikro-orm/postgresql';
import moment from 'moment';

import { ScheduleProgrammed } from '../entities/ScheduleProgrammed';
import { createScheduleInXWeeks } from '../utils/schedules.util';

export class CustomScheduleProgrammedRepository extends EntityRepository<ScheduleProgrammed> {
  // Métodos personalizados...
  public async createSchedulesFromSchedulesProgrammed(): Promise<number> {
    const schedulesProgrammed = await this.findAll();
    let createdCount = 0;

    await this.em.transactional(async tem => {
      for (const scheduleProgrammed of schedulesProgrammed) {
        for (const day of scheduleProgrammed.daysOfWeek) {
          const created = await createScheduleInXWeeks(
            moment(),
            day,
            3,
            scheduleProgrammed,
            tem
          );
          if (created) {
            createdCount++;
          }
        }
      }
      await tem.flush();
    });

    return createdCount;
  }
}
