import {PlanService} from "../../services/plan.service";
import {GraphQLError} from "graphql";
import {handleError} from "../../utils/errors.util";

// ===== QUERY RESOLVERS =====
export const getPlan = async (parent: any, args: any, context: any) => {
    try {
        const planService = new PlanService(context.em);

        return await planService.getPlan(args.planId);
    } catch (error: any) {
        return handleError(error)
    }
};

export const getPlanByStripeId = async (
    parent: any,
    args: any,
    context: any
) => {
    try {
        const planService = new PlanService(context.em);

        return await planService.getPlanByStripeId(args.stripePriceId);
    } catch (error: any) {
        return handleError(error)
    }
};

export const listPlans = async (parent: any, args: any, context: any) => {
    try {
        const planService = new PlanService(context.em);
        const onlyActive = args.onlyActive !== undefined ? args.onlyActive : true;

        return await planService.listPlans(onlyActive);
    } catch (error: any) {
        return handleError(error)
    }

};

// ===== MUTATION RESOLVERS =====

export const createPlan = async (parent: any, args: any, context: any) => {
    try {
        const planService = new PlanService(context.em);

        return await planService.createPlan({
            ...args.plan,
            companyId: context.currentUser?.activeCompanyId,
        });

    } catch (error: any) {
        return handleError(error)
    }
};

export const updatePlan = async (parent: any, args: any, context: any) => {
    try {
        const planService = new PlanService(context.em);

        return await planService.updatePlan(args.plan);
    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: "FAILED_UPDATE_PLAN",
            },
        });
    }
};

export const removePlan = async (parent: any, args: any, context: any) => {
    try {
        const planService = new PlanService(context.em);

        return await planService.deactivatePlan(args.planId);
    } catch (error: any) {
        return handleError(error)
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
