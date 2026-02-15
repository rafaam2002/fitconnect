import { EntityManager } from '@mikro-orm/core';

import { PushToken } from '../entities/PushToken';
import { User } from '../entities/User';
import { CurrentUser, ServiceResponse } from '../types/common.type';
import {
  createServiceResponse,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors.util';
import { sendPushNotification } from '../utils/notification.util';

import { BaseService } from './base.service';

export class PushTokenService extends BaseService {
  constructor(em: EntityManager) {
    super(em);
  }

  /**
   * Registrar push token para notificaciones
   */
  public async registerToken(
    currentUser: User,
    token: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    try {
      // Verificar si ya existe el token
      const existing = await this.em.findOne(PushToken, { token });

      if (!existing) {
        const newToken = this.em.create(PushToken, {
          token,
          user: currentUser,
        });
        this.em.persist(newToken);
        await this.em.flush();
      } else {
        await this.em.flush();
      }

      return createServiceResponse(201, 'The token has been registered', true);
    } catch (error: any) {
      throw new InternalServerError('Error registering token');
    }
  }

  /**
   * Enviar notificación push a usuarios
   */
  public async sendNotification(
    currentUser: CurrentUser,
    title: string,
    body: string,
    forAll: boolean = false
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    let tokens: PushToken[];

    if (forAll) {
      // Enviar a todos los usuarios
      tokens = await this.em.findAll(PushToken);
    } else {
      // Enviar solo al usuario actual
      tokens = await this.em.find(PushToken, { user: currentUser.id });
    }

    if (!tokens.length) {
      throw new NotFoundError('No tokens found');
    }

    // Enviar notificaciones
    const results = await this.sendNotifications(tokens, title, body);

    return createServiceResponse(201, 'The message has been sent', true, {
      sent: results.sent,
      failed: results.failed,
      total: tokens.length,
    });
  }

  /**
   * Remover push token
   */
  public async removePushToken(
    currentUser: User,
    token: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }
    const pushTokenRepo = this.em.getRepository(PushToken);
    const pushToken = await pushTokenRepo.findOne({
      token,
      user: currentUser,
    });

    if (!pushToken) {
      throw new NotFoundError('Push token not found for the current user');
    }

    await this.em.removeAndFlush(pushToken);

    return createServiceResponse(200, 'Push token removed successfully', true);
  }

  // ============= MÉTODOS PRIVADOS =============

  /**
   * Enviar notificaciones a múltiples tokens
   */
  private async sendNotifications(
    tokens: PushToken[],
    title: string,
    body: string
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const token of tokens) {
      try {
        await sendPushNotification(token.token, title, body);
        sent++;
      } catch (error) {
        console.error(
          `Failed to send notification to token ${token.token}:`,
          error
        );
        failed++;
      }
    }

    return { sent, failed };
  }
}
