import { MikroORM } from '@mikro-orm/core';

import config from '../mikro-orm.config';
import { ScheduleService } from '../services/schedule.service';

async function runCutOffSchedules() {
  console.log('🔄 Initializing MikroORM...');
  const orm = await MikroORM.init(config);
  const em = orm.em.fork();

  const scheduleService = new ScheduleService(em);

  console.log('⏰ Running cutOffSchedules task...');
  try {
    await scheduleService.cutOffSchedules();
    console.log('✅ cutOffSchedules executed successfully.');
  } catch (error: any) {
    console.error('❌ Error executing cutOffSchedules:', error);
  } finally {
    await orm.close();
    console.log('🔌 Database connection closed.');
  }
}

runCutOffSchedules().catch(err => {
  console.error('❌ Fatal error in script:', err);
});
