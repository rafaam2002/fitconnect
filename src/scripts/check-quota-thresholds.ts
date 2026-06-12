import { MikroORM } from '@mikro-orm/core';

import config from '../mikro-orm.config';
import { ScheduleService } from '../services/schedule.service';
import { createRetryingEntityManager } from '../utils/orm-retry';

async function run() {
  console.log('🔄 Inicializando base de datos...');
  const orm = await MikroORM.init(config);

  // em con retry de conexión. Segundo argumento es disableTenantFilter (true para desactivar companyContext)
  const em = createRetryingEntityManager(orm, true);

  const scheduleService = new ScheduleService(em);

  try {
    console.log('🚀 Ejecutando lógica del script checkQuotaThresholds...');
    await scheduleService.checkQuotaThresholds();
    console.log('✅ Ejecución completada con éxito.');
  } catch (error: any) {
    console.error('❌ Error durante la ejecución:', error);
  } finally {
    // Es vital cerrar la conexión para evitar procesos colgados
    await orm.close();
    console.log('🔌 Conexión a la base de datos cerrada.');
  }
}

run().catch(err => {
  console.error('❌ Error fatal en el script:', err);
});
