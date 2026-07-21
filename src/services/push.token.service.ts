import { EntityManager } from '@mikro-orm/core';

import { PushToken } from '../entities/PushToken';
import { User } from '../entities/User';
import { CurrentUser, ServiceResponse } from '../types/common.type';
import { NotificationType } from '../types/enums';
import {
  createServiceResponse,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors.util';
import { sendPushNotification } from '../utils/notification.util';

import { BaseService } from './base.service';
import { NotificationService } from './notification.service';

export class PushTokenService extends BaseService {
  constructor(em: EntityManager) {
    super(em);
  }

  /**
   * Registrar push token para notificaciones
   */
  public async registerToken(
    currentUser: CurrentUser,
    token: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    try {
      // Verificar si ya existe el token
      const existing = await this.em.findOne(
        PushToken,
        { token },
        {
          filters: {
            companyContext: false,
          },
        }
      );

      if (existing) {
        if (existing.user.id !== currentUser.id) {
          existing.user = this.em.getReference(User, currentUser.id);
        }
        await this.em.flush();
      } else {
        const newToken = this.em.create(PushToken, {
          token,
          user: currentUser.id,
        });
        this.em.persist(newToken);
        await this.em.flush();
      }

      return createServiceResponse(201, 'The token has been registered', true);
    } catch (e: any) {
      throw new InternalServerError(`Error registering token ${e.message}`);
    }
  }

  /**
   * Enviar notificación push a usuarios y guardarla en la base de datos
   */
  public async sendNotification(
    currentUser: CurrentUser,
    title: string,
    body: string,
    forAll: boolean = false,
    userIds?: string[],
    type?: NotificationType
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    const notificationService = new NotificationService(this.em);
    const data = { type: type || NotificationType.INFO };

    if (userIds && userIds.length > 0) {
      // Envío dirigido a una selección de usuarios (broadcast admin) — el
      // método ya existía en el servicio pero no estaba expuesto por GraphQL.
      await notificationService.sendToUsers(userIds, title, body, data);
    } else if (forAll) {
      await notificationService.sendToAllActiveUsers(title, body, data);
    } else {
      await notificationService.sendToUser(currentUser.id, title, body, data);
    }

    return createServiceResponse(201, 'The message has been sent', true);
  }

  /**
   * Remover push token
   */
  public async removePushToken(
    currentUser: CurrentUser,
    token: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }
    const pushTokenRepo = this.em.getRepository(PushToken);
    const pushToken = await pushTokenRepo.findOne({
      token,
      user: currentUser.id,
    });

    if (!pushToken) {
      throw new NotFoundError('Push token not found for the current user');
    }

    this.em.remove(pushToken);
    await this.em.flush();

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
