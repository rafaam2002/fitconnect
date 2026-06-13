import path from 'node:path';

import express, { Router } from 'express';

import { deleteAccountHtml } from '../utils/templates.util';

export function createSystemRouter(): Router {
  const router = Router();

  /**
   * GET /health
   * Comprobación de estado del servidor — usada por load balancers y monitoring.
   */
  router.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'GraphQL + Webhooks Server',
    });
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
