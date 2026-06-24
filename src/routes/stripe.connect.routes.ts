// routes/stripe.connect.routes.ts
//
// Rutas REST para el flujo OAuth de Stripe Connect.
//
// Rutas:
//   GET  /stripe/connect/:companyId  → redirige al admin a Stripe OAuth
//   GET  /stripe/callback            → recibe el code y completa la conexión
//   DELETE /stripe/disconnect/:companyId → desconecta la cuenta

import { MikroORM } from '@mikro-orm/core';
import { Request, Response, Router } from 'express';

import { authMiddleware } from '../middlewares/auth';
import { StripeConnectService } from '../services/stripe.connect.service';

export function createStripeConnectRouter(orm: MikroORM): Router {
  const router = Router();

  // ── GET /stripe/connect/:companyId ─────────────────────────────────────────
  // El admin pulsa "Conectar con Stripe" → redirigir al portal OAuth de Stripe
  router.get(
    '/connect/:companyId',
    authMiddleware,
    async (req: Request, res: Response) => {
      try {
        const em = orm.em.fork();
        const service = new StripeConnectService(em);
        const url = service.getOAuthUrl(
          req.params.companyId,
          req.params.platform as 'web' | 'mobile'
        );
        res.redirect(url);
      } catch (err: any) {
        console.error(
          '[StripeConnect] Error generating OAuth URL:',
          err.message
        );
        res.status(500).json({ success: false, message: err.message });
      }
    }
  );

  // ── GET /stripe/callback ───────────────────────────────────────────────────
  // Stripe redirige aquí tras la autorización del admin.
  // Query params: ?code=...&state=<companyId>
  router.get('/callback', async (req: Request, res: Response) => {
    const { code, state, error, error_description } = req.query as Record<
      string,
      string
    >;
    const frontendWebUrl =
      process.env.FRONTEND_WEB_URL ??
      process.env.FRONTEND_URL ??
      'http://localhost:3000';
    const mobileScheme = process.env.FRONTEND_MOBILE_SCHEME ?? 'fitconnect';

    // Detectar plataforma desde el state (companyId__mobile o companyId__web)
    const platform = state?.split('__')[1] ?? 'web';
    const isMobile = platform === 'mobile';

    const successRedirect = isMobile
      ? `${mobileScheme}://stripe-callback?stripe=connected`
      : `${frontendWebUrl}/settings/payments?stripe=connected`;

    const errorRedirect = (reason: string) =>
      isMobile
        ? `${mobileScheme}://stripe-callback?stripe=error&reason=${encodeURIComponent(reason)}`
        : `${frontendWebUrl}/settings/payments?stripe=error&reason=${encodeURIComponent(reason)}`;

    if (error) {
      console.warn(`[StripeConnect] OAuth rejected: ${error}`);
      return res.redirect(errorRedirect(error_description ?? error));
    }

    if (!code || !state) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing code or state' });
    }

    try {
      const em = orm.em.fork();
      const service = new StripeConnectService(em);
      // Pasamos el state completo — el service lo separa internamente
      await service.handleOAuthCallback(code, state);
      res.redirect(successRedirect);
    } catch (err: any) {
      console.error('[StripeConnect] Callback error:', err.message);
      res.redirect(errorRedirect(err.message));
    }
  });

  // ── DELETE /stripe/disconnect/:companyId ───────────────────────────────────
  router.delete(
    '/disconnect/:companyId',
    authMiddleware,
    async (req: Request, res: Response) => {
      try {
        const em = orm.em.fork();
        const service = new StripeConnectService(em);
        await service.disconnectCompany(req.params.companyId);
        res.json({ success: true, message: 'Stripe account disconnected' });
      } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
      }
    }
  );

  return router;
}
