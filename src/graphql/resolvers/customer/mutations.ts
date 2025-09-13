import {CustomerService} from "../../../services/CustomerService";

export const createCustomer = async (parent: any, args: any, context: any) => {
    try {
        const customerService = new CustomerService(context.em);
        const customer = await customerService.createCustomer(args.customer);

        return {
            success: true,
            message: 'Customer created successfully',
            customer,
            errors: []
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to create customer',
            customer: null,
            errors: [error.message]
        };
    }
}

export const updateCustomer = async (parent: any, args: any, context: any) => {
    try {
        const customerService = new CustomerService(context.em);
        const customer = await customerService.updateCustomer(args.input);

        return {
            success: true,
            message: 'Customer updated successfully',
            customer,
            errors: []
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to update customer',
            customer: null,
            errors: [error.message]
        };
    }
}

export const deactivateCustomer = async (parent: any, args: any, context: any) => {
    try {
        const customerService = new CustomerService(context.em);
        await customerService.deactivateCustomer(args.stripeCustomerId);

        return {
            success: true,
            message: 'Customer deactivated successfully',
            customer: null,
            errors: []
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Failed to deactivate customer',
            customer: null,
            errors: [error.message]
        };
    }
}