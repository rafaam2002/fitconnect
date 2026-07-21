import { PushTokenService } from '../../services/push.token.service';
import { ContextProps } from '../../types/resolvers';
import { handleError } from '../../utils/errors.util';

// ===== QUERY RESOLVERS ========

// ===== MUTATION RESOLVERS =====

export const registerToken = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { token } = args;

    const pushTokenService = new PushTokenService(em);
    return await pushTokenService.registerToken(currentUser, token);
  } catch (error: any) {
    return handleError(error);
  }
};

export const sendNotification = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { notification } = args;
    const { body, title, forAll, userIds, type } = notification;

    const pushTokenService = new PushTokenService(em);
    return await pushTokenService.sendNotification(
      currentUser,
      title,
      body,
      forAll,
      userIds,
      type
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const removePushToken = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { token } = args;

    const pushTokenService = new PushTokenService(em);
    return await pushTokenService.removePushToken(currentUser, token);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== EXPORT RESOLVERS =====

export const pushTokenResolvers = {
  Query: {
    //refreshToken,
  },
  Mutation: {
    registerToken,
    sendNotification,
    removePushToken,
  },
};
