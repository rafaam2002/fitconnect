import { EntityManager } from '@mikro-orm/core';

import { User } from '../entities/User';
import { PushNotificationData } from '../types/common.type';
import { sendPushNotification } from '../utils/notification.util';

import { BaseService } from './base.service';

/**
 * Notification Service - Handles push notifications
 */
export class NotificationService extends BaseService {
  constructor(em: EntityManager) {
    super(em);
  }

  /**
   * Send notification to a specific user
   */
  public async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: PushNotificationData
  ): Promise<void> {
    const user = await this.em.findOne(
      User,
      { id: userId },
      { populate: ['pushTokens'] }
    );

    if (!user || !user.pushTokens || user.pushTokens.length === 0) {
      return;
    }

    const tokens = user.pushTokens.getItems();
    await this.sendToTokens(
      tokens.map(t => t.token),
      title,
      body,
      data
    );
  }

  /**
   * Send notification to multiple users
   */
  public async sendToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: PushNotificationData
  ): Promise<void> {
    const users = await this.em.find(
      User,
      { id: { $in: userIds } },
      { populate: ['pushTokens'] }
    );

    await this.sendToUserEntities(users, title, body, data);
  }

  /**
   * Send notification to all active users
   */
  public async sendToAllActiveUsers(
    title: string,
    body: string,
    data?: PushNotificationData,
    excludeUserId?: string
  ): Promise<void> {
    const filter: any = {
      isBlocked: false,
      isActive: true,
    };

    if (excludeUserId) {
      filter.id = { $ne: excludeUserId };
    }

    const users = await this.em.find(User, filter, {
      populate: ['pushTokens'],
    });

    await this.sendToUserEntities(users, title, body, data);
  }

  /**
   * Helper: Send notification to user entities
   */
  private async sendToUserEntities(
    users: User[],
    title: string,
    body: string,
    data?: PushNotificationData
  ): Promise<void> {
    for (const user of users) {
      if (user.pushTokens && user.pushTokens.length > 0) {
        const tokens = user.pushTokens.getItems().map(t => t.token);
        await this.sendToTokens(tokens, title, body, data);
      }
    }
  }

  /**
   * Helper: Send to specific tokens
   */
  private async sendToTokens(
    tokens: string[],
    title: string,
    body: string,
    data?: PushNotificationData
  ): Promise<void> {
    for (const token of tokens) {
      try {
        await sendPushNotification(token, title, body, data);
      } catch (error) {
        console.error(`Failed to send notification to token ${token}:`, error);
      }
    }
  }
}
