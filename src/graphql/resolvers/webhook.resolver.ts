import { ContextProps } from "../../types/resolvers";
import { WebhookService } from "../../services/webhook.service";
import { handleError } from "../../utils/errors.util";

// ===== QUERY RESOLVERS =====

export const getWebhookEventLogs = async (
    _: any,
    args: any,
    context: ContextProps
) => {
    try {
        const { em } = context;
        const { status, eventType, limit, offset } = args;

        const webhookService = new WebhookService(em);
        return await webhookService.getWebhookEventLogs(
            status,
            eventType,
            limit,
            offset
        );
    } catch (error: any) {
        return handleError(error);
    }
};

export const getWebhookEventLog = async (
    _: any,
    args: any,
    context: ContextProps
) => {
    try {
        const { em } = context;
        const { stripeEventId } = args;

        const webhookService = new WebhookService(em);
        return await webhookService.getWebhookEventLog(stripeEventId);
    } catch (error: any) {
        return handleError(error);
    }
};

export const getFailedWebhookEvents = async (
    _: any,
    args: any,
    context: ContextProps
) => {
    try {
        const { em } = context;
        const { maxRetries, limit } = args;

        const webhookService = new WebhookService(em);
        return await webhookService.getFailedWebhookEvents(maxRetries, limit);
    } catch (error: any) {
        return handleError(error);
    }
};

export const getWebhookStats = async (
    _: any,
    args: any,
    context: ContextProps
) => {
    try {
        const { em } = context;

        const webhookService = new WebhookService(em);
        return await webhookService.getWebhookStats();
    } catch (error: any) {
        return handleError(error);
    }
};

// ===== MUTATION RESOLVERS =====

export const processWebhook = async (
    _: any,
    args: any,
    context: ContextProps
) => {
    try {
        const { em } = context;
        const { body, signature } = args;

        const webhookService = new WebhookService(em);
        return await webhookService.processWebhook(body, signature);
    } catch (error: any) {
        return handleError(error);
    }
};

export const retryFailedEvents = async (
    _: any,
    args: any,
    context: ContextProps
) => {
    try {
        const { em } = context;
        const { maxRetries } = args;

        const webhookService = new WebhookService(em);
        return await webhookService.retryFailedEvents(maxRetries);
    } catch (error: any) {
        return handleError(error);
    }
};

export const retryWebhookEvent = async (
    _: any,
    args: any,
    context: ContextProps
) => {
    try {
        const { em } = context;
        const { stripeEventId } = args;

        const webhookService = new WebhookService(em);
        return await webhookService.retryWebhookEvent(stripeEventId);
    } catch (error: any) {
        return handleError(error);
    }
};

export const deleteWebhookEventLog = async (
    _: any,
    args: any,
    context: ContextProps
) => {
    try {
        const { em } = context;
        const { stripeEventId } = args;

        const webhookService = new WebhookService(em);
        return await webhookService.deleteWebhookEventLog(stripeEventId);
    } catch (error: any) {
        return handleError(error);
    }
};

export const cleanupOldWebhookLogs = async (
    _: any,
    args: any,
    context: ContextProps
) => {
    try {
        const { em } = context;
        const { daysOld, status } = args;

        const webhookService = new WebhookService(em);
        return await webhookService.cleanupOldWebhookLogs(daysOld, status);
    } catch (error: any) {
        return handleError(error);
    }
};

// ===== EXPORT RESOLVERS OBJECT =====

export const webhookResolvers = {
    Query: {
        getWebhookEventLogs,
        getWebhookEventLog,
        getFailedWebhookEvents,
        getWebhookStats,
    },
    Mutation: {
        processWebhook,
        retryFailedEvents,
        retryWebhookEvent,
        deleteWebhookEventLog,
        cleanupOldWebhookLogs,
    },
};