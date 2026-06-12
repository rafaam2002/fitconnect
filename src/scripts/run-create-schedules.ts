import { MikroORM } from '@mikro-orm/core';

import { ScheduleProgrammed } from '../entities/ScheduleProgrammed';
import config from '../mikro-orm.config';
import { createRetryingEntityManager } from '../utils/orm-retry';

async function run() {
  console.log('🔄 Inicializando base de datos...');
  const orm = await MikroORM.init(config);
  const em = createRetryingEntityManager(orm, true);

  try {
    console.log('🚀 Ejecutando createSchedulesFromSchedulesProgrammed...');
    const repo = em.getRepository(ScheduleProgrammed);
    const result = await repo.createSchedulesFromSchedulesProgrammed();
    console.log(`✅ Resultado: ${result}`);
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
