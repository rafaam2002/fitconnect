import { PlanService } from '../../services/plan.service';
import { ContextProps } from '../../types/resolvers';
import { handleError } from '../../utils/errors.util';
import { plansPermissions } from '../../utils/permissions';
import { withPermissions } from '../middlewares/permissions';

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
    const onlyActive = args.onlyActive === undefined ? true : args.onlyActive;
    const showGlobal = args.showGlobal === undefined ? false : args.showGlobal;

    return await planService.listPlans(onlyActive, showGlobal);
  } catch (error: any) {
    return handleError(error);
  }
};
// ===== MUTATION RESOLVERS =====

export const createPlan = async (_: any, args: any, context: ContextProps) => {
  const { em, currentUser } = context;
  try {
    const planService = new PlanService(em);
    // const companyId = currentUser.isSuperAdmin
    //   ? null
    //   : currentUser.activeCompanyId;
    const companyId = currentUser.activeCompanyId;

    return await planService.createPlan({
      ...args.plan,
      companyId,
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
    getPlan: withPermissions(plansPermissions.READ, getPlan),
    getPlanByStripeId: withPermissions(
      plansPermissions.READ,
      getPlanByStripeId
    ),
    listPlans,
  },

  Mutation: {
    createPlan: withPermissions(plansPermissions.CREATE, createPlan),
    updatePlan: withPermissions(plansPermissions.UPDATE, updatePlan),
    removePlan: withPermissions(plansPermissions.DELETE, removePlan),
  },
};
