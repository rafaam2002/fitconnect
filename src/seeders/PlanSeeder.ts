import {Seeder} from "@mikro-orm/seeder";
import {EntityManager} from "@mikro-orm/core";
import {Plan, PlanInterval} from "../entities/Plan";
import {PaymentType} from "../types/enums";

export class PlanSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const basicPlan = em.create(Plan, {
            name: "Basic",
            amount: 35,
            interval: PlanInterval.DAY,
            currency: "EUR",
            description: "Plan básico con acceso a funcionalidades esenciales.",
            features: ["Acceso a la plataforma", "funcionalidades básicas"],
        });

        const proPlan = em.create(Plan, {
            name: "Premium",
            currency: "EUR",
            interval: PlanInterval.MONTH,
            amount: 40,
            description: "Plan premium con acceso a todas las funcionalidades.",
            features: [
                "Funcionalidades plan básico",
                "reserva prioritaria de clases",
                "seguimiento físico personalizado",
            ],
        });
        const basicPlanAnual = em.create(Plan, {
            name: "Basic Anual",
            amount: 420,
            interval: PlanInterval.YEAR,
            currency: "EUR",
            description: "Plan básico con acceso a funcionalidades esenciales.",
            features: ["Acceso a la plataforma", "funcionalidades básicas"],
        });

        const proPlanAnual = em.create(Plan, {
            name: "Premium Anual",
            currency: "EUR",
            interval: PlanInterval.MONTH,
            amount: 480,
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
