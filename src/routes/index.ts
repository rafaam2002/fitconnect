import { Application } from 'express';

import { createAdminRouter } from './admin.routes';
import { createAuthRouter } from './auth.routes';
import { createStripeConnectRouter } from './stripe.connect.routes';
import { createSystemRouter } from './system.routes';

/**
 * registerRoutes
 *
 * Estructura de rutas:
 *   /auth/*              → autenticación (verify-email, reset-password)
 *   /admin/*             → administración (verify-company)
 *   /stripe/connect/:id  → OAuth Stripe Connect (redirige al portal de Stripe)
 *   /stripe/callback     → callback OAuth de Stripe
 *   /stripe/disconnect   → desconectar cuenta Stripe
 *   /health              → health check
 */
export function registerRoutes(app: Application, orm: any): void {
  app.use('/auth', createAuthRouter(orm));
  app.use('/admin', createAdminRouter(orm));
  app.use('/stripe', createStripeConnectRouter(orm));
  app.use(createSystemRouter(orm));
}
