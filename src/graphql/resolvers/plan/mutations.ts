import {EntityManager} from "@mikro-orm/core";
import {User} from "../../../entities/User";
import {Plan} from "../../../entities/Plan";

const createPlan = async (_: any, args: any, {em, currentUser}: { em: EntityManager, currentUser: User }) => {

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

    let newPlan: Plan = em.create(Plan, {...args.plan});

    await em.persistAndFlush(newPlan);

    if (!newPlan.id)
        return {
            success: false,
            code: "400",
            message: "Plan not created",
            plan: null
        };

    return {
        success: true,
        code: '201',
        message: 'Plan was created successfully',
        plan: newPlan
    }
}

const updatePlan = async (_: any, args: any, {em, currentUser}: { em: EntityManager, currentUser: User }) => {
    const {planId, plan} = args

    if (!currentUser) {
        return {
            success: false,
            code: "400",
            message: "Please login",
            plan: null,
        };
    }

    if (!planId) {
        return {
            success: false,
            code: "400",
            message: "Faltan parámetros obligatorios",
            plan: null,
        };
    }


    let updatedPlan: Plan = await em.findOne(Plan, {id: planId});

    if (!updatedPlan) {
        return {
            success: false,
            code: "404",
            message: "No se encontró el plan",
            plan: null,
        };
    }

    Object.assign(updatedPlan, {...plan})

    await em.flush();

    if (!updatedPlan.id)
        return {
            success: false,
            code: "400",
            message: "No se pudo crear el plan",
            plan: null
        };

    return {
        success: true,
        code: '201',
        message: 'Plan was updated successfully',
        plan: updatedPlan
    }
}

const removePlan = async (_: any, args: any, {em, currentUser}: { em: EntityManager, currentUser: User }) => {
    const {planId} = args

    if (!currentUser) {
        return {
            success: false,
            code: "400",
            message: "Please login",
            plan: null,
        };
    }

    if (!planId) {
        return {
            success: false,
            code: "400",
            message: "Faltan parámetros obligatorios",
            plan: null,
        };
    }

    const plan = await em.findOne(Plan, {id: planId})

    if (!plan) {
        return {
            success: false,
            code: "404",
            message: "No se encuentra el plan",
            plan: null,
        };
    }

    await em.remove(plan).flush();

    return {
        success: true,
        code: '200',
        message: 'Plan was deleted successfully',
        plan: null
    };
}

export {
    createPlan,
    updatePlan,
    removePlan
}
