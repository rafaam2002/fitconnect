import { MikroORM } from '@mikro-orm/core';
import dotenv from 'dotenv';
import moment from 'moment';

import config from '../mikro-orm.config';
import { StripeProcessor } from '../services/stripe.processor';
import { SubscriptionService } from '../services/subscription.service';
import { createRetryingEntityManager } from '../utils/orm-retry';

dotenv.config();

async function run() {
  console.log(
    `🔄 [${moment().format('YYYY-MM-DD HH:mm:ss')}] Inicializando base de datos...`
  );

  const orm = await MikroORM.init(config);

  // em con bypass tenant (true) tal como se especificó en la consulta
  const em = createRetryingEntityManager(orm, true);

  try {
    console.log(
      `🔌 [${moment().format('YYYY-MM-DD HH:mm:ss')}] Inicializando procesador de pagos (Stripe)...`
    );

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    const connectWebhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

    if (!secretKey) {
      throw new Error(
        'La variable de entorno STRIPE_SECRET_KEY no está definida.'
      );
    }

    const stripeProcessor = new StripeProcessor({
      secretKey,
      webhookSecret,
      connectWebhookSecret,
    });

    console.log(
      `🚀 [${moment().format('YYYY-MM-DD HH:mm:ss')}] Creando servicio de suscripciones...`
    );
    const subscriptionService = new SubscriptionService(em, stripeProcessor);

    console.log(
      `⚙️ [${moment().format('YYYY-MM-DD HH:mm:ss')}] Ejecutando processBillingCycle...`
    );
    await subscriptionService.processBillingCycle();

    console.log(
      `✅ [${moment().format('YYYY-MM-DD HH:mm:ss')}] processBillingCycle ejecutado exitosamente.`
    );
  } catch (error: any) {
    console.error(
      `❌ [${moment().format('YYYY-MM-DD HH:mm:ss')}] Error durante la ejecución del script:`,
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
