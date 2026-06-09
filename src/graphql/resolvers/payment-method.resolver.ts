import { PaymentMethodService } from '../../services/payment.method.service';
import { ContextProps } from '../../types/resolvers';
import { handleError } from '../../utils/errors.util';

// ===== QUERY RESOLVERS =====

export const getPaymentMethod = async (
  parent: any,
  args: { stripePaymentMethodId: string },
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { stripePaymentMethodId } = args;

    const paymentMethodService = new PaymentMethodService(em);
    return await paymentMethodService.getPaymentMethod(stripePaymentMethodId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const listPaymentMethods = async (
  parent: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { customerId } = args;

    const paymentMethodService = new PaymentMethodService(em);
    return await paymentMethodService.listPaymentMethods(customerId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const listUserPaymentMethods = async (
  parent: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { userId } = args;

    const paymentMethodService = new PaymentMethodService(em);
    return await paymentMethodService.listUserPaymentMethods(userId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getDefaultPaymentMethod = async (
  parent: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { customerId } = args;

    const paymentMethodService = new PaymentMethodService(em);
    return await paymentMethodService.getDefaultPaymentMethod(customerId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getUserDefaultPaymentMethod = async (
  parent: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { userId } = args;

    const paymentMethodService = new PaymentMethodService(em);
    return await paymentMethodService.getUserDefaultPaymentMethod(userId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getExpiredPaymentMethods = async (
  parent: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { customerId } = args;

    const paymentMethodService = new PaymentMethodService(em);
    return await paymentMethodService.getExpiredPaymentMethods(customerId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getPaymentMethodsStats = async (
  parent: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { customerId } = args;

    const paymentMethodService = new PaymentMethodService(em);
    return await paymentMethodService.getPaymentMethodsStats(customerId);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== MUTATION RESOLVERS =====
export const createSetupIntent = async (
  parent: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { customerId, usage, metadata } = args;

    const paymentMethodService = new PaymentMethodService(em);
    return await paymentMethodService.createSetupIntent({
      customerId,
      usage: usage || 'on_session',
      metadata: metadata || {},
    });
  } catch (error: any) {
    return handleError(error);
  }
};

export const confirmSetupIntent = async (
  parent: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { setupIntentId, setAsDefault } = args;

    const paymentMethodService = new PaymentMethodService(em);
    return await paymentMethodService.confirmSetupIntent({
      setupIntentId,
      setAsDefault,
    });
  } catch (error: any) {
    return handleError(error);
  }
};

export const attachPaymentMethod = async (
  parent: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { input } = args;

    const paymentMethodService = new PaymentMethodService(em);
    return await paymentMethodService.attachPaymentMethod(input);
  } catch (error: any) {
    return handleError(error);
  }
};

export const removePaymentMethod = async (
  parent: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { paymentId } = args;

    const paymentMethodService = new PaymentMethodService(em);
    return await paymentMethodService.removePaymentMethod(paymentId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const setDefaultPaymentMethod = async (
  parent: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { paymentMethodId } = args;

    const paymentMethodService = new PaymentMethodService(em);
    return await paymentMethodService.setDefaultPaymentMethod(paymentMethodId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const updatePaymentMethodMetadata = async (
  parent: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { paymentMethodId, metadata } = args;

    const paymentMethodService = new PaymentMethodService(em);
    return await paymentMethodService.updatePaymentMethodMetadata(
      paymentMethodId,
      metadata
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const markPaymentMethodAsExpired = async (
  parent: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { paymentMethodId } = args;

    const paymentMethodService = new PaymentMethodService(em);
    return await paymentMethodService.markPaymentMethodAsExpired(
      paymentMethodId
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const cleanupExpiredPaymentMethods = async (
  parent: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { customerId } = args;

    const paymentMethodService = new PaymentMethodService(em);
    return await paymentMethodService.cleanupExpiredPaymentMethods(customerId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const syncPaymentMethodFromStripe = async (
  parent: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { paymentMethodId } = args;

    const paymentMethodService = new PaymentMethodService(em);
    return await paymentMethodService.syncPaymentMethodFromStripe(
      paymentMethodId
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const validatePaymentMethod = async (
  parent: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { paymentMethodId } = args;

    const paymentMethodService = new PaymentMethodService(em);
    return await paymentMethodService.validatePaymentMethod(paymentMethodId);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== EXPORT RESOLVERS OBJECT FINAL =====
export const paymentMethodResolvers = {
  Query: {
    getPaymentMethod,
    listPaymentMethods,
    listUserPaymentMethods,
    getDefaultPaymentMethod,
    getUserDefaultPaymentMethod,
    getExpiredPaymentMethods,
    getPaymentMethodsStats,
  },
  Mutation: {
    createSetupIntent,
    confirmSetupIntent,
    attachPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
    updatePaymentMethodMetadata,
    markPaymentMethodAsExpired,
    validatePaymentMethod,
    cleanupExpiredPaymentMethods,
  },
};
