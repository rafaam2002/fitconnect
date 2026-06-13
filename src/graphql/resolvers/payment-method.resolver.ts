import { PaymentMethodService } from '../../services/payment.method.service';
import { ContextProps } from '../../types/resolvers';
import { handleError } from '../../utils/errors.util';

// ===== QUERY RESOLVERS =====

export const getPaymentMethod = async (
  _: any,
  args: { paymentMethodId: string },
  context: ContextProps
) => {
  try {
    const paymentMethodService = new PaymentMethodService(context.em);
    return await paymentMethodService.getPaymentMethod(args.paymentMethodId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const listPaymentMethods = async (
  _: any,
  args: { customerId: string },
  context: ContextProps
) => {
  try {
    const paymentMethodService = new PaymentMethodService(context.em);
    return await paymentMethodService.listPaymentMethods(args.customerId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const listUserPaymentMethods = async (
  _: any,
  args: { userId: string },
  context: ContextProps
) => {
  try {
    const paymentMethodService = new PaymentMethodService(context.em);
    return await paymentMethodService.listUserPaymentMethods(args.userId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getDefaultPaymentMethod = async (
  _: any,
  args: { customerId: string },
  context: ContextProps
) => {
  try {
    const paymentMethodService = new PaymentMethodService(context.em);
    return await paymentMethodService.getDefaultPaymentMethod(args.customerId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getUserDefaultPaymentMethod = async (
  _: any,
  args: { userId: string },
  context: ContextProps
) => {
  try {
    const paymentMethodService = new PaymentMethodService(context.em);
    return await paymentMethodService.getUserDefaultPaymentMethod(args.userId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getExpiredPaymentMethods = async (
  _: any,
  args: { customerId: string },
  context: ContextProps
) => {
  try {
    const paymentMethodService = new PaymentMethodService(context.em);
    return await paymentMethodService.getExpiredPaymentMethods(args.customerId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getPaymentMethodsStats = async (
  _: any,
  args: { customerId: string },
  context: ContextProps
) => {
  try {
    const paymentMethodService = new PaymentMethodService(context.em);
    return await paymentMethodService.getPaymentMethodsStats(args.customerId);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== MUTATION RESOLVERS =====

export const addPaymentMethod = async (
  _: any,
  args: { input: any },
  context: ContextProps
) => {
  try {
    const paymentMethodService = new PaymentMethodService(context.em);
    return await paymentMethodService.addPaymentMethod(args.input);
  } catch (error: any) {
    return handleError(error);
  }
};

export const removePaymentMethod = async (
  _: any,
  args: { paymentMethodId: string },
  context: ContextProps
) => {
  try {
    const paymentMethodService = new PaymentMethodService(context.em);
    return await paymentMethodService.removePaymentMethod(args.paymentMethodId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const setDefaultPaymentMethod = async (
  _: any,
  args: { paymentMethodId: string },
  context: ContextProps
) => {
  try {
    const paymentMethodService = new PaymentMethodService(context.em);
    return await paymentMethodService.setDefaultPaymentMethod(
      args.paymentMethodId
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const updatePaymentMethodMetadata = async (
  _: any,
  args: { paymentMethodId: string; metadata: Record<string, any> },
  context: ContextProps
) => {
  try {
    const paymentMethodService = new PaymentMethodService(context.em);
    return await paymentMethodService.updatePaymentMethodMetadata(
      args.paymentMethodId,
      args.metadata
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const markPaymentMethodAsExpired = async (
  _: any,
  args: { paymentMethodId: string },
  context: ContextProps
) => {
  try {
    const paymentMethodService = new PaymentMethodService(context.em);
    return await paymentMethodService.markPaymentMethodAsExpired(
      args.paymentMethodId
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const cleanupExpiredPaymentMethods = async (
  _: any,
  args: { customerId: string },
  context: ContextProps
) => {
  try {
    const paymentMethodService = new PaymentMethodService(context.em);
    return await paymentMethodService.cleanupExpiredPaymentMethods(
      args.customerId
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const validatePaymentMethod = async (
  _: any,
  args: { paymentMethodId: string },
  context: ContextProps
) => {
  try {
    const paymentMethodService = new PaymentMethodService(context.em);
    return await paymentMethodService.validatePaymentMethod(
      args.paymentMethodId
    );
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== EXPORT RESOLVERS OBJECT =====

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
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
    updatePaymentMethodMetadata,
    markPaymentMethodAsExpired,
    validatePaymentMethod,
    cleanupExpiredPaymentMethods,
  },
};
