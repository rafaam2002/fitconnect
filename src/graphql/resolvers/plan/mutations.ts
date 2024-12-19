import {EntityManager} from "@mikro-orm/core";
import {User} from "../../../entities/User";
import {Plan} from "../../../entities/Plan";

const addPlan = async(_: any, args: any, { em, currentUser }: { em: EntityManager, currentUser: User }) => {
    if (!currentUser) {
        return {
            success: false,
            code: "400",
            message: "Please login",
            plan: null,
        };
    }
    if (currentUser.rol !== "boss") {
        return {
            success: false,
            code: "400",
            message: "You are not authorized to perform this action",
            plan: null,
        };
    }

    let newPlan: Plan  = em.create(Plan,{ ...args.subscription});

    await em.persistAndFlush(newPlan);

    if (!newPlan.id)
        return {
            success: false,
            code: "400",
            message: "Plan not created",
            plan: null
        };

    return {
        succes:true,
        code: '201',
        message: 'Plan was created successfully',
        plan: newPlan
    }
}

const updatePlan = async(_: any, args: any, { em, currentUser }: { em: EntityManager, currentUser: User }) => {
    const {plan} = args

    if (!currentUser) {
        return {
            success: false,
            code: "400",
            message: "Please login",
            plan: null,
        };
    }

    if(!plan.id) {
        return {
            success: false,
            code: "404",
            message: "Plan was not found",
            plan: null,
        };
    }

    let updatedPlan: Plan = await em.findOne(Plan,{id: plan.id}, {...plan});

    await em.persistAndFlush(updatedPlan);

    if (!updatedPlan.id )
        return {
            success: false,
            code: "400",
            message: "Plan was not created",
            plan: null
        };

    return {
        succes:true,
        code: '201',
        message: 'Plan was updated successfully',
        plan: updatedPlan
    }
}

const unsuscribePlan = async(_: any, args: any, { em, currentUser }: { em: EntityManager, currentUser: User }) => {
    const {plan} = args

    if (!currentUser) {
        return {
            success: false,
            code: "400",
            message: "Please login",
            plan: null,
        };
    }

    if(!plan.id) {
        return {
            success: false,
            code: "404",
            message: "Plan was not found",
            plan: null,
        };
    }

    await em.removeAndFlush(plan);

    if (!plan)
        return {
            succes:true,
            code: '201',
            message: 'Plan was deleted successfully',
            plan: plan
        }

     return {
        success: false,
        code: "400",
        message: "Plan was not deleted",
        plan: null
    };
}

export {
    addPlan,
    updatePlan,
    unsuscribePlan
}
