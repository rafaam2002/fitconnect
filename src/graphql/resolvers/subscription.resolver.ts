import { SubscriptionService } from '../../services/subscription.service';
import { ContextProps } from '../../types/resolvers';
import { handleError } from '../../utils/errors.util';
import {
  plansPermissions,
  subcriptionsPermissions,
  usersPermissions,
} from '../../utils/permissions';
import { withPermissions } from '../middlewares/permissions';

// ═══════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════

export const getSubscription = async (
  _: any,
  args: { subscriptionId: string },
  context: ContextProps
) => {
  try {
    const service = new SubscriptionService(
      context.em,
      context.paymentProcessor
    );
    return await service.getSubscription(args.subscriptionId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const listUserSubscriptions = async (
  _: any,
  args: { userId: string },
  context: ContextProps
) => {
  try {
    const service = new SubscriptionService(
      context.em,
      context.paymentProcessor
    );
    return await service.listUserSubscriptions(args.userId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getActiveSubscription = async (
  _: any,
  args: { userId: string },
  context: ContextProps
) => {
  try {
    const service = new SubscriptionService(
      context.em,
      context.paymentProcessor
    );
    return await service.getActiveSubscription(args.userId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getSubscriptionsStats = async (
  _: any,
  __: any,
  context: ContextProps
) => {
  try {
    const service = new SubscriptionService(
      context.em,
      context.paymentProcessor
    );
    return await service.getSubscriptionsStats(context.currentUser);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getSubscriptionHistory = async (
  _: any,
  args: { subscriptionId: string },
  context: ContextProps
) => {
  try {
    const service = new SubscriptionService(
      context.em,
      context.paymentProcessor
    );
    return await service.getSubscriptionHistory(args.subscriptionId);
  } catch (error: any) {
    return handleError(error);
  }
};

// ═══════════════════════════════════════════
// MUTATIONS — USUARIO
// ═══════════════════════════════════════════

export const createSubscription = async (
  _: any,
  args: { subscription: any },
  context: ContextProps
) => {
  try {
    const service = new SubscriptionService(
      context.em,
      context.paymentProcessor
    );
    return await service.createSubscription({
      ...args.subscription,
      companyId: context.currentUser.activeCompanyId,
    });
  } catch (error: any) {
    return handleError(error);
  }
};

export const changePlan = async (
  _: any,
  args: { input: any },
  context: ContextProps
) => {
  try {
    const service = new SubscriptionService(
      context.em,
      context.paymentProcessor
    );
    return await service.changePlan(args.input);
  } catch (error: any) {
    return handleError(error);
  }
};

export const updateSubscription = async (
  _: any,
  args: { subscription: any },
  context: ContextProps
) => {
  try {
    const service = new SubscriptionService(
      context.em,
      context.paymentProcessor
    );
    return await service.updateSubscription(args.subscription);
  } catch (error: any) {
    return handleError(error);
  }
};

export const cancelSubscription = async (
  _: any,
  args: { input: any },
  context: ContextProps
) => {
  try {
    const service = new SubscriptionService(
      context.em,
      context.paymentProcessor
    );
    return await service.cancelSubscription(args.input);
  } catch (error: any) {
    return handleError(error);
  }
};

export const pauseSubscription = async (
  _: any,
  args: { subscriptionId: string },
  context: ContextProps
) => {
  try {
    const service = new SubscriptionService(
      context.em,
      context.paymentProcessor
    );
    return await service.pauseSubscription(args.subscriptionId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const resumeSubscription = async (
  _: any,
  args: { subscriptionId: string },
  context: ContextProps
) => {
  try {
    const service = new SubscriptionService(
      context.em,
      context.paymentProcessor
    );
    return await service.resumeSubscription(args.subscriptionId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const reactivateSubscription = async (
  _: any,
  args: { subscriptionId: string },
  context: ContextProps
) => {
  try {
    const service = new SubscriptionService(
      context.em,
      context.paymentProcessor
    );
    return await service.reactivateSubscription(args.subscriptionId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const updatePaymentMethodAndRetry = async (
  _: any,
  args: { subscriptionId: string; paymentMethodId: string },
  context: ContextProps
) => {
  try {
    const service = new SubscriptionService(
      context.em,
      context.paymentProcessor
    );
    return await service.updatePaymentMethodAndRetry(
      args.subscriptionId,
      args.paymentMethodId
    );
  } catch (error: any) {
    return handleError(error);
  }
};

// ═══════════════════════════════════════════
// MUTATIONS — ADMIN
// ═══════════════════════════════════════════

export const adminOverrideSubscription = async (
  _: any,
  args: { input: any },
  context: ContextProps
) => {
  try {
    const service = new SubscriptionService(
      context.em,
      context.paymentProcessor
    );
    return await service.adminOverride({
      ...args.input,
      adminId: context.currentUser.id,
    });
  } catch (error: any) {
    return handleError(error);
  }
};

export const forceRenewal = async (
  _: any,
  args: { subscriptionId: string },
  context: ContextProps
) => {
  try {
    const service = new SubscriptionService(
      context.em,
      context.paymentProcessor
    );
    return await service.forceRenewal(
      args.subscriptionId,
      context.currentUser.id
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const extendSubscriptionPeriod = async (
  _: any,
  args: { subscriptionId: string; days: number; reason: string },
  context: ContextProps
) => {
  try {
    const service = new SubscriptionService(
      context.em,
      context.paymentProcessor
    );
    return await service.extendPeriod(
      args.subscriptionId,
      args.days,
      context.currentUser.id,
      args.reason
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const applySubscriptionCredit = async (
  _: any,
  args: { subscriptionId: string; amountInCents: number; reason: string },
  context: ContextProps
) => {
  try {
    const service = new SubscriptionService(
      context.em,
      context.paymentProcessor
    );
    return await service.applyCredit(
      args.subscriptionId,
      args.amountInCents,
      context.currentUser.id,
      args.reason
    );
  } catch (error: any) {
    return handleError(error);
  }
};

// ═══════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════

export const subscriptionResolvers = {
  Query: {
    getSubscription: withPermissions(
      subcriptionsPermissions.READ,
      getSubscription
    ),
    listUserSubscriptions: withPermissions(
      usersPermissions.READ,
      listUserSubscriptions
    ),
    getActiveSubscription,
    getSubscriptionsStats: withPermissions(
      plansPermissions.CREATE_UPDATE_DELETE,
      getSubscriptionsStats
    ),
    getSubscriptionHistory: withPermissions(
      subcriptionsPermissions.READ,
      getSubscriptionHistory
    ),
  },
  Mutation: {
    // Usuario
    createSubscription,
    changePlan,
    updateSubscription,
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
    reactivateSubscription,
    updatePaymentMethodAndRetry,
    // Admin
    adminOverrideSubscription: withPermissions(
      plansPermissions.CREATE_UPDATE_DELETE,
      adminOverrideSubscription
    ),
    forceRenewal: withPermissions(
      plansPermissions.CREATE_UPDATE_DELETE,
      forceRenewal
    ),
    extendSubscriptionPeriod: withPermissions(
      plansPermissions.CREATE_UPDATE_DELETE,
      extendSubscriptionPeriod
    ),
    applySubscriptionCredit: withPermissions(
      plansPermissions.CREATE_UPDATE_DELETE,
      applySubscriptionCredit
    ),
  },
};
