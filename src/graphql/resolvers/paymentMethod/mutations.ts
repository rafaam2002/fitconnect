// src/graphql/resolvers/paymentMethodResolver.ts

// ===== QUERY RESOLVERS =====

import {PaymentMethodService} from "../../../services/PaymentMethod";
import {CustomResponse} from "../errors";
import {GraphQLError} from "graphql";

export const getPaymentMethod = async(parent: any, args: any, context: any) => {
    const paymentMethod = await context.em.findOne('PaymentMethod', {
        stripePaymentMethodId: args.paymentMethodId
    }, {
        populate: ['stripeCustomer', 'stripeCustomer.user']
    });
    return paymentMethod;
}

export const listPaymentMethods = async(parent: any, args: any, context: any) => {
    const paymentMethodService = new PaymentMethodService(context.em);
    return await paymentMethodService.listPaymentMethods(args.stripeCustomerId);
}

export const listUserPaymentMethods = async(parent: any, args: any, context: any) => {
    // Obtener customer del usuario
    const stripeCustomer = await context.em.findOne('StripeCustomer', {
        user: args.userId,
        isActive: true
    });

    if (!stripeCustomer) {
        return [];
    }

    const paymentMethodService = new PaymentMethodService(context.em);
    const paymentMethods = await paymentMethodService.listPaymentMethods(stripeCustomer.stripeCustomerId);

    return CustomResponse(200, 'Payment methods are fetched successfully.', true, {paymentMethods});
}

export const getDefaultPaymentMethod = async(parent: any, args: any, context: any) => {
    const paymentMethods = await context.em.find('PaymentMethod', {
        stripeCustomer: {stripeCustomerId: args.stripeCustomerId},
        isDefault: true,
        status: 'ACTIVE'
    }, {
        populate: ['stripeCustomer', 'stripeCustomer.user']
    });

    return paymentMethods[0] || null;
}

export const getUserDefaultPaymentMethod = async(parent: any, args: any, context: any) => {
    const stripeCustomer = await context.em.findOne('StripeCustomer', {
        user: args.userId,
        isActive: true
    });

    if (!stripeCustomer) {
        return null;
    }

    const paymentMethods = await context.em.find('PaymentMethod', {
        stripeCustomer,
        isDefault: true,
        status: 'ACTIVE'
    });

    return paymentMethods[0] || null;
}

// ✅ NUEVO: Obtener métodos de pago expirados
export const getExpiredPaymentMethods = async(parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        return await paymentMethodService.getExpiredPaymentMethods(args.stripeCustomerId);
    } catch (error: any) {
        console.error('Error getting expired payment methods:', error);
        return [];
    }
}

// ✅ NUEVO: Obtener estadísticas de métodos de pago
export const getPaymentMethodsStats = async(parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        return await paymentMethodService.getPaymentMethodsStats(args.stripeCustomerId);
    } catch (error: any) {
        console.error('Error getting payment methods stats:', error);
        return {
            total: 0,
            active: 0,
            expired: 0,
            byBrand: {},
            hasDefault: false
        };
    }
}

// ===== MUTATION RESOLVERS =====

// Crear Setup Intent
export const createSetupIntent = async(parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        const result = await paymentMethodService.createSetupIntent({
            stripeCustomerId: args.stripeCustomerId,
            usage: args.usage || 'on_session',
            metadata: args.metadata || {}
        });

        return CustomResponse(200, 'Setup Intent created successfully.', true, {clientSecret: result.clientSecret, setupIntentId: result.setupIntentId});

    } catch (error: any) {
        throw new GraphQLError( error.message);
    }
}

// Confirmar Setup Intent
export const confirmSetupIntent = async(parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        const paymentMethod = await paymentMethodService.confirmSetupIntent({
            setupIntentId: args.setupIntentId,
            setAsDefault: args.setAsDefault
        });

        return CustomResponse(200, 'Payment method confirmed and attached successfully', true, {paymentMethod})
    } catch (error: any) {
        throw new GraphQLError( error.message);
    }
}

export const attachPaymentMethod = async(parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        const paymentMethod = await paymentMethodService.attachPaymentMethod(args.input);

        return {
            success: true,
            message: 'Payment method attached successfully',
            paymentMethod,
            errors: []
        };
    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'ERROR_ATTACHING_PAYMENT_METHOD'
            }
        });
    }
}

// ✅ MANTENIDO: Remover método de pago
export const removePaymentMethod = async(parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        await paymentMethodService.removePaymentMethod(args.paymentMethodId);

        return {
            success: true,
            message: 'Payment method removed successfully',
            paymentMethod: null,
            errors: []
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to remove payment method',
            paymentMethod: null,
            errors: [error.message]
        };
    }
}

// ✅ MANTENIDO: Establecer método de pago por defecto
export const setDefaultPaymentMethod = async(parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        const paymentMethod = await paymentMethodService.setDefaultPaymentMethod(args.paymentMethodId);

        return {
            success: true,
            message: 'Default payment method updated successfully',
            paymentMethod,
            errors: []
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to set default payment method',
            paymentMethod: null,
            errors: [error.message]
        };
    }
}

// ✅ MANTENIDO: Actualizar metadatos
export const updatePaymentMethodMetadata = async(parent: any, args: any, context: any) => {
    try {
        const paymentMethod = await context.em.findOne('PaymentMethod', {
            stripePaymentMethodId: args.paymentMethodId
        });

        if (!paymentMethod) {
            return {
                success: false,
                message: 'Payment method not found',
                paymentMethod: null,
                errors: ['Payment method not found']
            };
        }

        // Actualizar metadata localmente
        paymentMethod.metadata = {
            ...paymentMethod.metadata,
            ...args.metadata
        };

        await context.em.flush();

        return {
            success: true,
            message: 'Payment method metadata updated successfully',
            paymentMethod,
            errors: []
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to update payment method metadata',
            paymentMethod: null,
            errors: [error.message]
        };
    }
}

// ✅ MANTENIDO: Marcar como expirado
export const markPaymentMethodAsExpired = async(parent: any, args: any, context: any) => {
    try {
        const paymentMethod = await context.em.findOne('PaymentMethod', {
            stripePaymentMethodId: args.paymentMethodId
        });

        if (!paymentMethod) {
            return {
                success: false,
                message: 'Payment method not found',
                paymentMethod: null,
                errors: ['Payment method not found']
            };
        }

        paymentMethod.status = 'EXPIRED';
        paymentMethod.isDefault = false;

        await context.em.flush();

        return {
            success: true,
            message: 'Payment method marked as expired',
            paymentMethod,
            errors: []
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to mark payment method as expired',
            paymentMethod: null,
            errors: [error.message]
        };
    }
}

// ✅ NUEVO: Limpiar métodos de pago expirados
export const cleanupExpiredPaymentMethods = async(parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        const result = await paymentMethodService.cleanupExpiredPaymentMethods(args.stripeCustomerId);

        return {
            success: true,
            message: `Successfully cleaned up ${result.cleaned} expired payment methods`,
            cleanedCount: result.cleaned,
            paymentMethods: result.paymentMethods,
            errors: []
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to cleanup expired payment methods',
            cleanedCount: 0,
            paymentMethods: [],
            errors: [error.message]
        };
    }
}

// ✅ MANTENIDO: Sincronizar desde Stripe
export const syncPaymentMethodFromStripe = async(parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        const paymentMethod = await paymentMethodService.syncPaymentMethodFromStripe(args.paymentMethodId);

        if (!paymentMethod) {
            return {
                success: false,
                message: 'Payment method not found in Stripe or not attached to customer',
                paymentMethod: null,
                errors: ['Payment method not found in Stripe']
            };
        }

        return {
            success: true,
            message: 'Payment method synchronized successfully',
            paymentMethod,
            errors: []
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to synchronize payment method',
            paymentMethod: null,
            errors: [error.message]
        };
    }
}

// ✅ ACTUALIZADO: Validar método de pago con nueva lógica
export const validatePaymentMethod = async(parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        const result = await paymentMethodService.validatePaymentMethod(args.paymentMethodId);

        return {
            success: result.isValid,
            message: result.isValid
                ? 'Payment method is valid'
                : `Payment method validation failed: ${result.errors.join(', ')}`,
            paymentMethod: result.paymentMethod,
            errors: result.errors
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to validate payment method',
            paymentMethod: null,
            errors: [error.message]
        };
    }
}

// ===== EXPORT RESOLVERS OBJECT FINAL =====
export const paymentMethodResolvers = {
    Query: {
        // Consultas básicas (mantenidas)
        getPaymentMethod,
        listPaymentMethods,
        listUserPaymentMethods,
        getDefaultPaymentMethod,
        getUserDefaultPaymentMethod,

        // ✅ Nuevas consultas
        getExpiredPaymentMethods,
        getPaymentMethodsStats
    },

    Mutation: {
        createSetupIntent,
        confirmSetupIntent,

        attachPaymentMethod,
        removePaymentMethod,
        setDefaultPaymentMethod,

        updatePaymentMethodMetadata,
        markPaymentMethodAsExpired,
        syncPaymentMethodFromStripe,
        validatePaymentMethod,

        cleanupExpiredPaymentMethods

    }
};