import { CustomerService } from '../../services/customer.service';
import { handleError } from '../../utils/errors.util';

// ===== QUERY RESOLVERS =====
export const getCustomer = async (parent: any, args: any, context: any) => {
  const customerService = new CustomerService(context.em);
  return await customerService.getCustomer(args.stripeCustomerId);
};

export const getCustomerByUserId = async (
  parent: any,
  args: any,
  context: any
) => {
  try {
    const customerService = new CustomerService(context.em);
    return await customerService.getCustomerByUserId(args.userId);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== MUTATION RESOLVERS =====
export const createCustomer = async (parent: any, args: any, context: any) => {
  try {
    const customerService = new CustomerService(context.em);
    return await customerService.createCustomer(args.customer);
  } catch (error: any) {
    return handleError(error);
  }
};

export const updateCustomer = async (parent: any, args: any, context: any) => {
  try {
    const customerService = new CustomerService(context.em);
    return await customerService.updateCustomer(args.customer);
  } catch (error: any) {
    return handleError(error);
  }
};

export const deactivateCustomer = async (
  parent: any,
  args: any,
  context: any
) => {
  try {
    const customerService = new CustomerService(context.em);
    return await customerService.deactivateCustomer(args.stripeCustomerId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const customerResolvers = {
  Query: {
    getCustomer,
    getCustomerByUserId,
  },
  Mutation: {
    createCustomer,
    updateCustomer,
    deactivateCustomer,
  },
};
