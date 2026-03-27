import { Connection, EntityManager, IDatabaseDriver } from '@mikro-orm/core';
import cron from 'node-cron';

import { ScheduleProgrammed } from '../entities/ScheduleProgrammed';
import { storeNews } from '../helpers/articles';
import { ScheduleService } from '../services/schedule.service';
import { SubscriptionService } from '../services/subscription.service';

import { updatePictureUrls } from './presigned-urls.util';
import { sendScheduleReminders } from './schedules.util';
import { setNotActiveUsers } from './users';

export const cronFunctions = async (
  em: EntityManager<IDatabaseDriver<Connection>>
) => {
  cron.schedule(
    '0 4 * * *', // Ejecuta a las 4:00 AM todos los días
    async () => {
      console.log('🚀 Iniciando tareas programadas...');
      // Aquí debes pasar `em` desde tu contexto de MikroORM
      try {
        await Promise.all([
          storeNews(em, 3, [1, 2, 3, 4]),
          // scheduleProgrammedRepo.createSchedulesFromSchedulesProgrammed(), //se ejecuta en domingo
          updatePictureUrls(em),
          setNotActiveUsers(em),
        ]);
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
        const scheduleProgrammedRepo = em.getRepository(ScheduleProgrammed);
        await scheduleProgrammedRepo.createSchedulesFromSchedulesProgrammed();
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
        await sendScheduleReminders(em.fork());
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
      console.log('🚀 Iniciando tarea de recordatorios de horarios...');
      try {
        const scheduleService = new ScheduleService(em.fork());
        await scheduleService.cutOffSchedules();
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

  cron.schedule('0/10 * * * * *', async () => {
    console.log('📅 Chequeando las suscripciones a punto de expirar.');
    try {
      const subscriptionService = new SubscriptionService(em.fork());
      await subscriptionService.notifyExpiringSubscriptions();
    } catch (error) {
      console.error('[CRON] Error checking expiring subscriptions:', error);
    }
  });
};
