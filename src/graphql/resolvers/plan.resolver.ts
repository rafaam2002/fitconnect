import {PlanService} from "../../services/PlanService";
import {CustomResponse} from "./errors";
import {GraphQLError} from "graphql";

// ===== QUERY RESOLVERS =====
export const getPlan = async (parent: any, args: any, context: any) => {
    const planService = new PlanService(context.em);
    const plan = await planService.getPlan(args.planId);

    return CustomResponse(200, 'Plan is fetched successfully.', true, {plan});
}

export const getPlanByStripeId = async (parent: any, args: any, context: any) => {
    const planService = new PlanService(context.em);
    const plan = await planService.getPlanByStripeId(args.stripePriceId);

    return CustomResponse(200, 'Plan is fetched successfully.', true, {plan});
}

export const listPlans = async (parent: any, args: any, context: any) => {
    const planService = new PlanService(context.em);
    const onlyActive = args.onlyActive !== undefined ? args.onlyActive : true;
    const plans = await planService.listPlans(onlyActive);

    return CustomResponse(200, 'Plans are fetched successfully.', true, {plans});
}

// ===== MUTATION RESOLVERS =====

export const createPlan = async (parent: any, args: any, context: any) => {
    try {
        const planService = new PlanService(context.em);
        const plan = await planService.createPlan(args.plan);

        return CustomResponse(200, 'Plan created successfully.', true, {plan});

    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'FAILED_CREATE_PLAN',
            }
        })
    }
}

export const updatePlan = async (parent: any, args: any, context: any) => {
    try {
        const planService = new PlanService(context.em);
        const plan = await planService.updatePlan(args.plan);

        return CustomResponse(200, 'Plan updated successfully.', true, {plan});
    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'FAILED_UPDATE_PLAN',
            }
        })
    }
}

export const removePlan = async (parent: any, args: any, context: any) => {
    try {
        const planService = new PlanService(context.em);
        const plan = await planService.deactivatePlan(args.planId);

        return CustomResponse(200, 'Plan deactivated successfully', true, {plan})

    } catch (error: any) {
        return new GraphQLError(error.message, {
            extensions: {
                code: 'FAILED_DELETE_PLAN',
            }
        })
    }
}

// ===== EXPORT RESOLVERS OBJECT =====
export const planResolvers = {
    Query: {
        getPlan,
        getPlanByStripeId,
        listPlans
    },

    Mutation: {
        createPlan,
        updatePlan,
        removePlan
    }
};