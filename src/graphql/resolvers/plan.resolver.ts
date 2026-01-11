import { PlanService } from '../../services/plan.service';
import { handleError } from '../../utils/errors.util';
import { ContextProps } from '../../types/resolvers';

// ===== QUERY RESOLVERS =====
export const getPlan = async (_: any, args: any, context: ContextProps) => {
  const { em } = context;

  try {
    const planService = new PlanService(em);

    return await planService.getPlan(args.planId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getPlanByStripeId = async (
  _: any,
  args: any,
  context: ContextProps
) => {
  const { em } = context;
  try {
    const planService = new PlanService(em);

    return await planService.getPlanByStripeId(args.stripePriceId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const listPlans = async (_: any, args: any, context: ContextProps) => {
  const { em } = context;
  try {
    const planService = new PlanService(em);
    const onlyActive = args.onlyActive !== undefined ? args.onlyActive : true;

    return await planService.listPlans(onlyActive);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== MUTATION RESOLVERS =====

export const createPlan = async (_: any, args: any, context: ContextProps) => {
  const { em, currentUser } = context;
  try {
    const planService = new PlanService(em);

    return await planService.createPlan({
      ...args.plan,
      companyId: currentUser.activeCompanyId,
    });
  } catch (error: any) {
    return handleError(error);
  }
};

export const updatePlan = async (_: any, args: any, context: ContextProps) => {
  const { em } = context;
  try {
    const planService = new PlanService(em);

    return await planService.updatePlan(args.plan);
  } catch (error: any) {
    return handleError(error);
  }
};

export const removePlan = async (_: any, args: any, context: any) => {
  try {
    const planService = new PlanService(context.em);

    return await planService.deactivatePlan(args.planId);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== EXPORT RESOLVERS OBJECT =====
export const planResolvers = {
  Query: {
    getPlan,
    getPlanByStripeId,
    listPlans,
  },

  Mutation: {
    createPlan,
    updatePlan,
    removePlan,
  },
};
