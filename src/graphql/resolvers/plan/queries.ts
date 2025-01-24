import { Collection, EntityManager } from "@mikro-orm/core";
import { Plan } from "../../../entities/Plan";

const getPlans = async (_, args: any, { em }: { em: EntityManager }) => {
  const { planId } = args;

  if (planId) {
    const plan = await em.findOne(
      Plan,
      { id: planId },
      { populate: ["subscriptions"] }
    );

    if (plan) {
      return {
        success: true,
        code: "200",
        message: "Planes fetched successfully",
        plan,
      };
    }
    return {
      success: false,
      code: "404",
      message: "Plan not found",
      plan: null,
    };
  }
  const plans = await em.findAll(Plan);
  if (plans.length === 0) {
    return {
      success: false,
      code: "404",
      message: "No plans found",
      plans: [],
    };
  }
  return {
    success: true,
    code: "200",
    message: "Planes fetched successfully",
    plans: await em.findAll(Plan),
  };
};

export { getPlans };
