// src/graphql/resolvers/paymentMethodResolver.ts

// ===== QUERY RESOLVERS =====

import {PaymentMethodService} from "../../../services/PaymentMethod";

export const getPaymentMethod = async(parent: any, args: any, context: any) => {
    const paymentMethodService = new PaymentMethodService(context.em);
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
    return await paymentMethodService.listPaymentMethods(stripeCustomer.stripeCustomerId);
}

export const getDefaultPaymentMethod = async(parent: any, args: any, context: any) => {
    const paymentMethods = await context.em.find('PaymentMethod', {
        stripeCustomer: { stripeCustomerId: args.stripeCustomerId },
        isDefault: true,
        status: 'ACTIVE'
    }, {
        populate: ['stripeCustomer', 'stripeCustomer.user']
    });

    return paymentMethods[0] || null;
}

export const getUserDefaultPaymentMethod = async(parent: any, args: any, context: any)  =>{
    // Obtener customer del usuario
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

export const getExpiredPaymentMethods = async(parent: any, args: any, context: any) => {
    const paymentMethods = await context.em.find('PaymentMethod', {
        stripeCustomer: { stripeCustomerId: args.stripeCustomerId },
        status: 'ACTIVE'
    }, {
        populate: ['stripeCustomer']
    });

    // Filtrar los que están expirados
    return paymentMethods.filter(pm => pm.isExpired);
}

// ===== MUTATION RESOLVERS =====

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
        return {
            success: false,
            message: 'Failed to attach payment method',
            paymentMethod: null,
            errors: [error.message]
        };
    }
}

export const createPaymentMethod = async(parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        const paymentMethod = await paymentMethodService.createPaymentMethod(args.paymentMethod);

        return {
            success: true,
            message: 'Payment method created successfully',
            paymentMethod,
            errors: []
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to create payment method',
            paymentMethod: null,
            errors: [error.message]
        };
    }
}

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

export const updatePaymentMethodMetadata= async(parent: any, args: any, context: any) => {
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

        // Actualizar metadata localmente (Stripe no permite actualizar metadata de payment methods directamente)
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

export const markPaymentMethodAsExpired= async(parent: any, args: any, context: any) => {
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
        paymentMethod.isDefault = false; // Si era default, ya no puede serlo

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

export const syncPaymentMethodFromStripe= async(parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        const paymentMethod = await paymentMethodService.syncPaymentMethodFromStripe(args.paymentMethodId);

        if (!paymentMethod) {
            return {
                success: false,
                message: 'Payment method not found in Stripe',
                paymentMethod: null,
                errors: ['Payment method not found in Stripe or not attached to a customer']
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

export const validatePaymentMethod= async(parent: any, args: any, context: any) => {
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

        const validationErrors = [];

        // Verificar si está expirado
        if (paymentMethod.isExpired) {
            validationErrors.push('Payment method is expired');
        }

        // Verificar si está activo
        if (paymentMethod.status !== 'ACTIVE') {
            validationErrors.push('Payment method is not active');
        }

        // Si hay errores, marcar como inválido
        if (validationErrors.length > 0) {
            return {
                success: false,
                message: 'Payment method validation failed',
                paymentMethod,
                errors: validationErrors
            };
        }

        return {
            success: true,
            message: 'Payment method is valid',
            paymentMethod,
            errors: []
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

// ===== EXPORT RESOLVERS OBJECT =====
export const paymentMethodResolvers = {
    Query: {
        getPaymentMethod,
        listPaymentMethods,
        listUserPaymentMethods,
        getDefaultPaymentMethod,
        getUserDefaultPaymentMethod,
        getExpiredPaymentMethods
    },

    Mutation: {
        attachPaymentMethod,
        createPaymentMethod,
        removePaymentMethod,
        setDefaultPaymentMethod,
        updatePaymentMethodMetadata,
        markPaymentMethodAsExpired,
        syncPaymentMethodFromStripe,
        validatePaymentMethod
    }
};