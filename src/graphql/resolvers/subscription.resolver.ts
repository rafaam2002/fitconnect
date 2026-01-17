import { SubscriptionService } from '../../services/subscription.service';
import { ContextProps } from '../../types/resolvers';
import { handleError } from '../../utils/errors.util';

// ===== QUERY RESOLVERS =====

export const getSubscription = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { subscriptionId } = args;

    const subscriptionService = new SubscriptionService(em);
    return await subscriptionService.getSubscription(subscriptionId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const listUserSubscriptions = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { userId } = args;

    const subscriptionService = new SubscriptionService(em);
    return await subscriptionService.listUserSubscriptions(userId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getActiveSubscription = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { userId } = args;

    const subscriptionService = new SubscriptionService(em);
    return await subscriptionService.getActiveSubscription(userId);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== MUTATION RESOLVERS =====

export const createSubscription = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { subscription } = args;

    const subscriptionService = new SubscriptionService(em);
    return await subscriptionService.createSubscription(subscription);
  } catch (error: any) {
    return handleError(error);
  }
};

export const updateSubscription = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { subscription } = args;

    const subscriptionService = new SubscriptionService(em);
    return await subscriptionService.updateSubscription(subscription);
  } catch (error: any) {
    return handleError(error);
  }
};

export const cancelSubscription = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { input } = args;

    const subscriptionService = new SubscriptionService(em);
    return await subscriptionService.cancelSubscription(input);
  } catch (error: any) {
    return handleError(error);
  }
};

export const pauseSubscription = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { subscriptionId } = args;

    const subscriptionService = new SubscriptionService(em);
    return await subscriptionService.pauseSubscription(subscriptionId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const resumeSubscription = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { subscriptionId } = args;

    const subscriptionService = new SubscriptionService(em);
    return await subscriptionService.resumeSubscription(subscriptionId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const changeSubscriptionPlan = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { subscriptionId, newPlanId } = args;

    const subscriptionService = new SubscriptionService(em);
    return await subscriptionService.updateSubscription({
      subscriptionId,
      planId: newPlanId,
    });
  } catch (error: any) {
    return handleError(error);
  }
};

export const syncSubscriptionFromStripe = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { stripeSubscriptionId } = args;

    const subscriptionService = new SubscriptionService(em);
    return await subscriptionService.syncSubscriptionFromStripe(
      stripeSubscriptionId
    );
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== EXPORT RESOLVERS OBJECT =====

export const subscriptionResolvers = {
  Query: {
    getSubscription,
    listUserSubscriptions,
    getActiveSubscription,
  },
  Mutation: {
    createSubscription,
    updateSubscription,
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
    changeSubscriptionPlan,
    //syncSubscriptionFromStripe,
  },
};
