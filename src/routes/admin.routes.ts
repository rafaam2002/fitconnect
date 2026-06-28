import { Router } from 'express';
import jwt from 'jsonwebtoken';

import { Company } from '../entities/Company';
import { createRetryingEntityManager } from '../utils/orm-retry';
import { renderPage } from '../utils/templates.util';

export function createAdminRouter(orm: any): Router {
  const router = Router();

  /**
   * GET /admin/verify-company?token=xxx&verify=true|false
   * Aprueba o rechaza una empresa desde el email del superadmin.
   */
  router.get('/verify-company', async (req, res) => {
    const token = req.query.token as string;
    const verify = req.query.verify as string;

    try {
      const { id } = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
      };

      const em = createRetryingEntityManager(orm);
      const company = await em.findOne(Company, { id });

      if (!company) {
        return res
          .status(404)
          .send(
            renderPage('Verificación fallida', 'Compañía no encontrada', false)
          );
      }

      company.isValidated = verify === 'true';
      em.persist(company);
      await em.flush();

      const isApproved = verify === 'true';
      return res
        .status(200)
        .send(
          renderPage(
            isApproved ? '¡Compañía verificada!' : 'Compañía rechazada',
            isApproved
              ? 'La compañía ha sido verificada correctamente.'
              : 'La compañía ha sido rechazada y no podrá acceder a la plataforma.',
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

  return router;
}
