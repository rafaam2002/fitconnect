// src/graphql/resolvers/paymentMethodResolver.ts

// ===== QUERY RESOLVERS =====

import {PaymentMethodService} from "../../services/payment.method.service";
import {CustomResponse} from "./errors";
import {GraphQLError} from "graphql";
import {PaymentMethod} from "../../entities/PaymentMethod";
import {PaymentMethodStatus} from "../../types/enums";
import {StripeCustomer} from "../../entities/StripeCustomer";

export const getPaymentMethod = async (parent: any, args: any, context: any) => {
    try {
        const paymentMethod = await context.em.findOne(PaymentMethod, {
            stripePaymentMethodId: args.paymentMethodId
        }, {
            populate: ['stripeCustomer', 'stripeCustomer.user']
        });
        return CustomResponse(200, 'Payment method is fetched successfully.', true, {paymentMethod});
    } catch (err: any) {
        return new GraphQLError(err.message, {
            extensions: {
                code: 'PAYMENT_METHOD_NOT_FOUND',
            }
        });
    }
}

export const listPaymentMethods = async (parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        const paymentMethods = await paymentMethodService.listPaymentMethods(args.stripeCustomerId);

        return CustomResponse(200, 'Payment methods is fetched successfully.', true, {paymentMethods});
    } catch (err: any) {
        return new GraphQLError(err.message, {
            extensions: {
                code: 'PAYMENTS_METHOD_NOT_FOUND',
            }
        })
    }

}

export const listUserPaymentMethods = async (parent: any, args: any, context: any) => {
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

export const getDefaultPaymentMethod = async (parent: any, args: any, context: any) => {
    try {
        const paymentMethod = await context.em.findOne(PaymentMethod, {
            stripeCustomer: {stripeCustomerId: args.stripeCustomerId},
            isDefault: true,
            status: PaymentMethodStatus.ACTIVE
        }, {
            populate: ['stripeCustomer', 'stripeCustomer.user']
        });

        return CustomResponse(200, 'Default Payment Method is fetched successfully.', true, {paymentMethod});
    } catch (err: any) {
        return new GraphQLError(err.message, {
            extensions: {
                code: 'CANNOT_FOUND_DEFAULT_PAYMENT_METHOD',
            }
        })
    }
}

export const getUserDefaultPaymentMethod = async (parent: any, args: any, context: any) => {
    const stripeCustomer = await context.em.findOne(StripeCustomer, {
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

    return CustomResponse(200, 'Default User Payment Method is fetched successfully.', true, {paymentMethod: paymentMethods[0]});
}

export const getExpiredPaymentMethods = async (parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        const paymentMethods = await paymentMethodService.getExpiredPaymentMethods(args.stripeCustomerId);

        return CustomResponse(200, 'Expired method payments are fetched successfully.', true, {paymentMethods});
    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'PAYMENT_METHODS_NOT_FOUND',
            }
        })
    }
}

export const getPaymentMethodsStats = async (parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        const stats = await paymentMethodService.getPaymentMethodsStats(args.stripeCustomerId);

        return CustomResponse(200, 'Payment method stats are fetched successfully.', true, {stats});
    } catch (error: any) {
        return new GraphQLError(`${{
            total: 0,
            active: 0,
            expired: 0,
            byBrand: {},
            hasDefault: false
        }}`, {
            extensions: {
                code: 'STATS_PAYMENT_METHODS_NOT_FOUND',
            }
        })
    }
}

// ===== MUTATION RESOLVERS =====

export const createSetupIntent = async (parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        const result = await paymentMethodService.createSetupIntent({
            stripeCustomerId: args.stripeCustomerId,
            usage: args.usage || 'on_session',
            metadata: args.metadata || {}
        });

        return CustomResponse(200, 'Setup Intent created successfully.', true, {
            clientSecret: result.clientSecret,
            setupIntentId: result.setupIntentId
        });

    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'ERROR_CREATING_PAYMENT',
            }
        });
    }
}

export const confirmSetupIntent = async (parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        const paymentMethod = await paymentMethodService.confirmSetupIntent({
            setupIntentId: args.setupIntentId,
            setAsDefault: args.setAsDefault
        });

        return CustomResponse(200, 'Payment method confirmed and attached successfully', true, {paymentMethod})
    } catch (error: any) {
        throw new GraphQLError(error.message, {
            extensions: {
                code: 'ERROR_CREATING_PAYMENT',
            }
        });
    }
}

export const attachPaymentMethod = async (parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        const paymentMethod = await paymentMethodService.attachPaymentMethod(args.input);

        return CustomResponse(200, 'Payment method attached successfully.', true, {paymentMethod})
    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'ERROR_ATTACHING_PAYMENT_METHOD'
            }
        });
    }
}

export const removePaymentMethod = async (parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        await paymentMethodService.removePaymentMethod(args.paymentId);

        return CustomResponse(200, 'Payment method removed successfully.', true);
    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'ERROR_DELETE_PAYMENT_METHOD',
            }
        })
    }
}

export const setDefaultPaymentMethod = async (parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        const paymentMethod = await paymentMethodService.setDefaultPaymentMethod(args.paymentMethodId);

        return CustomResponse(200, 'Default payment method updated successfully.', true, {paymentMethod});

    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'ERROR_SET_DEFAULT_PAYMENT_METHOD',
            }
        })
    }
}

export const updatePaymentMethodMetadata = async (parent: any, args: any, context: any) => {
    try {
        const paymentMethod = await context.em.findOne(PaymentMethod, {
            stripePaymentMethodId: args.paymentMethodId
        });

        if (!paymentMethod) {
            return new GraphQLError('Payment method not found', {
                extensions: {
                    code: 'ERROR_UPDATE_PAYMENT_METHOD',
                }
            });
        }

        // Actualizar metadata localmente
        paymentMethod.metadata = {
            ...paymentMethod.metadata,
            ...args.metadata
        };

        await context.em.flush();

        return CustomResponse(200, 'Payment method updated successfully.', true, {paymentMethod});

    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'ERROR_UPDATE_PAYMENT_METHOD',
            }
        })
    }
}

export const markPaymentMethodAsExpired = async (parent: any, args: any, context: any) => {
    try {
        const paymentMethod = await context.em.findOne(PaymentMethod, {
            stripePaymentMethodId: args.paymentMethodId
        });

        if (!paymentMethod) {
            return new GraphQLError(`Payment method not found`, {
                extensions: {
                    code: 'PAYMENT_NOT_FOUND',
                }
            })
        }

        paymentMethod.status = PaymentMethodStatus.EXPIRED;
        paymentMethod.isDefault = false;

        await context.em.flush();

        return CustomResponse(200, 'Payment method updated successfully.', true, {paymentMethod});
    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'ERROR_MARK_PAYMENT_METHOD_AS_EXPIRED',
            }
        })
    }
}

export const cleanupExpiredPaymentMethods = async (parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        const result = await paymentMethodService.cleanupExpiredPaymentMethods(args.stripeCustomerId);

        return CustomResponse(200, `Successfully cleaned up ${result.cleaned} expired payment methods`, true, {});

    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'ERROR_CLEAR_EXPIRED_PAYMENT_METHOD',
            }
        })
    }
}

export const syncPaymentMethodFromStripe = async (parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        const paymentMethod = await paymentMethodService.syncPaymentMethodFromStripe(args.paymentMethodId);

        if (!paymentMethod) {
            return new GraphQLError('Payment method not found in Stripe or not attached to customer', {
                extensions: {
                    code: 'PAYMENT_METHOD_NOT_FOUND_ON_STRIPE_OR_NOT_ATTACHED',
                }
            })
        }

        return CustomResponse(200, 'Payment method synchronized successfully.', true, {paymentMethod});
    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'FAILED_SYNCRONIZE_PAYMENT_METHOD',
            }
        })
    }
}

export const validatePaymentMethod = async (parent: any, args: any, context: any) => {
    try {
        const paymentMethodService = new PaymentMethodService(context.em);
        const result = await paymentMethodService.validatePaymentMethod(args.paymentMethodId);

        return CustomResponse(200, result.isValid
            ? 'Payment method is valid'
            : `Payment method validation failed: ${result.errors.join(', ')}`, true, {paymentMethod: result.paymentMethod});

    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'ERROR_VALID_PAYMENT_METHOD',
            }
        })
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
        // syncPaymentMethodFromStripe,
        validatePaymentMethod,
        cleanupExpiredPaymentMethods

    }
};