import { MikroORM } from '@mikro-orm/core';

import config from '../mikro-orm.config';
import { AuthService } from '../services/auth.service';
import { createRetryingEntityManager } from '../utils/orm-retry';

async function run() {
  console.log('🔄 Inicializando base de datos...');
  const orm = await MikroORM.init(config);

  // Filtro companyContext desactivado (bypass tenant)
  const em = createRetryingEntityManager(orm, true);

  try {
    console.log('🚀 Ejecutando cleanExpiredRefreshTokens...');
    const authService = new AuthService(em);
    const deletedTokens = await authService.cleanExpiredRefreshTokens();
    console.log(
      `🧹 Se eliminaron ${deletedTokens} refresh tokens expirados de la base de datos.`
    );
    console.log('✅ Ejecución de cleanExpiredRefreshTokens completada.');
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
