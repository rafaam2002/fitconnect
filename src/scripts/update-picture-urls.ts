import { MikroORM } from '@mikro-orm/core';

import config from '../mikro-orm.config';
import { createRetryingEntityManager } from '../utils/orm-retry';
import { updatePictureUrls } from '../utils/presigned-urls.util';

async function run() {
  console.log('🔄 Inicializando base de datos...');
  const orm = await MikroORM.init(config);

  // Por defecto se desactiva el filtro companyContext para el script, a menos que el usuario indique lo contrario
  const em = createRetryingEntityManager(orm, true);

  try {
    console.log('🚀 Ejecutando updatePictureUrls...');
    await updatePictureUrls(em);
    console.log('✅ Ejecución de updatePictureUrls completada.');
  } catch (error: any) {
    console.error('❌ Error durante la ejecución:', error);
  } finally {
    await orm.close();
    console.log('🔌 Conexión a la base de datos cerrada.');
  }
}

run().catch(err => {
  console.error('❌ Error fatal en el script:', err);
});
