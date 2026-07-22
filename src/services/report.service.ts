import { SqlEntityManager } from '@mikro-orm/postgresql';

import { CurrentUser, ServiceResponse } from '../types/common.type';
import { UserRoleEnum } from '../types/enums';
import {
  createServiceResponse,
  ForbiddenError,
  UnauthorizedError,
} from '../utils/errors.util';

const AGE_RANGES: { range: string; min: number; max: number | null }[] = [
  { range: '18-25', min: 18, max: 25 },
  { range: '26-35', min: 26, max: 35 },
  { range: '36-45', min: 36, max: 45 },
  { range: '46+', min: 46, max: null },
];

export class ReportService {
  public async getReportMetrics(
    em: SqlEntityManager,
    currentUser: CurrentUser
  ): Promise<ServiceResponse> {
    if (!currentUser) throw new UnauthorizedError();
    if (currentUser.contextRole !== UserRoleEnum.ADMIN)
      throw new ForbiddenError();

    const knex = em.getKnex();
    const companyId = currentUser.activeCompanyId;

    const [
      userTotals,
      newUsersByMonth,
      churnedUsersByMonth,
      usersByAgeRange,
      revenue,
      productsSold,
      promotionsApplied,
      promotionsAppliedByMonth,
    ] = await Promise.all([
      this.getUserTotals(knex, companyId),
      this.getUsersByMonth(knex, companyId, 'created_at'),
      this.getUsersByMonth(knex, companyId, 'churned_at'),
      this.getUsersByAgeRange(knex, companyId),
      this.getRevenue(knex, companyId),
      this.getProductsSold(knex, companyId),
      this.getPromotionsApplied(knex, companyId),
      this.getPromotionsAppliedByMonth(knex, companyId),
    ]);

    const metrics = {
      totalUsers: userTotals.totalUsers,
      churnedUsers: userTotals.churnedUsers,
      newUsersByMonth,
      churnedUsersByMonth,
      usersByAgeRange,
      totalRevenue: revenue.total,
      revenueByMonth: revenue.byMonth,
      productsSold,
      promotionsApplied,
      promotionsAppliedByMonth,
    };

    return createServiceResponse(200, 'Report metrics found', true, {
      metrics,
    });
  }

  private async getUserTotals(knex: any, companyId?: string | null) {
    const [result] = await knex('user as u')
      .join('user_role as ur', 'u.id', 'ur.user_id')
      .where('ur.company_id', companyId)
      .select([
        knex.raw('COUNT(DISTINCT u.id) as totalusers'),
        // "Baja" = un admin marcó al usuario como inactivo (is_active = false),
        // no is_blocked — bloquear es una restricción de acceso distinta.
        knex.raw(
          'COUNT(DISTINCT CASE WHEN u.is_active = false THEN u.id END) as churnedusers'
        ),
      ]);

    return {
      totalUsers: Number(result.totalusers) || 0,
      churnedUsers: Number(result.churnedusers) || 0,
    };
  }

  private async getUsersByMonth(
    knex: any,
    companyId: string | null | undefined,
    dateColumn: 'created_at' | 'churned_at'
  ) {
    const rows = await knex('user as u')
      .join('user_role as ur', 'u.id', 'ur.user_id')
      .where('ur.company_id', companyId)
      .whereNotNull(`u.${dateColumn}`)
      .select([
        knex.raw(`to_char(date_trunc('month', u.${dateColumn}), 'YYYY-MM') as month`),
        knex.raw('COUNT(DISTINCT u.id) as count'),
      ])
      .groupBy('month')
      .orderBy('month', 'asc');

    return rows.map((row: any) => ({
      month: row.month,
      count: Number(row.count) || 0,
    }));
  }

  private async getUsersByAgeRange(knex: any, companyId?: string | null) {
    const rows = await knex('user as u')
      .join('user_role as ur', 'u.id', 'ur.user_id')
      .where('ur.company_id', companyId)
      .whereNotNull('u.birth_date')
      .select([
        knex.raw('EXTRACT(YEAR FROM AGE(u.birth_date)) as age'),
      ]);

    const counts = AGE_RANGES.map(bucket => ({ range: bucket.range, count: 0 }));
    rows.forEach((row: any) => {
      const age = Number(row.age);
      const bucketIndex = AGE_RANGES.findIndex(
        bucket => age >= bucket.min && (bucket.max === null || age <= bucket.max)
      );
      if (bucketIndex >= 0) counts[bucketIndex].count += 1;
    });

    return counts;
  }

  /**
   * Ingresos: si la empresa tiene transacciones exitosas registradas, se usan
   * esas (fuente de verdad real). Si no —caso por defecto hoy, porque el flujo
   * de cobro todavía no está en producción para la mayoría de empresas— se
   * estiman a partir de las suscripciones activas × precio del plan, agrupadas
   * por el mes de alta de cada suscripción (no hay histórico de "activo en el
   * mes X", así que el mes de alta es la mejor aproximación disponible).
   */
  private async getRevenue(
    knex: any,
    companyId?: string | null
  ): Promise<{ total: number; byMonth: { month: string; amount: number }[] }> {
    const [txCount] = await knex('transaction')
      .where('company_id', companyId)
      .where('status', 'succeeded')
      .select([knex.raw('COUNT(*) as count')]);

    if (Number(txCount.count) > 0) {
      const [totalRow] = await knex('transaction')
        .where('company_id', companyId)
        .where('status', 'succeeded')
        .select([knex.raw('COALESCE(SUM(amount), 0) as total')]);

      const byMonthRows = await knex('transaction')
        .where('company_id', companyId)
        .where('status', 'succeeded')
        .select([
          knex.raw("to_char(date_trunc('month', created_at), 'YYYY-MM') as month"),
          knex.raw('SUM(amount) as amount'),
        ])
        .groupBy('month')
        .orderBy('month', 'asc');

      return {
        total: Number(totalRow.total) / 100,
        byMonth: byMonthRows.map((row: any) => ({ month: row.month, amount: Number(row.amount) / 100 })),
      };
    }

    // El precio "real" de un plan a veces vive en plan.amount y a veces (cuando
    // ese campo quedó en 0) en plan.metadata.price — ambos en centavos.
    const planPriceExpr = "COALESCE(NULLIF(p.amount, 0), (p.metadata->>'price')::numeric, 0)";

    const [totalRow] = await knex('subscription as s')
      .join('plan as p', 's.plan_id', 'p.id')
      .where('s.company_id', companyId)
      .where('s.status', 'active')
      .select([knex.raw(`COALESCE(SUM(${planPriceExpr}), 0) as total`)]);

    const byMonthRows = await knex('subscription as s')
      .join('plan as p', 's.plan_id', 'p.id')
      .where('s.company_id', companyId)
      .where('s.status', 'active')
      .select([
        knex.raw("to_char(date_trunc('month', s.created_at), 'YYYY-MM') as month"),
        knex.raw(`SUM(${planPriceExpr}) as amount`),
      ])
      .groupBy('month')
      .orderBy('month', 'asc');

    return {
      total: Number(totalRow.total) / 100,
      byMonth: byMonthRows.map((row: any) => ({ month: row.month, amount: Number(row.amount) / 100 })),
    };
  }

  private async getProductsSold(knex: any, companyId?: string | null) {
    const [result] = await knex('product_purchase')
      .where('company_id', companyId)
      .select([knex.raw('COALESCE(SUM(quantity), 0) as total')]);

    return Number(result.total) || 0;
  }

  /**
   * No existe todavía un flujo que registre "canjes" de promoción — se usa
   * la propia tabla de promociones: "aplicadas" = actualmente activas
   * (visibles/en vigor para los usuarios), y "por mes" = dadas de alta por
   * mes, igual que el resto de métricas de altas.
   */
  private async getPromotionsApplied(knex: any, companyId?: string | null) {
    const [result] = await knex('promotion')
      .where('company_id', companyId)
      .where('is_active', true)
      .select([knex.raw('COUNT(*) as total')]);

    return Number(result.total) || 0;
  }

  private async getPromotionsAppliedByMonth(knex: any, companyId?: string | null) {
    const rows = await knex('promotion')
      .where('company_id', companyId)
      .select([
        knex.raw("to_char(date_trunc('month', created_at), 'YYYY-MM') as month"),
        knex.raw('COUNT(*) as count'),
      ])
      .groupBy('month')
      .orderBy('month', 'asc');

    return rows.map((row: any) => ({
      month: row.month,
      count: Number(row.count) || 0,
    }));
  }
}
