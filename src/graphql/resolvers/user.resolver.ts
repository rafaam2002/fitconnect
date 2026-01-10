import {IResolvers} from "@graphql-tools/utils";
import {withFilter} from "graphql-subscriptions";
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
    removeTrainingTaskProps,
    RemoveUserWeight,
    UnfixMessageProps,
    UserListProps,
    UserPictureProps,
    UserProps
} from "../../types/resolvers";
import {UserService} from "../../services/user.service";
import {handleError} from "../../utils/errors.util";
import {MessageService} from "../../services/message.service";
import {FIXED_MESSAGE_EVENT, MESSAGE_EVENT, myPubsub} from "../../constants/subscriptions";
import {TrainingTaskService} from "../../services/training.task.service";
import {UserWeightService} from "../../services/user.weight.service";

// ===== QUERY RESOLVERS =====
export const getUsers = async (
    _: any,
    args: UserListProps,
    context: ContextProps) => {
    try {
        const {em, currentUser} = context;
        const {query, roleFilter, page, stateFilter} = args;

        const userService = new UserService(em);
        return await userService.getUsers(
            currentUser,
            query,
            roleFilter ?? undefined,
            stateFilter ?? undefined,
            page,
        );
    } catch (error: any) {
        return handleError(error);
    }
}

export const me = async (
    _: any,
    args: any,
    context: ContextProps) => {
    try {
        const {em, currentUser} = context;
        const userService = new UserService(em);
        return await userService.getMe(currentUser!);
    } catch (error) {
        return handleError(error);
    }
};

/**
 * Find user by ID
 */
export const findUser = async (
    _: any,
    args: IdProps,
    context: ContextProps) => {
    try {
        const {em} = context;
        const {id} = args;
        const userService = new UserService(em);

        return await userService.findUser(id);
    } catch (error) {
        return handleError(error);
    }
}

/**
 * Get user promotions
 */
export const getPromotions = async (
    _: any,
    args: IdProps,
    context: ContextProps) => {
    try {
        const {em, currentUser} = context;
        const userService = new UserService(em);
        return await userService.getPromotions(currentUser!);
    } catch (error) {
        return handleError(error);
    }
};

/**
 * Get conversation between users or forum messages
 */
export const getConversation = async (
    _: any,
    args: GetConversationProps,
    context: ContextProps
) => {
    try {
        const {em, currentUser} = context;
        const {otherUserId, page = 0, limit = 50, isForumMessage = false} = args;

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
export const getAdminStats = async (
    _: any,
    args: any,
    context: ContextProps) => {
    try {
        const {em, currentUser} = context;
        const userService = new UserService(em);
        return await userService.getAdminStats(em, currentUser!);
    } catch (error) {
        return handleError(error);
    }
}

/**
 * Get training tasks for a user
 */
export const getTrainingTasks = async (
    _: any,
    args: GetTrainingTaskProps,
    context: ContextProps
) => {
    try {
        const {em, currentUser} = context;
        const {userId, dateRange} = args;

        const trainingTaskService = new TrainingTaskService(em);
        return await trainingTaskService.getTrainingTasks(
            userId!,
            dateRange,
            currentUser!
        );
    } catch (error) {
        return handleError(error);
    }
}

/**
 * Get user weights
 */
export const getUserWeights = async (
    _: any,
    args: GetUserWeightsProps,
    context: ContextProps
) => {
    try {
        const {em, currentUser} = context;
        const {userId, dateRange} = args;

        const userWeightService = new UserWeightService(em);
        return await userWeightService.getUserWeights(
            userId,
            dateRange,
            currentUser
        );
    } catch (error) {
        return handleError(error);
    }
}

// ===== MUTATION RESOLVERS =====

/**
 * Set active company for user
 */
export const setCompanyMe = async (
    _: any,
    {companyId}: { companyId: string },
    context: ContextProps
) => {
    try {
        const {em, currentUser} = context;
        const userService = new UserService(em);
        return await userService.setActiveCompany(companyId, currentUser!);
    } catch (error) {
        return handleError(error);
    }
}

/**
 * Create a new user
 */
export const createUser = async (
    _: any,
    args: UserProps,
    context: ContextProps) => {
    try {
        const {user, company} = args;
        const {em} = context;
        const userService = new UserService(em);

        return await userService.createUser(
            em,
            user,
            company,
        );
    } catch (error) {
        return handleError(error);
    }
}

/**
 * Update user information
 */
export const updateUser = async (
    _: any,
    args: UserProps, context: ContextProps) => {
    try {
        const {user: fields, userId} = args;
        const {em, currentUser} = context;
        const userService = new UserService(em);

        return await userService.updateUser(
            userId!,
            fields,
            currentUser!
        );
    } catch (error) {
        return handleError(error);
    }
}

/**
 * Update user profile picture
 */
export const updateUserPicture = async (
    _: any,
    args: UserPictureProps,
    context: ContextProps
) => {
    try {
        const {userId, picture} = args;
        const {em, currentUser} = context;
        const userService = new UserService(em);

        return await userService.updateUserPicture(userId, picture, currentUser!);
    } catch (error) {
        return handleError(error);
    }
}

/**
 * Send email verification
 */
export const sendEmailVerification = async (_: any, args: any, context: ContextProps) => {
    try {
        const {em, currentUser} = context;
        const userService = new UserService(em);

        return await userService.sendEmailVerification(currentUser!);
    } catch (error) {
        return handleError(error);
    }
}

/**
 * Create a new message
 */
export const createMessage = async (
    _: any,
    args: MessageProps,
    context: ContextProps) => {
    try {
        const {message} = args;
        const {em, currentUser} = context;
        const {
            text,
            receiverId,
            isFixed,
            isForumMessage = false,
        } = message;

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
}

/**
 * Fix a message (pin to top)
 */
export const fixMessage = async (_: any, args: FixMessageProps, context: ContextProps) => {
    try {
        const {messageId, fixedEndDate} = args;
        const {em, currentUser} = context;

        const messageService = new MessageService(em);
        return await messageService.fixMessage(messageId, fixedEndDate, currentUser!);
    } catch (error) {
        return handleError(error);
    }
}

/**
 * Unfix a message (unpin)
 */
export const unfixMessage = async (
    _: any,
    args: UnfixMessageProps,
    context: ContextProps
) => {
    try {
        const {messageId} = args;
        const {em, currentUser} = context;

        const messageService = new MessageService(em);
        return await messageService.unfixMessage(messageId, currentUser!);
    } catch (error) {
        return handleError(error);
    }
}

/**
 * Create a new training task
 */
export const createTrainingTask = async (
    _: any,
    args: CreateTrainingTaskProps,
    context: ContextProps
) => {
    try {
        const {content, userId, date, repeat = false} = args.trainingTask;
        const {em, currentUser} = context;

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
}

/**
 * Remove a training task
 */
export const removeTrainingTask = async (
    _: any,
    args: removeTrainingTaskProps,
    context: ContextProps
) => {
    try {
        const {trainingTaskId} = args;
        const {em, currentUser} = context;

        const trainingTaskService = new TrainingTaskService(em);
        return await trainingTaskService.removeTrainingTask(trainingTaskId, currentUser!);
    } catch (error) {
        return handleError(error);
    }
}

/**
 * Add a new weight entry
 */
export const addUserWeight = async (
    _: any,
    args: AddUserWeight,
    context: ContextProps) => {
    try {
        const {weight, date, userId} = args.userWeight;
        const {em, currentUser} = context;

        const userWeightService = new UserWeightService(em);

        return await userWeightService.addUserWeight(
            weight,
            date,
            userId,
            currentUser!
        );
    } catch (error) {
        return handleError(error);
    }
}

/**
 * Remove a weight entry
 */
export const removeUserWeight = async (
    _: any,
    args: RemoveUserWeight,
    context: ContextProps
) => {
    try {
        const {userWeightId} = args;
        const {em, currentUser} = context;

        const userWeightService = new UserWeightService(em);
        return await userWeightService.removeUserWeight(userWeightId, currentUser!);
    } catch (error) {
        return handleError(error);
    }
}

// ===== SUBSCRIPTION RESOLVERS =====
export const newMessage = {
    subscribe: withFilter(
        () => myPubsub.asyncIterableIterator(MESSAGE_EVENT),
        (payload, variables, context) => {
            const {currentUser} = context;
            return (
                payload.newMessage.receiver?.id === currentUser.id ||
                payload.newMessage.sender.id === currentUser.id ||
                payload.newMessage.receiver?.isForumMessage
            );
        }
    ),
};

export const fixedMessages = {
    subscribe: withFilter(
        () => myPubsub.asyncIterableIterator(FIXED_MESSAGE_EVENT),
        (payload, variables, context) => {
            const {currentUser} = context;
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
        findUser,
        // getAdminSchedules,
        getConversation,
        sendEmailVerification,
        getAdminStats,
        getTrainingTasks,
        getUserWeights,
        getUsers,
    },
    Mutation: {
        setCompanyMe,
        createUser,
        updateUser,
        updateUserPicture,
        // removeUser,
        createMessage,
        fixMessage,
        unfixMessage,
        createTrainingTask,
        removeTrainingTask,
        addUserWeight,
        removeUserWeight,
    },
    Subscription: {
        fixedMessages,
        newMessage,
    },
};
