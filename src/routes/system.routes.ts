import path from 'node:path';

import express, { Router } from 'express';
import moment from 'moment';

import { deleteAccountHtml } from '../utils/templates.util';

export function createSystemRouter(orm: any): Router {
  const router = Router();

  /**
   * GET /health
   * Comprobación de estado del servidor — usada por load balancers y monitoring.
   */
  router.get('/health', async (req, res) => {
    try {
      const isConnected = orm.isConnected();
      if (!isConnected) {
        return res.status(500).json({
          status: 'ERROR',
          database: 'disconnected',
          timestamp: moment().toDate().toISOString(),
        });
      }
      await orm.em.getConnection().execute('SELECT 1');
      res.status(200).json({
        status: 'OK',
        database: 'connected',
        timestamp: moment().toDate().toISOString(),
        service: 'GraphQL + Webhooks Server',
      });
    } catch (dbError: any) {
      res.status(500).json({
        status: 'ERROR',
        database: 'error',
        error: dbError.message,
        timestamp: moment().toDate().toISOString(),
      });
    }
  });

  /**
   * GET /delete-account
   * Página estática requerida por App Store / Play Store para la política
   * de eliminación de cuenta de usuario.
   */
  router.get('/delete-account', (_req, res) => {
    res.status(200).send(deleteAccountHtml());
  });

  /**
   * /assets — archivos estáticos (imágenes, PDFs, etc.)
   */
  router.use('/assets', express.static(path.join(__dirname, '../assets')));

  return router;
}
