import { IResolvers } from '@graphql-tools/utils';

import { NotificationService } from '../../services/notification.service';
import { ContextProps } from '../../types/resolvers';
import { handleError } from '../../utils/errors.util';

// ===== QUERY RESOLVERS =====

const getNotifications = async (_: any, args: any, context: ContextProps) => {
  try {
    const { em, currentUser } = context;
    if (!currentUser) {
      return {
        code: '401',
        success: false,
        message: 'Unauthorized',
      };
    }

    const { limit, page } = args;
    const notificationService = new NotificationService(em);
    const { notifications, hasMore } =
      await notificationService.getUserNotifications(
        currentUser.id,
        limit || undefined,
        page || undefined
      );

    return {
      code: '200',
      success: true,
      message: 'Notifications fetched successfully',
      notifications,
      hasMore,
    };
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== MUTATION RESOLVERS =====

const markNotificationAsRead = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    if (!currentUser) {
      return {
        code: '401',
        success: false,
        message: 'Unauthorized',
      };
    }

    const { id } = args;
    const notificationService = new NotificationService(em);
    const notification = await notificationService.markAsRead(
      id,
      currentUser.id
    );

    return {
      code: '200',
      success: true,
      message: 'Notification marked as read successfully',
      notification,
    };
  } catch (error: any) {
    return handleError(error);
  }
};

const markAllNotificationsAsRead = async (
  _: any,
  __: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    if (!currentUser) {
      return {
        code: '401',
        success: false,
        message: 'Unauthorized',
      };
    }

    const notificationService = new NotificationService(em);
    await notificationService.markAllAsRead(currentUser.id);

    return {
      code: '200',
      success: true,
      message: 'All notifications marked as read successfully',
    };
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== EXPORT RESOLVERS =====

export const notificationResolvers: IResolvers = {
  Query: {
    getNotifications,
  },
  Mutation: {
    markNotificationAsRead,
    markAllNotificationsAsRead,
  },
};
