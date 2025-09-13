

export const getCustomer = async(parent: any, args: any, context: any) => {
    const customerService = new CustomerService(context.em);
    return await customerService.getCustomer(args.stripeCustomerId);
}

export const getCustomerByUserId = async(parent: any, args: any, context: any) => {
    const customerService = new CustomerService(context.em);
    return await customerService.getCustomerByUserId(args.userId);
}