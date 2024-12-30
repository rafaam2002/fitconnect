import {EntityManager} from "@mikro-orm/core";
import {Plan} from "../../../entities/Plan";

const getPlans = async (_, args: any, {em}: { em: EntityManager }) => {
    const {planId} = args

    if (planId) {
        const plan = await em.findOne(Plan, {id: planId})

        if (plan) {
            return {
                success: true,
                code: "200",
                message: 'Planes fetched successfully',
                plan
            }
        } else {
            return {
                success: false,
                code: "404",
                message: 'No se encontró el plan',
                plan: null
            }
        }
    }

    return {
        success: true,
        code: "200",
        message: 'Planes fetched successfully',
        plans:  await em.find(Plan, {})
    }
}

export {
    getPlans
}
