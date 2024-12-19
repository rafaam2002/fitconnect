import {EntityManager} from "@mikro-orm/core";
import {Subscription} from "../../../entities/Plan";

const getSubscriptions = async(_, arg: any, { em }: { em: EntityManager }) => {
    return {
        success: true,
        code: "200",
        message: 'Subscriptions fetched successfully',
        promotions: await em.find(Subscription, {})
    }
}

export {
    getSubscriptions
}
