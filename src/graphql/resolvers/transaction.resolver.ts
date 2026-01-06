// src/graphql/resolvers/transactionResolver.ts
import { TransactionService } from '../../services/TransactionService.js';
import {ContextProps} from "../../types/resolvers";
import {CustomResponse} from "./errors";
import {GraphQLError} from "graphql";
import {Transaction, TransactionStatus} from "../../entities/Transaction";

// ===== QUERY RESOLVERS =====

export const getTransaction = async(parent: any, args: any, context: ContextProps) => {
    const transactionService = new TransactionService(context.em);
    const transaction = await transactionService.getTransaction(args.transactionId);

    return CustomResponse(200, 'Transaction is fetched sucessfully.', true, {transaction});
}

export const listUserTransactions = async(parent: any, args: any, context: ContextProps) => {
    const transactionService = new TransactionService(context.em);
    const limit = args.limit || 50;
    const transactions = transactionService.listUserTransactions(args.userId, limit);

    return CustomResponse(200, 'Transactions listed successfully.', true, {transactions});
}

export const getTransactionsByStatus = async(parent: any, args: any, context: ContextProps) => {
    const transactions = await context.em.find('Transaction', {
        user: args.userId,
        status: args.status
    }, {
        populate: ['paymentMethod', 'subscription'],
        orderBy: { created_at: 'DESC' },
        limit: args.limit || 50
    });

    return CustomResponse(200, 'Transactions listed successfully.', true, {transactions});
}

export const getSuccessfulTransactions = async(parent: any, args: any, context: ContextProps) => {
    const transactions = await context.em.find(Transaction, {
        user: args.userId,
        status: TransactionStatus.SUCCEEDED
    }, {
        populate: ['paymentMethod', 'subscription'],
        orderBy: { created_at: 'DESC' },
        limit: args.limit || 50
    });
    return CustomResponse(200, 'Transactions listed successfully.', true, {transactions});
}

export const getFailedTransactions = async(parent: any, args: any, context: ContextProps) => {
    const transactions = await context.em.find('Transaction', {
        user: args.userId,
        status: 'FAILED'
    }, {
        populate: ['paymentMethod'],
        orderBy: { created_at: 'DESC' },
        limit: args.limit || 50
    });
    return CustomResponse(200, 'Transactions failed.', true, {transactions});
}

export const getUserTransactionsSummary = async(parent: any, args: any, context: ContextProps) => {
    const allTransactions = await context.em.find(Transaction, {
        user: args.userId
    });

    const summary = {
        totalTransactions: allTransactions.length,
        successfulTransactions: allTransactions.filter((t: Transaction) => t.status === TransactionStatus.SUCCEEDED).length,
        failedTransactions: allTransactions.filter((t: Transaction) => t.status === TransactionStatus.FAILED).length,
        totalAmount: allTransactions
            .filter((t: Transaction) => t.status === TransactionStatus.SUCCEEDED)
            .reduce((sum: number, t: Transaction) => sum + t.amount, 0),
        totalRefunded: allTransactions
            .reduce((sum: number, t: Transaction) => sum + t.amountRefunded, 0),
        lastTransaction: allTransactions
            .sort((a: Transaction, b: Transaction) => b.created_at.getTime() - a.created_at.getTime())[0] || null
    };

    return CustomResponse(200, 'Summary has been loaded successfully.', true, {summary});
}

// ===== MUTATION RESOLVERS =====

export const createCharge = async(parent: any, args: any, context: ContextProps) => {
    try {
        const transactionService = new TransactionService(context.em);
        const transaction = await transactionService.createCharge(args.input);

        return CustomResponse(200, 'Charge created successfully.', true, {transaction});
    } catch (error: any) {
        throw new GraphQLError(error.message, {
            extensions: {
                code: 'ERROR_CREATE_CHARGE'
            }
        });
    }
}

export const refundTransaction = async(parent: any, args: any, context: ContextProps) => {
    try {
        const transactionService = new TransactionService(context.em);
        const refundTransaction = await transactionService.refundTransaction(args.input);

        return CustomResponse(200, 'Transaction refunded successfully', true, {transaction: refundTransaction})
    } catch (error: any) {
        throw new GraphQLError(error.message, {
            extensions: {
                code: 'ERROR_REFUND_TRANSACTION',
            }
        })
    }
}

export const retryFailedTransaction = async(parent: any, args: any, context: ContextProps) => {
    try {
        const transactionService = new TransactionService(context.em);
        const originalTransaction = await transactionService.getTransaction(args.transactionId);

        if (!originalTransaction || originalTransaction.status !== TransactionStatus.FAILED) {
            return CustomResponse(400, 'Transaction not found or not in failed state', false, {transaction: null})
        }

        const newTransaction = await transactionService.createCharge({
            userId: originalTransaction.user.id,
            amount: originalTransaction.amount,
            currency: originalTransaction.currency,
            paymentMethodId: originalTransaction.paymentMethod?.stripePaymentMethodId,
            description: `Retry of failed transaction ${originalTransaction.id}`,
            metadata: {
                ...originalTransaction.metadata,
                retryOf: originalTransaction.id,
                retryAttempt: (originalTransaction.metadata?.retryAttempt || 0) + 1
            }
        });

        return CustomResponse(200, 'Transaction retry initiated successfully',true, {transaction: newTransaction})
    } catch (error: any) {
        throw new GraphQLError(error.message, {
            extensions: {
                code: 'ERROR_RETRY_FAILED',
            }
        })
    }
}

export const markTransactionAsReconciled = async(parent: any, args: any, context: ContextProps) => {
    try {
        const transaction = await context.em.findOne(Transaction, {
            id: args.transactionId
        });

        if (!transaction) {
            return CustomResponse(400, 'Transaction not found', false, {transaction: null})
        }

        // Actualizar metadata para marcar como reconciliado
        transaction.metadata = {
            ...transaction.metadata,
            reconciledAt: new Date().toISOString(),
            reconciledBy: args.reconciledBy || 'system'
        };

        await context.em.flush();

        return CustomResponse(200, 'Transaction reconcted successfully', true, {transaction})
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to mark transaction as reconciled',
            transaction: null,
            errors: [error.message]
        };
    }
}

// ===== EXPORT RESOLVERS OBJECT =====
export const transactionResolvers = {
    Query: {
       getTransaction,
        listUserTransactions,
        getTransactionsByStatus,
        getSuccessfulTransactions,
        getFailedTransactions,
        getUserTransactionsSummary
    },

    Mutation: {
        createCharge,
        refundTransaction,
        retryFailedTransaction,
        markTransactionAsReconciled
    }
};