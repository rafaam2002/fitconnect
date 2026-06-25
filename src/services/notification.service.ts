import { EntityManager } from '@mikro-orm/core';

import { Notification } from '../entities/Notification';
import { User } from '../entities/User';
import { PushNotificationData } from '../types/common.type';
import { NotificationType } from '../types/enums';
import { sendPushNotification } from '../utils/notification.util';

import { BaseService } from './base.service';

/**
 * Notification Service - Handles in-app and push notifications
 */
export class NotificationService extends BaseService {
  constructor(em: EntityManager) {
    super(em);
  }

  /**
   * Send notification to a specific user and save to database
   */
  public async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: PushNotificationData,
    companyId?: string | null
  ): Promise<void> {
    const user = await this.em.findOne(
      User,
      { id: userId },
      { populate: ['pushTokens'] }
    );

    if (!user) {
      return;
    }

    let notificationType = NotificationType.INFO;
    if (data?.type) {
      const typeStr = String(data.type).toLowerCase();
      if (
        Object.values(NotificationType).includes(typeStr as NotificationType)
      ) {
        notificationType = typeStr as NotificationType;
      }
    }

    // Persist to database
    const notification = this.em.create(Notification, {
      user: user.id,
      type: notificationType,
      title,
      message: body,
      link: data?.link || null,
      company: companyId || null,
      read: false,
    });
    this.em.persist(notification);
    await this.em.flush();

    // Send push notification if user has tokens
    if (user.pushTokens && user.pushTokens.length > 0) {
      const tokens = user.pushTokens.getItems();
      await this.sendToTokens(
        tokens.map(t => t.token),
        title,
        body,
        data
      );
    }
  }

  /**
   * Send notification to multiple users and save to database
   */
  public async sendToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: PushNotificationData,
    companyId?: string | null
  ): Promise<void> {
    const users = await this.em.find(
      User,
      { id: { $in: userIds } },
      { populate: ['pushTokens'] }
    );

    let notificationType = NotificationType.INFO;
    if (data?.type) {
      const typeStr = String(data.type).toLowerCase();
      if (
        Object.values(NotificationType).includes(typeStr as NotificationType)
      ) {
        notificationType = typeStr as NotificationType;
      }
    }

    // Persist to database
    for (const user of users) {
      const notification = this.em.create(Notification, {
        user: user.id,
        type: notificationType,
        title,
        message: body,
        link: data?.link || null,
        company: companyId || null,
        read: false,
      });
      this.em.persist(notification);
    }
    await this.em.flush();

    // Send push notifications
    await this.sendToUserEntities(users, title, body, data);
  }

  /**
   * Send notification to all active users and save to database
   */
  public async sendToAllActiveUsers(
    title: string,
    body: string,
    data?: PushNotificationData,
    excludeUserId?: string,
    companyId?: string | null
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

    let notificationType = NotificationType.INFO;
    if (data?.type) {
      const typeStr = String(data.type).toLowerCase();
      if (
        Object.values(NotificationType).includes(typeStr as NotificationType)
      ) {
        notificationType = typeStr as NotificationType;
      }
    }

    // Persist to database
    for (const user of users) {
      const notification = this.em.create(Notification, {
        user: user.id,
        type: notificationType,
        title,
        message: body,
        link: data?.link || null,
        company: companyId || null,
        read: false,
      });
      this.em.persist(notification);
    }
    await this.em.flush();

    // Send push notifications
    await this.sendToUserEntities(users, title, body, data);
  }

  /**
   * Get paginated notifications for a user
   */
  public async getUserNotifications(
    userId: string,
    limit: number = 20,
    page: number = 1
  ): Promise<{ notifications: Notification[]; hasMore: boolean }> {
    const offset = (page - 1) * limit;

    const notifications = await this.em.find(
      Notification,
      { user: userId },
      {
        limit: limit + 1,
        offset,
        orderBy: { created_at: 'DESC' },
        populate: ['company', 'user'],
      }
    );

    const hasMore = notifications.length > limit;
    if (hasMore) {
      notifications.pop();
    }

    return {
      notifications,
      hasMore,
    };
  }

  /**
   * Mark a notification as read
   */
  public async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<Notification> {
    const notification = await this.em.findOne(
      Notification,
      { id: notificationId, user: userId },
      { populate: ['company', 'user'] }
    );

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.read = true;
    await this.em.flush();

    return notification;
  }

  /**
   * Mark all notifications of a user as read
   */
  public async markAllAsRead(userId: string): Promise<void> {
    const notifications = await this.em.find(Notification, {
      user: userId,
      read: false,
    });

    for (const notification of notifications) {
      notification.read = true;
    }

    await this.em.flush();
  }

  /**
   * Clean old notifications (older than X days)
   */
  public async cleanOldNotifications(days: number = 30): Promise<void> {
    const cutOffDate = new Date();
    cutOffDate.setDate(cutOffDate.getDate() - days);

    await this.em.nativeDelete(Notification, {
      created_at: { $lt: cutOffDate },
    });
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
