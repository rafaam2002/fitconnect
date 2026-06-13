import { Application } from 'express';

import { createAdminRouter } from './admin.routes';
import { createAuthRouter } from './auth.routes';
import { createSystemRouter } from './system.routes';

/**
 * registerRoutes
 *
 * Punto de entrada único para todas las rutas REST de la aplicación.
 * Se llama una sola vez en el bootstrap, antes de montar Apollo Server.
 *
 * Estructura de rutas:
 *   /auth/*          → autenticación (verify-email, reset-password)
 *   /admin/*         → administración (verify-company)
 *   /health          → health check
 *   /delete-account  → política de eliminación de cuenta
 *   /assets/*        → archivos estáticos
 */
export function registerRoutes(app: Application, orm: any): void {
  app.use('/auth', createAuthRouter(orm));
  app.use('/admin', createAdminRouter(orm));
  app.use(createSystemRouter());
}
