import { TransactionService } from '../../services/transaction.service';
import { ContextProps } from '../../types/resolvers';
import { handleError } from '../../utils/errors.util';

// ===== QUERY RESOLVERS =====

export const getTransaction = async (
  _: any,
  args: { transactionId: string },
  context: ContextProps
) => {
  try {
    const transactionService = new TransactionService(
      context.em,
      context.paymentProcessor
    );
    return await transactionService.getTransaction(args.transactionId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const listUserTransactions = async (
  _: any,
  args: { userId: string; limit?: number },
  context: ContextProps
) => {
  try {
    const transactionService = new TransactionService(
      context.em,
      context.paymentProcessor
    );
    return await transactionService.listUserTransactions(
      args.userId,
      args.limit
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const getTransactionsByStatus = async (
  _: any,
  args: { userId: string; status: any; limit?: number },
  context: ContextProps
) => {
  try {
    const transactionService = new TransactionService(
      context.em,
      context.paymentProcessor
    );
    return await transactionService.getTransactionsByStatus(
      args.userId,
      args.status,
      args.limit
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const getSuccessfulTransactions = async (
  _: any,
  args: { userId: string; limit?: number },
  context: ContextProps
) => {
  try {
    const transactionService = new TransactionService(
      context.em,
      context.paymentProcessor
    );
    return await transactionService.getSuccessfulTransactions(
      args.userId,
      args.limit
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const getFailedTransactions = async (
  _: any,
  args: { userId: string; limit?: number },
  context: ContextProps
) => {
  try {
    const transactionService = new TransactionService(
      context.em,
      context.paymentProcessor
    );
    return await transactionService.getFailedTransactions(
      args.userId,
      args.limit
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const getUserTransactionsSummary = async (
  _: any,
  args: { userId: string },
  context: ContextProps
) => {
  try {
    const transactionService = new TransactionService(
      context.em,
      context.paymentProcessor
    );
    return await transactionService.getUserTransactionsSummary(args.userId);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== MUTATION RESOLVERS =====

export const createCharge = async (
  _: any,
  args: { input: any },
  context: ContextProps
) => {
  try {
    const transactionService = new TransactionService(
      context.em,
      context.paymentProcessor
    );
    return await transactionService.createCharge(args.input);
  } catch (error: any) {
    return handleError(error);
  }
};

export const refundTransaction = async (
  _: any,
  args: { input: any },
  context: ContextProps
) => {
  try {
    const transactionService = new TransactionService(
      context.em,
      context.paymentProcessor
    );
    return await transactionService.refundTransaction(args.input);
  } catch (error: any) {
    return handleError(error);
  }
};

export const retryFailedTransaction = async (
  _: any,
  args: { transactionId: string },
  context: ContextProps
) => {
  try {
    const transactionService = new TransactionService(
      context.em,
      context.paymentProcessor
    );
    return await transactionService.retryFailedTransaction(args.transactionId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const markTransactionAsReconciled = async (
  _: any,
  args: { transactionId: string; reconciledBy?: string },
  context: ContextProps
) => {
  try {
    const transactionService = new TransactionService(
      context.em,
      context.paymentProcessor
    );
    return await transactionService.markTransactionAsReconciled(
      args.transactionId,
      args.reconciledBy
    );
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
    // ELIMINADOS: syncTransactionFromStripe
  },
};
