import { MikroORM } from '@mikro-orm/core';
import moment from 'moment';

import config from '../mikro-orm.config';
import { NotificationService } from '../services/notification.service';
import { NotificationType } from '../types/enums';
import { createRetryingEntityManager } from '../utils/orm-retry';

async function run() {
  console.log(
    `🔄 [${moment().format('YYYY-MM-DD HH:mm:ss')}] Inicializando base de datos...`
  );
  const orm = await MikroORM.init(config);

  // Filtro companyContext desactivado (bypass tenant)
  const em = createRetryingEntityManager(orm, true);

  try {
    const targetUserId = '0a7fcee9-64d1-4875-9a49-11c3778457df';
    const title = 'Notificación de Prueba';
    const body =
      'Este es un mensaje de prueba para validar el sistema de notificaciones.';

    console.log(
      `🚀 [${moment().format('YYYY-MM-DD HH:mm:ss')}] Enviando notificación al usuario '${targetUserId}'...`
    );

    const notificationService = new NotificationService(em);

    await notificationService.sendToUser(targetUserId, title, body, {
      type: NotificationType.INFO,
    });

    console.log(
      `✅ [${moment().format('YYYY-MM-DD HH:mm:ss')}] Notificación enviada exitosamente.`
    );
  } catch (error: any) {
    console.error(
      `❌ [${moment().format('YYYY-MM-DD HH:mm:ss')}] Error durante la ejecución:`,
      error
    );
  } finally {
    await orm.close();
    console.log(
      `🔌 [${moment().format('YYYY-MM-DD HH:mm:ss')}] Conexión a la base de datos cerrada.`
    );
  }
}

run().catch(err => {
  console.error('❌ Error fatal en el script:', err);
});
