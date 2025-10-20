// src/graphql/resolvers/webhook.resolver.ts
import { WebhookService } from "../../services/WebhookService";
import { CustomResponse } from "./errors";
import { GraphQLError } from "graphql/index";
import {ContextProps} from "../../types/resolvers";

// ===== QUERY RESOLVERS =====
export const getWebhookEventLogs = async (parent: any, args: any, context: ContextProps) => {
    try {
        const webhookService = new WebhookService(context.em);
        const { status, eventType, limit = 50, offset = 0 } = args;

        const conditions: any = {};
        if (status) conditions.status = status;
        if (eventType) conditions.eventType = eventType;

        const eventLogs = await context.em.find('WebhookEventLog', conditions, {
            orderBy: { created_at: 'DESC' },
            limit,
            offset
        });

        const total = await context.em.count('WebhookEventLog', conditions);

        return CustomResponse(200, 'Webhook event logs fetched successfully!', true, {
            eventLogs,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total
            }
        });
    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'FAILED_GET_WEBHOOK_LOGS',
            }
        });
    }
}

export const getWebhookEventLog = async (parent: any, args: any, context: ContextProps) => {
    try {
        const webhookService = new WebhookService(context.em);
        const eventLog = await context.em.findOne('WebhookEventLog', {
            stripeEventId: args.stripeEventId
        });

        if (!eventLog) {
            return new GraphQLError('Webhook event log not found', {
                extensions: {
                    code: 'WEBHOOK_EVENT_NOT_FOUND',
                }
            });
        }

        return CustomResponse(200, 'Webhook event log fetched successfully!', true, { eventLog });
    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'FAILED_GET_WEBHOOK_LOG',
            }
        });
    }
}

export const getFailedWebhookEvents = async (parent: any, args: any, context: ContextProps) => {
    try {
        const webhookService = new WebhookService(context.em);
        const { maxRetries = 3, limit = 20 } = args;

        const failedEvents = await context.em.find('WebhookEventLog', {
            status: 'FAILED',
            retryCount: { $lt: maxRetries }
        }, {
            orderBy: { created_at: 'DESC' },
            limit
        });

        return CustomResponse(200, 'Failed webhook events fetched successfully!', true, {
            failedEvents,
            count: failedEvents.length
        });
    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'FAILED_GET_FAILED_EVENTS',
            }
        });
    }
}

export const getWebhookStats = async (parent: any, args: any, context: ContextProps) => {
    try {

        const [
            totalEvents,
            processedEvents,
            failedEvents,
            pendingEvents
        ] = await Promise.all([
            context.em.count('WebhookEventLog', {}),
            context.em.count('WebhookEventLog', { status: 'PROCESSED' }),
            context.em.count('WebhookEventLog', { status: 'FAILED' }),
            context.em.count('WebhookEventLog', { status: 'PENDING' })
        ]);

        const stats = {
            total: totalEvents,
            processed: processedEvents,
            failed: failedEvents,
            pending: pendingEvents,
            successRate: totalEvents > 0 ? (processedEvents / totalEvents) * 100 : 0
        };

        return CustomResponse(200, 'Webhook statistics fetched successfully!', true, { stats });
    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'FAILED_GET_WEBHOOK_STATS',
            }
        });
    }
}

// ===== MUTATION RESOLVERS =====
export const processWebhook = async (parent: any, args: any, context: ContextProps) => {
    try {
        const webhookService = new WebhookService(context.em);
        const { body, signature } = args;

        await webhookService.processWebhook(body, signature);

        return CustomResponse(200, 'Webhook processed successfully', true, null);
    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'FAILED_PROCESS_WEBHOOK',
            }
        });
    }
}

export const retryFailedEvents = async (parent: any, args: any, context: ContextProps) => {
    try {
        const webhookService = new WebhookService(context.em);
        const { maxRetries = 3 } = args;

        await webhookService.retryFailedEvents(maxRetries);

        return CustomResponse(200, 'Failed events retry initiated successfully', true, null);
    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'FAILED_RETRY_EVENTS',
            }
        });
    }
}

export const retryWebhookEvent = async (parent: any, args: any, context: ContextProps) => {
    try {
        const webhookService = new WebhookService(context.em);
        const { stripeEventId } = args;

        const eventLog = await context.em.findOne('WebhookEventLog', {
            stripeEventId
        });

        if (!eventLog) {
            return new GraphQLError('Webhook event log not found', {
                extensions: {
                    code: 'WEBHOOK_EVENT_NOT_FOUND',
                }
            });
        }

        if (eventLog.status === 'PROCESSED') {
            return new GraphQLError('Event already processed', {
                extensions: {
                    code: 'EVENT_ALREADY_PROCESSED',
                }
            });
        }

        // Simular el evento de Stripe para reprocessar
        const mockEvent = {
            id: eventLog.stripeEventId,
            type: eventLog.eventType,
            data: { object: eventLog.payload },
            api_version: '2023-10-16',
            created: Math.floor(eventLog.created_at.getTime() / 1000),
            livemode: false,
            object: 'event',
            pending_webhooks: 0,
            request: { id: null, idempotency_key: null }
        };

        await webhookService['handleWebhookEvent'](mockEvent);
        eventLog.markAsProcessed();
        await context.em.flush();

        return CustomResponse(200, 'Webhook event retried successfully', true, { eventLog });
    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'FAILED_RETRY_EVENT',
            }
        });
    }
}

export const deleteWebhookEventLog = async (parent: any, args: any, context: ContextProps) => {
    try {
        const webhookService = new WebhookService(context.em);
        const { stripeEventId } = args;

        const eventLog = await context.em.findOne('WebhookEventLog', {
            stripeEventId
        });

        if (!eventLog) {
            return new GraphQLError('Webhook event log not found', {
                extensions: {
                    code: 'WEBHOOK_EVENT_NOT_FOUND',
                }
            });
        }

        await context.em.removeAndFlush(eventLog);

        return CustomResponse(200, 'Webhook event log deleted successfully', true, null);
    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'FAILED_DELETE_WEBHOOK_LOG',
            }
        });
    }
}

export const cleanupOldWebhookLogs = async (parent: any, args: any, context: ContextProps) => {
    try {
        const webhookService = new WebhookService(context.em);
        const { daysOld = 30, status } = args;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const conditions: any = {
            created_at: { $lt: cutoffDate }
        };

        if (status) {
            conditions.status = status;
        }

        const deletedCount = await context.em.nativeDelete('WebhookEventLog', conditions);

        return CustomResponse(200, 'Old webhook logs cleaned up successfully', true, {
            deletedCount
        });
    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'FAILED_CLEANUP_LOGS',
            }
        });
    }
}

export const webhookResolvers = {
    Query: {
        getWebhookEventLogs,
        getWebhookEventLog,
        getFailedWebhookEvents,
        getWebhookStats
    },
    Mutation: {
        processWebhook,
        retryFailedEvents,
        retryWebhookEvent,
        deleteWebhookEventLog,
        cleanupOldWebhookLogs
    }
}