import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { PlanInterval } from '../entities/Plan';
import { CreatePlanInput, PlanService } from '../services/plan.service';

export class PlanSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const planService = new PlanService(em);

    const plan: CreatePlanInput = {
      name: 'Plan Básico',
      description: 'Plan ideal para empezar',
      amount: 999, // €9.99 en centavos
      currency: 'eur',
      interval: PlanInterval.MONTH,
      intervalCount: 1,
      trialPeriodDays: 7,
      features: [
        'Hasta 10 usuarios',
        'Gestión de horarios básica',
        'Soporte por email',
      ],
      metadata: {
        permissions: 'schedules:read,schedules:create,users:read',
        maxUsers: '10',
        supportLevel: 'email',
      },
    };
    await planService.createPlan(plan);
  }
}
