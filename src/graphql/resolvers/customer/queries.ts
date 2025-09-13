import {CustomerService} from "../../../services/CustomerService";
import {CustomResponse} from "../errors";


export const getCustomer = async(parent: any, args: any, context: any) => {
    const customerService = new CustomerService(context.em);
    const customer = await customerService.getCustomer(args.stripeCustomerId);

    return CustomResponse(200, 'Customer fetched successfully!', true, {customer});
}

export const getCustomerByUserId = async(parent: any, args: any, context: any) => {
    const customerService = new CustomerService(context.em);
    const customer = await customerService.getCustomerByUserId(args.userId);

    return await CustomResponse(200, 'Customer fetched successfully!', true, {customer});
}