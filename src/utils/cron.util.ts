import { MikroORM } from '@mikro-orm/core';
import cron from 'node-cron';

import { ScheduleProgrammed } from '../entities/ScheduleProgrammed';
import { storeNews } from '../helpers/articles';
import { ScheduleService } from '../services/schedule.service';
import { SubscriptionService } from '../services/subscription.service';

import { createRetryingEntityManager } from './orm-retry';
import { updatePictureUrls } from './presigned-urls.util';
import { sendScheduleReminders } from './schedules.util';
import { setNotActiveUsers } from './users';

export const cronFunctions = async (em: MikroORM) => {
  cron.schedule(
    '0 4 * * *', // Ejecuta a las 4:00 AM todos los días
    async () => {
      console.log('🚀 Iniciando tareas programadas...');
      // Aquí debes pasar `em` desde tu contexto de MikroORM
      try {
        const [newsCount, pictureCount, deactivatedCount] = await Promise.all([
          storeNews(createRetryingEntityManager(em, true), 3, [1, 2, 3, 4]),
          updatePictureUrls(createRetryingEntityManager(em, true)),
          setNotActiveUsers(createRetryingEntityManager(em, true)),
        ]);
        console.log(
          `[CRON] [Daily Tasks] Success: storeNews (${newsCount} articles), updatePictures (${pictureCount} urls), deactivateUsers (${deactivatedCount} users)`
        );
      } catch (error) {
        console.error('Error al ejecutar la tarea programada:', error);
      }
      console.log('✅ Tareas programadas completadas.');
    },
    {
      timezone: 'Europe/Madrid', // Ajusta según tu zona horaria
    }
  );

  cron.schedule(
    '0 3 * * 0', // Ejecuta a las 3:00 AM todos los domingos
    async () => {
      console.log(
        '🚀 Iniciando tarea programada (creacion de horarios programados)...'
      );
      // Aquí debes pasar `em` desde tu contexto de MikroORM
      try {
        const scheduleProgrammedRepo = createRetryingEntityManager(
          em,
          true
        ).getRepository(ScheduleProgrammed);
        const createdCount =
          await scheduleProgrammedRepo.createSchedulesFromSchedulesProgrammed();
        console.log(
          `[CRON] [Weekly Schedules] Success: Created ${createdCount} schedules from programmed templates`
        );
      } catch (error) {
        console.error(
          'Error al ejecutar la tarea programada (Creacion horarios programados):',
          error
        );
      }
      console.log(
        '✅ Tarea programada completada  (Creacion horarios programados).'
      );
    },
    {
      timezone: 'Europe/Madrid', // Ajusta según tu zona horaria
    }
  );

  cron.schedule(
    '0 * * * *', // Every hour
    async () => {
      console.log('🚀 Iniciando tarea de recordatorios de horarios...');
      try {
        const { schedulesProcessed, notificationsSent } =
          await sendScheduleReminders(createRetryingEntityManager(em, true));
        console.log(
          `[CRON] [Hourly Reminders] Success: Sent ${notificationsSent} reminders across ${schedulesProcessed} upcoming schedules`
        );
      } catch (error) {
        console.error(
          'Error al ejecutar la tarea de recordatorios de horarios:',
          error
        );
      }
      console.log('✅ Tarea de recordatorios de horarios completada.');
    },
    {
      timezone: 'Europe/Madrid',
    }
  );

  cron.schedule(
    '*/30 * * * *', // Every 30 minutes
    async () => {
      console.log(
        '🚀 Iniciando tarea de eliminacion de horarios vacios y alertas de ocupación...'
      );
      try {
        const scheduleService = new ScheduleService(
          createRetryingEntityManager(em, true)
        );
        const [cancelledCount, warningsSent] = await Promise.all([
          scheduleService.cutOffSchedules(),
          scheduleService.checkQuotaThresholds(),
        ]);
        console.log(
          `[CRON] [Quota & Cutoff Tasks] Success: Cancelled ${cancelledCount} schedules, sent ${warningsSent} occupancy warnings`
        );
      } catch (error) {
        console.error(
          'Error al ejecutar la tarea de eliminacion de horarios vacios y alertas de ocupación:',
          error
        );
      }
      console.log(
        '✅ Tarea de eliminacion de horarios vacios y alertas de ocupación completada.'
      );
    },
    {
      timezone: 'Europe/Madrid',
    }
  );

  cron.schedule('0 12 * * *', async () => {
    console.log('📅 Chequeando las suscripciones a punto de expirar.');
    try {
      const subscriptionService = new SubscriptionService(
        createRetryingEntityManager(em, true)
      );
      const notifiedCount =
        await subscriptionService.notifyExpiringSubscriptions();
      console.log(
        `[CRON] [Expiring Subscriptions] Success: Notified ${notifiedCount} users with subscriptions expiring tomorrow`
      );
    } catch (error) {
      console.error('[CRON] Error checking expiring subscriptions:', error);
    }
  });
};
