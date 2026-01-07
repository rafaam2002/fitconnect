import {CustomerService} from "../../services/customer.service";
import {CustomResponse} from "./errors";
import {GraphQLError} from "graphql/index";

// ===== QUERY RESOLVERS =====
export const getCustomer = async (parent: any, args: any, context: any) => {
    const customerService = new CustomerService(context.em);
    const customer = await customerService.getCustomer(args.stripeCustomerId);

    return CustomResponse(200, 'Customer fetched successfully!', true, {customer});
}

export const getCustomerByUserId = async (parent: any, args: any, context: any) => {
    const customerService = new CustomerService(context.em);
    const customer = await customerService.getCustomerByUserId(args.userId);

    return await CustomResponse(200, 'Customer fetched successfully!', true, {customer});
}

// ===== QUERY RESOLVERS =====
export const createCustomer = async (parent: any, args: any, context: any) => {
    try {
        const customerService = new CustomerService(context.em);
        const customer = await customerService.createCustomer(args.customer);

        return CustomResponse(200, 'Customer created successfully', true, {customer});
    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'FAILED_CREATE_CUSTOMER',
            }
        })
    }
}

export const updateCustomer = async (parent: any, args: any, context: any) => {
    try {
        const customerService = new CustomerService(context.em);
        const customer = await customerService.updateCustomer(args.customer);

        return CustomResponse(200, 'Customer updated successfully', true, customer);

    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'FAILED_UPDATE_CUSTOMER',
            }
        })
    }
}

export const deactivateCustomer = async (parent: any, args: any, context: any) => {
    try {
        const customerService = new CustomerService(context.em);
        const customer = await customerService.deactivateCustomer(args.stripeCustomerId);

        return CustomResponse(200, 'Customer deactivated successfully', true, null);
    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'FAILED_DEACTIVATE_CUSTOMER',
            }
        })
    }
}

export const customerResolvers = {
    Query: {
        getCustomer,
        getCustomerByUserId
    },
    Mutation: {
        createCustomer,
        updateCustomer,
        deactivateCustomer
    }
}