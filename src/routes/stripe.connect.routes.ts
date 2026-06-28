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

  // ── GET /stripe/refresh ────────────────────────────────────────────────────
  // Stripe redirige aquí si el Account Link caduca, el usuario recarga la página
  // por accidente o la sesión expira.
  // Query params: ?companyId=...
  router.get('/refresh', async (req: Request, res: Response) => {
    const { companyId } = req.query as Record<string, string>;

    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing companyId' });
    }

    try {
      const em = orm.em.fork();
      const service = new StripeConnectService(em);

      // Generamos un nuevo enlace fresco y redirigimos al admin de vuelta a Stripe
      // de forma transparente para que continúe donde se quedó.
      const url = await service.getOnboardingLink(companyId);
      res.redirect(url);
    } catch (err: any) {
      console.error('[StripeConnect] Refresh error:', err.message);
      res.status(500).send('Error al refrescar el enlace de Stripe.');
    }
  });

  // ── GET /stripe/return ─────────────────────────────────────────────────────
  // Stripe redirige aquí cuando el admin termina de rellenar el formulario
  // o si decide pulsar en "Volver a la aplicación".
  // Query params: ?companyId=...
  router.get('/return', async (req: Request, res: Response) => {
    // Reutilizamos la misma lógica de entorno que ya tienes en el callback
    const frontendWebUrl =
      process.env.FRONTEND_WEB_URL ??
      process.env.FRONTEND_URL ??
      'http://localhost:3000';

    /* Nota: Si vas a soportar el rellenado de datos faltantes también desde la 
      app móvil (React Native/Expo), asegúrate de enviar '&platform=mobile' en el 
      getOnboardingLink() y capturarlo aquí en req.query para usar mobileScheme. 
      Por defecto asumo que esto se gestiona desde el panel web de administración.
    */

    // Redirigimos al admin de vuelta a su panel de configuración de pagos.
    // Tu frontend, al ver este parámetro en la URL, debería volver a llamar a
    // tu backend para obtener getConnectionDetails() y comprobar si
    // chargesEnabled ya cambió a true.
    const returnRedirect = `${frontendWebUrl}/settings/payments?stripe=returned`;

    res.redirect(returnRedirect);
  });

  return router;
}
