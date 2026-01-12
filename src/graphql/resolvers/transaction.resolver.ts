import { TransactionService } from '../../services/transaction.service';
import { ContextProps } from '../../types/resolvers';
import { handleError } from '../../utils/errors.util';

// ===== QUERY RESOLVERS =====

export const getTransaction = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { transactionId } = args;

    const transactionService = new TransactionService(em);
    return await transactionService.getTransaction(transactionId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const listUserTransactions = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { userId, limit } = args;

    const transactionService = new TransactionService(em);
    return await transactionService.listUserTransactions(userId, limit);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getTransactionsByStatus = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { userId, status, limit } = args;

    const transactionService = new TransactionService(em);
    return await transactionService.getTransactionsByStatus(
      userId,
      status,
      limit
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const getSuccessfulTransactions = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { userId, limit } = args;

    const transactionService = new TransactionService(em);
    return await transactionService.getSuccessfulTransactions(userId, limit);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getFailedTransactions = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { userId, limit } = args;

    const transactionService = new TransactionService(em);
    return await transactionService.getFailedTransactions(userId, limit);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getUserTransactionsSummary = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { userId } = args;

    const transactionService = new TransactionService(em);
    return await transactionService.getUserTransactionsSummary(userId);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== MUTATION RESOLVERS =====

export const createCharge = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { input } = args;

    const transactionService = new TransactionService(em);
    return await transactionService.createCharge(input);
  } catch (error: any) {
    return handleError(error);
  }
};

export const refundTransaction = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { input } = args;

    const transactionService = new TransactionService(em);
    return await transactionService.refundTransaction(input);
  } catch (error: any) {
    return handleError(error);
  }
};

export const retryFailedTransaction = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { transactionId } = args;

    const transactionService = new TransactionService(em);
    return await transactionService.retryFailedTransaction(transactionId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const markTransactionAsReconciled = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { transactionId, reconciledBy } = args;

    const transactionService = new TransactionService(em);
    return await transactionService.markTransactionAsReconciled(
      transactionId,
      reconciledBy
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const syncTransactionFromStripe = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  try {
    const { em } = context;
    const { stripeChargeId } = args;

    const transactionService = new TransactionService(em);
    return await transactionService.syncTransactionFromStripe(stripeChargeId);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== EXPORT RESOLVERS OBJECT =====

export const transactionResolvers = {
  Query: {
    getTransaction,
    listUserTransactions,
    getTransactionsByStatus,
    getSuccessfulTransactions,
    getFailedTransactions,
    getUserTransactionsSummary,
  },
  Mutation: {
    createCharge,
    refundTransaction,
    retryFailedTransaction,
    markTransactionAsReconciled,
    //syncTransactionFromStripe,
  },
};
