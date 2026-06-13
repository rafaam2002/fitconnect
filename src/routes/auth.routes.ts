import { Router } from 'express';
import jwt from 'jsonwebtoken';

import { User } from '../entities/User';
import { AuthService } from '../services/auth.service';
import { createRetryingEntityManager } from '../utils/orm-retry';
import { renderPage } from '../utils/templates.util';

export function createAuthRouter(orm: any): Router {
  const router = Router();

  /**
   * GET /auth/verify-email?token=xxx
   * Verifica el email del usuario tras el registro.
   */
  router.get('/verify-email', async (req, res) => {
    const token = req.query.token as string;

    try {
      const { id: email } = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
      };

      const em = createRetryingEntityManager(orm);
      const user = await em.findOne(User, { email });

      if (!user) {
        return res
          .status(400)
          .send(
            renderPage('Verificación fallida', 'Usuario no encontrado', false)
          );
      }

      user.isVerified = true;
      em.persist(user);
      await em.flush();

      return res
        .status(200)
        .send(
          renderPage(
            '¡Correo verificado!',
            'Gracias por confirmar tu email. Ya puedes entrar en la app.',
            true
          )
        );
    } catch (err: any) {
      return res
        .status(400)
        .send(
          renderPage(
            'Verificación fallida',
            `Token inválido o caducado. ${err.message}`,
            false
          )
        );
    }
  });

  /**
   * GET /auth/reset-password?token=xxx
   * Resetea la contraseña del usuario y envía la nueva por email.
   */
  router.get('/reset-password', async (req, res) => {
    const token = req.query.token as string;
    const em = createRetryingEntityManager(orm);
    const authService = new AuthService(em);
    const html = await authService.resetRandomPassword(token);
    const isSuccess = html.includes('¡Cambio de contraseña completado!');

    return res.status(isSuccess ? 200 : 400).send(html);
  });

  return router;
}
