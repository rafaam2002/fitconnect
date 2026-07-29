import { IResolvers } from '@graphql-tools/utils';
import { withFilter } from 'graphql-subscriptions';

import {
  FIXED_MESSAGE_EVENT,
  MESSAGE_EVENT,
  myPubsub,
} from '../../constants/subscriptions';
import { MessageService } from '../../services/message.service';
import { NotificationService } from '../../services/notification.service';
import { TrainingTaskService } from '../../services/training.task.service';
import { UserService } from '../../services/user.service';
import { UserWeightService } from '../../services/user.weight.service';
import { UserRoleEnum } from '../../types/enums';
import {
  AddUserWeight,
  ContextProps,
  CreateTrainingTaskProps,
  FixMessageProps,
  GetConversationProps,
  GetTrainingTaskProps,
  GetUserWeightsProps,
  IdProps,
  MessageProps,
  RemoveTrainingTaskProps,
  RemoveUserWeight,
  UnfixMessageProps,
  UpdateUserProps,
  UserListProps,
  UserPictureProps,
  UserProps,
} from '../../types/resolvers';
import { handleError } from '../../utils/errors.util';
import {
  chatsPermissions,
  statsPermissions,
  usersPermissions,
  userWeightsPermissions,
  workoutsPermissions,
} from '../../utils/permissions';
import { withPermissions } from '../middlewares/permissions';

// ===== QUERY RESOLVERS =====
const getUsers = async (_: any, args: UserListProps, context: ContextProps) => {
  try {
    const { em, currentUser } = context;
    const { query, roleFilter, page, stateFilter, filterMe, planFilter } = args;

    const userService = new UserService(em);
    return await userService.getUsers(
      currentUser,
      query,
      roleFilter ?? undefined,
      stateFilter ?? undefined,
      page,
      filterMe,
      planFilter ?? undefined
    );
  } catch (error: any) {
    return handleError(error);
  }
};

const me = async (_: any, args: any, context: ContextProps) => {
  try {
    const { em, currentUser } = context;
    const userService = new UserService(em);
    return await userService.getMe(currentUser);
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Find user by ID
 */
const findUser = async (_: any, args: IdProps, context: ContextProps) => {
  try {
    const { em, currentUser } = context;
    const { id } = args;
    const userService = new UserService(em);

    return await userService.findUser(id, currentUser);
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Get conversation between users or forum messages
 */
const getConversation = async (
  _: any,
  args: GetConversationProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { otherUserId, page = 0, limit = 50, isForumMessage = false } = args;

    const messageService = new MessageService(em);

    return await messageService.getConversation(
      otherUserId,
      page,
      limit,
      isForumMessage,
      currentUser
    );
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Get admin statistics
 */
const getAdminStats = async (_: any, args: any, context: ContextProps) => {
  try {
    const { em, currentUser } = context;
    const userService = new UserService(em);
    return await userService.getAdminStats(em, currentUser);
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Get training tasks for a user
 */
const getTrainingTasks = async (
  _: any,
  args: GetTrainingTaskProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { userId, dateRange, onlyGlobal } = args;

    const trainingTaskService = new TrainingTaskService(em);
    return await trainingTaskService.getTrainingTasks(
      userId!,
      dateRange,
      onlyGlobal,
      currentUser
    );
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Get user weights
 */
const getUserWeights = async (
  _: any,
  args: GetUserWeightsProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { userId, dateRange } = args;

    const userWeightService = new UserWeightService(em);
    return await userWeightService.getUserWeights(
      userId,
      dateRange,
      currentUser
    );
  } catch (error) {
    return handleError(error);
  }
};

// ===== MUTATION RESOLVERS =====

/**
 * Set active company for user
 */
export const setActiveCompany = async (
  _: any,
  { companyId }: { companyId: string },
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const userService = new UserService(em);
    return await userService.setActiveCompany(companyId, currentUser);
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Create a new user
 */
const createUser = async (_: any, args: UserProps, context: ContextProps) => {
  try {
    const { user, company } = args;
    const { em } = context;
    const userService = new UserService(em);

    return await userService.createUser(user, company);
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Create a member directly under the admin's active company
 */
const createCompanyMember = async (
  _: any,
  args: {
    user: {
      email: string;
      nickname: string;
      password: string;
      role: UserRoleEnum;
      isActive?: boolean;
    };
  },
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const userService = new UserService(em);

    return await userService.createCompanyMember(args.user, currentUser);
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Update user information
 */
const updateUser = async (
  _: any,
  args: { user: UpdateUserProps },
  context: ContextProps
) => {
  try {
    const { user } = args;
    const { em, currentUser } = context;
    const userService = new UserService(em);

    return await userService.updateUser(user, currentUser);
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Update user profile picture
 */
const updateUserPicture = async (
  _: any,
  args: UserPictureProps,
  context: ContextProps
) => {
  try {
    const { userId, picture } = args;
    const { em, currentUser } = context;
    const userService = new UserService(em);

    return await userService.updateUserPicture(userId, picture, currentUser);
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Permanently delete user account
 */
const deleteUser = async (_: any, args: IdProps, context: ContextProps) => {
  try {
    const { id } = args;
    const { em, currentUser } = context;
    const userService = new UserService(em);
    return await userService.deleteUser(id, currentUser);
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Send email verification
 */
const sendEmailVerification = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const userService = new UserService(em);

    return await userService.sendEmailVerification(currentUser);
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Send a test notification to a specific user
 */
const sendTestNotification = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const notificationService = new NotificationService(em);

    await notificationService.sendToUser(
      '0a7fcee9-64d1-4875-9a49-11c3778457df',
      'Push Test',
      'This is a test notification'
    );

    return {
      code: '200',
      message: 'Notification sent',
      success: true,
    };
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Create a new message
 */
const createMessage = async (
  _: any,
  args: MessageProps,
  context: ContextProps
) => {
  try {
    const { message } = args;
    const { em, currentUser } = context;
    const { text, receiverId, isFixed, isForumMessage = false } = message;

    const messageService = new MessageService(em);

    return await messageService.createMessage(
      text,
      receiverId,
      isFixed,
      isForumMessage,
      currentUser
    );
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Fix a message (pin to top)
 */
const fixMessage = async (
  _: any,
  args: FixMessageProps,
  context: ContextProps
) => {
  try {
    const { messageId, fixedEndDate } = args;
    const { em, currentUser } = context;

    const messageService = new MessageService(em);
    return await messageService.fixMessage(
      messageId,
      fixedEndDate,
      currentUser
    );
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Unfix a message (unpin)
 */
const unfixMessage = async (
  _: any,
  args: UnfixMessageProps,
  context: ContextProps
) => {
  try {
    const { messageId } = args;
    const { em, currentUser } = context;

    const messageService = new MessageService(em);
    return await messageService.unfixMessage(messageId, currentUser);
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Create a new training task
 */
const createTrainingTask = async (
  _: any,
  args: CreateTrainingTaskProps,
  context: ContextProps
) => {
  try {
    const { content, userId, date, repeat = false } = args.trainingTask;
    const { em, currentUser } = context;

    const trainingTaskService = new TrainingTaskService(em);
    return await trainingTaskService.createTrainingTask(
      content,
      date,
      userId,
      repeat,
      currentUser
    );
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Remove a training task
 */
const removeTrainingTasks = async (
  _: any,
  args: RemoveTrainingTaskProps,
  context: ContextProps
) => {
  try {
    const { ids } = args;
    const { em, currentUser } = context;

    const trainingTaskService = new TrainingTaskService(em);
    return await trainingTaskService.removeTrainingTasks(ids, currentUser);
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Add a new weight entry
 */
const addUserWeight = async (
  _: any,
  args: AddUserWeight,
  context: ContextProps
) => {
  try {
    const { weight, date, userId } = args.userWeight;
    const { em, currentUser } = context;

    const userWeightService = new UserWeightService(em);

    return await userWeightService.addUserWeight(
      weight,
      date,
      userId,
      currentUser
    );
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Remove a weight entry
 */
const removeUserWeights = async (
  _: any,
  args: RemoveUserWeight,
  context: ContextProps
) => {
  try {
    const { ids } = args;
    const { em, currentUser } = context;

    const userWeightService = new UserWeightService(em);
    return await userWeightService.removeUserWeights(ids, currentUser);
  } catch (error) {
    return handleError(error);
  }
};

// ===== SUBSCRIPTION RESOLVERS =====
const newMessage = {
  subscribe: withFilter(
    () => myPubsub.asyncIterableIterator(MESSAGE_EVENT),
    (payload, variables, context) => {
      const { currentUser } = context;
      return (
        payload.newMessage.receiver?.id === currentUser.id ||
        payload.newMessage.sender.id === currentUser.id ||
        payload.newMessage.receiver?.isForumMessage
      );
    }
  ),
};

const fixedMessages = {
  subscribe: withFilter(
    () => myPubsub.asyncIterableIterator(FIXED_MESSAGE_EVENT),
    (payload, variables, context) => {
      const { currentUser } = context;
      return (
        payload.newMessage.receiver.id === currentUser.id ||
        payload.newMessage.sender.id === currentUser.id ||
        payload.newMessage.receiver.isForumMessage
      );
    }
  ),
};

export const userResolvers: IResolvers = {
  Query: {
    me,
    findUser: withPermissions(usersPermissions.READ, findUser),
    // getAdminSchedules,
    getConversation,
    sendEmailVerification,
    getAdminStats: withPermissions(statsPermissions.READ, getAdminStats),
    getTrainingTasks: withPermissions(
      workoutsPermissions.READ,
      getTrainingTasks
    ),
    getUserWeights: withPermissions(
      userWeightsPermissions.READ,
      getUserWeights
    ),
    getUsers: withPermissions(usersPermissions.READ, getUsers),
  },
  Mutation: {
    setActiveCompany,
    createUser, //este metodo es publico, no requiere permisos
    createCompanyMember: withPermissions(
      usersPermissions.CREATE,
      createCompanyMember
    ),
    updateUser,
    updateUserPicture,
    deleteUser,
    sendTestNotification,
    // removeUser,
    createMessage,
    fixMessage: withPermissions(chatsPermissions.UPDATE, fixMessage),
    unfixMessage: withPermissions(chatsPermissions.UPDATE, unfixMessage),
    createTrainingTask: withPermissions(
      workoutsPermissions.CREATE,
      createTrainingTask
    ),
    removeTrainingTasks: withPermissions(
      workoutsPermissions.DELETE,
      removeTrainingTasks
    ),
    addUserWeight: withPermissions(
      userWeightsPermissions.CREATE,
      addUserWeight
    ),
    removeUserWeights: withPermissions(
      userWeightsPermissions.DELETE,
      removeUserWeights
    ),
  },
  Subscription: {
    fixedMessages,
    newMessage,
  },
};
