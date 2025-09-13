import {CustomerService} from "../../../services/CustomerService";
import {CustomResponse} from "../errors";

export const createCustomer = async (parent: any, args: any, context: any) => {
    try {
        const customerService = new CustomerService(context.em);
        const customer = await customerService.createCustomer(args.customer);

        return CustomResponse(200, 'Customer created successfully', true, customer);
    } catch (error: any) {
        return CustomResponse(500, 'Failed to create customer', false, null);

    }
}

export const updateCustomer = async (parent: any, args: any, context: any) => {
    try {
        const customerService = new CustomerService(context.em);
        const customer = await customerService.updateCustomer(args.customer);

        return CustomResponse(200, 'Customer updated successfully', true, customer);

    } catch (error: any) {
        return CustomResponse(500, 'Failed to update customer', false, null);
    }
}

export const deactivateCustomer = async (parent: any, args: any, context: any) => {
    try {
        const customerService = new CustomerService(context.em);
        const customer = await customerService.deactivateCustomer(args.stripeCustomerId);

        return CustomResponse(200, 'Customer deactivated successfully', true, null);
    } catch (error: any) {
        return CustomResponse(500, 'Failed to deactivate customer', false, null);
    }
}