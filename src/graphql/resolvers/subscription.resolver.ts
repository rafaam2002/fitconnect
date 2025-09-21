// ===== QUERY RESOLVERS =====

import {SubscriptionService} from "../../services/SubscriptionService";
import {CustomResponse} from "./errors";
import {GraphQLError} from "graphql";

export const getSubscription = async (parent: any, args: any, context: any) => {
    const subscriptionService = new SubscriptionService(context.em);
    return await subscriptionService.getSubscription(args.subscriptionId);
}

export const listUserSubscriptions = async (parent: any, args: any, context: any) => {
    const subscriptionService = new SubscriptionService(context.em);
    return await subscriptionService.listUserSubscriptions(args.userId);
}

export const getActiveSubscription = async (parent: any, args: any, context: any) => {
    const subscriptionService = new SubscriptionService(context.em);
    const subscriptions = await subscriptionService.listUserSubscriptions(args.userId);
    return subscriptions.find(sub => sub.isActive) || null;
}

// ===== MUTATION RESOLVERS =====
export const createSubscription = async (parent: any, args: any, context: any) => {
    try {
        const subscriptionService = new SubscriptionService(context.em);
        const subscription = await subscriptionService.createSubscription(args.subscription);

        return CustomResponse(200, 'Subscription created successfully.', true, {subscription});

    } catch (error: any) {
        throw new GraphQLError(error.message, {
            extensions: {
                code: "ERROR_CREATE_SUBSCRIPTION",
            },
        });
    }
}

export const updateSubscription = async (parent: any, args: any, context: any) => {
    try {
        const subscriptionService = new SubscriptionService(context.em);
        const subscription = await subscriptionService.updateSubscription(args.subscription);


        return CustomResponse(200, 'Subscription updated successfully.', true, {subscription});

    } catch (error: any) {
        throw new GraphQLError(error.message, {
            extensions: {
                code: "ERROR_UPDATE_SUBSCRIPTION",
            }
        })
    }
}

export const cancelSubscription = async (parent: any, args: any, context: any) => {
    try {
        const subscriptionService = new SubscriptionService(context.em);
        const subscription = await subscriptionService.cancelSubscription(args.input);

        return CustomResponse(200, 'Subscription cancelled successfully.', true, {subscription});
    } catch (error: any) {
        throw new GraphQLError(error.message, {
            extensions: {
                code: "ERROR_CANCEL_SUBSCRIPTION",
            }
        })
    }
}

export const pauseSubscription = async (parent: any, args: any, context: any) => {
    try {
        const subscriptionService = new SubscriptionService(context.em);
        const subscription = await subscriptionService.pauseSubscription(args.subscriptionId);

        return CustomResponse(200, 'Subscription paused successfully.', true, {subscription});
    } catch (error: any) {
       throw new GraphQLError(error.message, {
           extensions: {
               code: "ERROR_PAUSE_SUBSCRIPTION",
           }
       })
    }
}

export const resumeSubscription = async (parent: any, args: any, context: any) => {
    try {
        const subscriptionService = new SubscriptionService(context.em);
        const subscription = await subscriptionService.resumeSubscription(args.subscriptionId);

        return CustomResponse(200, 'Subscription resumed successfully.', true, {subscription});
    } catch (error: any) {
       throw new GraphQLError(error.message, {
           extensions: {
               code: "ERROR_RESUME_SUBSCRIPTION",
           }
       })
    }
}

export const changeSubscriptionPlan = async (parent: any, args: any, context: any) => {
    try {
        const subscriptionService = new SubscriptionService(context.em);
        const subscription = await subscriptionService.updateSubscription({
            subscriptionId: args.subscriptionId,
            planId: args.newPlanId
        });

        CustomResponse(200, 'Subscription changed successfully.', true, {subscription});
    } catch (error: any) {
        throw new GraphQLError(error.message, {
            extensions: {
                code: "ERROR_CHANGE_SUBSCRIPTION",
            }
        })
    }
}

// ===== EXPORT RESOLVERS OBJECT =====
export const subscriptionResolvers = {
    Query: {
        // getSubscription,
        // listUserSubscriptions,
        // getActiveSubscription
    },

    Mutation: {
        createSubscription,
        updateSubscription,
        cancelSubscription,
        pauseSubscription,
        resumeSubscription,
        changeSubscriptionPlan
    }
};