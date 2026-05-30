import { MikroORM } from '@mikro-orm/core';

import { User } from '../entities/User';
import config from '../mikro-orm.config';
import { sendPushNotification } from '../utils/notification.util';

async function runSendPush() {
  console.log('🔄 Initializing MikroORM...');
  const orm = await MikroORM.init(config);
  const em = orm.em.fork();

  const userId = '0a7fcee9-64d1-4875-9a49-11c3778457df';
  const title = 'Notificación de Prueba';
  const body =
    'Este es un mensaje de prueba enviado desde el script de notificaciones.';
  const data = {
    test: true,
    sentAt: new Date().toISOString(),
    purpose: 'manual_trigger_test',
  };

  console.log(`🔍 Fetching user with ID: ${userId}...`);
  try {
    const user = await em.findOne(
      User,
      { id: userId },
      { populate: ['pushTokens'] }
    );

    if (!user) {
      console.error(`❌ User with ID ${userId} not found in the database.`);
      return;
    }

    const pushTokens = user.pushTokens.getItems();
    console.log(
      `📱 Found ${pushTokens.length} push token(s) for user "${user.name} ${user.surname}".`
    );

    if (pushTokens.length === 0) {
      console.log('⚠️ No push tokens registered for this user.');
      return;
    }

    for (const pushToken of pushTokens) {
      console.log(
        `📤 Sending push notification to token: ${pushToken.token}...`
      );
      try {
        const result = await sendPushNotification(
          pushToken.token,
          title,
          body,
          data
        );
        console.log(
          `✅ Push notification sent. Response:`,
          JSON.stringify(result)
        );
      } catch (pushError: any) {
        console.error(
          `❌ Error sending push to token ${pushToken.token}:`,
          pushError.message
        );
      }
    }
  } catch (error: any) {
    console.error('❌ Error executing database query:', error);
  } finally {
    await orm.close();
    console.log('🔌 Database connection closed.');
  }
}

runSendPush().catch(err => {
  console.error('❌ Fatal error in script:', err);
});
