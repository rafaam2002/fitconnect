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
        const subscription = await subscriptionService.updateSubscription(args.input);

        return {
            success: true,
            message: 'Subscription updated successfully',
            subscription,
            errors: []
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to update subscription',
            subscription: null,
            errors: [error.message]
        };
    }
}

export const cancelSubscription = async (parent: any, args: any, context: any) => {
    try {
        const subscriptionService = new SubscriptionService(context.em);
        const subscription = await subscriptionService.cancelSubscription(args.input);

        return {
            success: true,
            message: 'Subscription canceled successfully',
            subscription,
            errors: []
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to cancel subscription',
            subscription: null,
            errors: [error.message]
        };
    }
}

export const pauseSubscription = async (parent: any, args: any, context: any) => {
    try {
        const subscriptionService = new SubscriptionService(context.em);
        const subscription = await subscriptionService.pauseSubscription(args.subscriptionId);

        return {
            success: true,
            message: 'Subscription paused successfully',
            subscription,
            errors: []
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to pause subscription',
            subscription: null,
            errors: [error.message]
        };
    }
}

export const resumeSubscription = async (parent: any, args: any, context: any) => {
    try {
        const subscriptionService = new SubscriptionService(context.em);
        const subscription = await subscriptionService.resumeSubscription(args.subscriptionId);

        return {
            success: true,
            message: 'Subscription resumed successfully',
            subscription,
            errors: []
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to resume subscription',
            subscription: null,
            errors: [error.message]
        };
    }
}

export const changeSubscriptionPlan = async (parent: any, args: any, context: any) => {
    try {
        const subscriptionService = new SubscriptionService(context.em);
        const subscription = await subscriptionService.updateSubscription({
            subscriptionId: args.subscriptionId,
            planId: args.newPlanId
        });

        return {
            success: true,
            message: 'Subscription plan changed successfully',
            subscription,
            errors: []
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to change subscription plan',
            subscription: null,
            errors: [error.message]
        };
    }
}

// ===== EXPORT RESOLVERS OBJECT =====
export const subscriptionResolvers = {
    Query: {
        getSubscription,
        listUserSubscriptions,
        getActiveSubscription
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