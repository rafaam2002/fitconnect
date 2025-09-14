// src/graphql/resolvers/planResolver.ts

// ===== QUERY RESOLVERS =====

import {PlanService} from "../../../services/PlanService";
import {CustomResponse} from "../errors";

export async function getPlan(parent: any, args: any, context: any) {
    const planService = new PlanService(context.em);
    const plan = await planService.getPlan(args.planId);

    return CustomResponse(200, 'Plan is fetched successfully.', true, {plan});
}

export async function getPlanByStripeId(parent: any, args: any, context: any) {
    const planService = new PlanService(context.em);
    const plan = await planService.getPlanByStripeId(args.stripePriceId);

    return CustomResponse(200, 'Plan is fetched successfully.', true, {plan});
}

export async function listPlans(parent: any, args: any, context: any) {
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
        return CustomResponse(500, 'Failed to create plan.', false, {error: error.message});
    }
}

export const updatePlan = async (parent: any, args: any, context: any) => {
    try {
        const planService = new PlanService(context.em);
        const plan = await planService.updatePlan(args.plan);

        return CustomResponse(200, 'Plan updated successfully.', true, {plan});
    } catch (error: any) {
        return CustomResponse(500, 'Failed to update plan.', true, {error: error.message});
    }
}

export const removePlan = async (parent: any, args: any, context: any) => {
    try {
        const planService = new PlanService(context.em);
        const plan = await planService.deactivatePlan(args.planId);

        return CustomResponse(200, 'Plan deactivated successfully', true, {plan})

    } catch (error: any) {
        return CustomResponse(500, 'Failed to remove plan.', false, {error: error.message});
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