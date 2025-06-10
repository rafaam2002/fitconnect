import { Seeder } from "@mikro-orm/seeder";
import { EntityManager } from "@mikro-orm/core";
import { PlanFactory } from "../factories/PlanFactory";
import { Plan } from "../entities/Plan";
import { PaymentType } from "../types/enums";

export class PlanSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const basicPlan = em.create(Plan, {
      name: "Basic",
      price: 35,
      icon: "book",
      paymentType: PaymentType.MENSUAL,
      currency: "EUR",
      description: "Plan básico con acceso a funcionalidades esenciales.",
      features: ["Acceso a la plataforma", "funcionalidades básicas"],
    });

    const proPlan = em.create(Plan, {
      name: "Premium",
      icon: "book",
      currency: "EUR",
      paymentType: PaymentType.MENSUAL,
      price: 40,
      description: "Plan premium con acceso a todas las funcionalidades.",
      features: [
        "Funcionalidades plan básico",
        "reserva prioritaria de clases",
        "seguimiento físico personalizado",
      ],
    });
    const basicPlanAnual = em.create(Plan, {
      name: "Basic Anual",
      price: 420,
      icon: "book",
      paymentType: PaymentType.ANUAL,
      currency: "EUR",
      description: "Plan básico con acceso a funcionalidades esenciales.",
      features: ["Acceso a la plataforma", "funcionalidades básicas"],
    });

    const proPlanAnual = em.create(Plan, {
      name: "Premium Anual",
      icon: "book",
      currency: "EUR",
      paymentType: PaymentType.MENSUAL,
      price: 480,
      description: "Plan premium con acceso a todas las funcionalidades.",
      features: [
        "Funcionalidades plan básico",
        "reserva prioritaria de clases",
        "seguimiento físico personalizado",
      ],
    });

    await em.persistAndFlush([
      basicPlan,
      proPlan,
      basicPlanAnual,
      proPlanAnual,
    ]);
  }
}
