import { MikroORM } from '@mikro-orm/core';
import cron from 'node-cron';

import { ScheduleProgrammed } from '../entities/ScheduleProgrammed';
import { storeNews } from '../helpers/articles';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { ScheduleService } from '../services/schedule.service';

import { createRetryingEntityManager } from './orm-retry';
import { updatePictureUrls } from './presigned-urls.util';
import { sendScheduleReminders } from './schedules.util';
import { setNotActiveUsers } from './users';

export const cronFunctions = async (orm: MikroORM) => {
  cron.schedule(
    '0 4 * * *', // Ejecuta a las 4:00 AM todos los días
    async () => {
      console.log('🚀 Iniciando tareas programadas...');
      try {
        const authService = new AuthService(
          createRetryingEntityManager(orm, true)
        );
        const deletedTokens = await authService.cleanExpiredRefreshTokens();
        console.log(
          `🧹 [Cron] Se eliminaron ${deletedTokens} refresh tokens expirados de la base de datos.`
        );

        await Promise.all([
          storeNews(createRetryingEntityManager(orm, true), 3, [1, 2, 3, 4]),
          updatePictureUrls(createRetryingEntityManager(orm, true)),
          setNotActiveUsers(createRetryingEntityManager(orm, true)),
          new NotificationService(
            createRetryingEntityManager(orm, true)
          ).cleanOldNotifications(30),
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
        const scheduleProgrammedRepo = createRetryingEntityManager(
          orm,
          true
        ).getRepository(ScheduleProgrammed);
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
        await sendScheduleReminders(createRetryingEntityManager(orm, true));
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
          createRetryingEntityManager(orm, true)
        );
        await scheduleService.cutOffSchedules();
        await scheduleService.checkQuotaThresholds();
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
};
