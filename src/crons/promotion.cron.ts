// src/crons/promotion.cron.ts

import { MikroORM } from '@mikro-orm/core';
import moment from 'moment';
import cron from 'node-cron';

import { PromotionService } from '../services/promotion.service';
import { createRetryingEntityManager } from '../utils/orm-retry';

/**
 * Registra todos los CRON jobs del módulo de promociones.
 * Llamar a esta función una sola vez al arrancar la aplicación,
 * después de que MikroORM esté inicializado.
 *
 * Uso:
 *   import { registerPromotionCrons } from './crons/promotion.cron';
 *   registerPromotionCrons(orm);
 */
export function registerPromotionCrons(orm: MikroORM): void {
  // ── Promociones caducadas ────────────────────────────────────────
  // Cada día a las 00:00 UTC
  // Marca como inactivas (isActive = false) las promociones de
  // cualquier empresa cuya fecha de caducidad (expiresAt) ya pasó.
  cron.schedule(
    '0 0 * * *',
    () =>
      runSafely('deactivateExpiredPromotions', async () => {
        const em = createRetryingEntityManager(orm, true);
        const service = new PromotionService(em);
        const count = await service.deactivateExpiredPromotions();
        console.log(`[CRON] Deactivated ${count} expired promotions`);
      }),
    { timezone: 'UTC' }
  );
}

// ─────────────────────────────────────────────────────────────────────
// IMPLEMENTACIÓN INTERNA
// ─────────────────────────────────────────────────────────────────────

/**
 * Envuelve la tarea en try/catch para que un error no tumbe el proceso.
 */
async function runSafely(
  label: string,
  task: () => Promise<void>
): Promise<void> {
  console.log(`[CRON] "${label}" — starting at ${moment().toISOString()}`);
  try {
    await task();
    console.log(`[CRON] "${label}" — completed`);
  } catch (error: any) {
    console.error(`[CRON] "${label}" — failed:`, error?.message ?? error);
  }
}
