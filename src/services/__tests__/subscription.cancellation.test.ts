import moment from 'moment';

import { Subscription, SubscriptionStatus } from '../../entities/Subscription';
import {
  BadRequestError,
  ForbiddenError,
  BAD_REQUEST_ERRORS,
} from '../../utils/errors.util';
import { subscriptionResolvers } from '../../graphql/resolvers/subscription.resolver';
import { SubscriptionService } from '../subscription.service';

/**
 * Tests de los seams de cancelación de SubscriptionService — issue #4
 * (deferred-only cancellation + admin radical cancel; remove Vertiente 3).
 *
 * Sigue el prior art de subscription.service.test.ts / schedule.service.test.ts:
 * EntityManager + procesador de pago mockeados, y las aserciones son sobre la
 * ServiceResponse devuelta y el estado de la entidad, nunca sobre qué rama
 * interna se eligió.
 */
describe('SubscriptionService — cancellation seams', () => {
  let service: SubscriptionService;
  let mockEm: any;
  let subscription: any;

  function buildSubscription(overrides: Record<string, any> = {}) {
    const periodEnd = moment().add(15, 'days').toDate();
    return {
      id: 'sub-1',
      status: SubscriptionStatus.ACTIVE,
      // isActive es un getter en la entidad real; en el mock lo exponemos plano.
      isActive: true,
      company: 'comp-1',
      currentPeriodEnd: periodEnd,
      nextBillingDate: periodEnd,
      canceledAt: undefined,
      endedAt: undefined,
      cancelAtPeriodEnd: false,
      failedPaymentAttempts: 0,
      metadata: {},
      plan: { id: 'plan-1', name: 'Premium', amount: 5000 },
      user: { id: 'user-1' },
      ...overrides,
    };
  }

  beforeEach(() => {
    subscription = buildSubscription();

    mockEm = {
      findOne: jest.fn(async (entity: any) => {
        if (entity === Subscription) return subscription;
        return null;
      }),
      find: jest.fn(async () => []),
      flush: jest.fn(async () => {}),
      refresh: jest.fn(async () => {}),
      persist: jest.fn(),
      create: jest.fn((_e: any, data: any) => ({ ...data })),
    };

    service = new SubscriptionService(mockEm as any, {} as any);
  });

  // ─────────────────────────────────────────────
  // 1) Cancelación estándar: SIEMPRE diferida
  // ─────────────────────────────────────────────
  describe('cancelSubscription — always deferred', () => {
    it('defers even when the input explicitly requests immediate cancellation', async () => {
      const originalStatus = subscription.status;
      const originalEnd = subscription.currentPeriodEnd;

      const response = await service.cancelSubscription({
        subscriptionId: 'sub-1',
        cancelAtPeriodEnd: false, // pide inmediata; debe ignorarse
        cancellationReason: 'changed my mind',
      });

      expect(response.success).toBe(true);
      // Difiere: marca el flag y deja status/currentPeriodEnd intactos.
      expect(subscription.cancelAtPeriodEnd).toBe(true);
      expect(subscription.status).toBe(originalStatus);
      expect(subscription.currentPeriodEnd).toBe(originalEnd);
      // No se cancela de inmediato: sin canceledAt/endedAt.
      expect(subscription.canceledAt).toBeUndefined();
      expect(subscription.endedAt).toBeUndefined();
    });

    it('records a cancel_scheduled history entry and keeps the reason', async () => {
      await service.cancelSubscription({
        subscriptionId: 'sub-1',
        cancellationReason: 'too expensive',
      });

      const history = subscription.metadata.history as any[];
      expect(history.some(h => h.event === 'cancel_scheduled')).toBe(true);
      expect(subscription.metadata.cancellation_reason).toBe('too expensive');
    });

    it('rejects when the subscription is not active', async () => {
      subscription = buildSubscription({
        status: SubscriptionStatus.CANCELED,
        isActive: false,
      });

      await expect(
        service.cancelSubscription({ subscriptionId: 'sub-1' })
      ).rejects.toThrow(BAD_REQUEST_ERRORS.SUBSCRIPTION_NOT_ACTIVE);
    });
  });

  // ─────────────────────────────────────────────
  // 2) Cancelación radical (admin): trunca el período
  // ─────────────────────────────────────────────
  describe('radicalCancelSubscription — immediate truncation', () => {
    it('sets CANCELED with canceledAt/endedAt/currentPeriodEnd = now and clears nextBillingDate', async () => {
      const before = Date.now();

      const response = await service.radicalCancelSubscription(
        { subscriptionId: 'sub-1', reason: 'fraud' },
        'admin-9'
      );

      const after = Date.now();

      expect(response.success).toBe(true);
      expect(subscription.status).toBe(SubscriptionStatus.CANCELED);
      expect(subscription.nextBillingDate).toBeUndefined();
      expect(subscription.cancelAtPeriodEnd).toBe(false);

      for (const d of [
        subscription.canceledAt,
        subscription.endedAt,
        subscription.currentPeriodEnd,
      ]) {
        expect(d).toBeInstanceOf(Date);
        expect(d.getTime()).toBeGreaterThanOrEqual(before);
        expect(d.getTime()).toBeLessThanOrEqual(after);
      }
      // El invariante se mantiene: currentPeriodEnd <= now.
      expect(subscription.currentPeriodEnd.getTime()).toBeLessThanOrEqual(
        Date.now()
      );
    });

    it('records the mandatory reason in history attributed to the admin', async () => {
      await service.radicalCancelSubscription(
        { subscriptionId: 'sub-1', reason: 'abuse of service' },
        'admin-9'
      );

      const history = subscription.metadata.history as any[];
      const entry = history.find(h => h.event === 'radical_canceled');
      expect(entry).toBeDefined();
      expect(entry.actor).toBe('admin-9');
      expect(entry.detail).toContain('abuse of service');
      expect(subscription.metadata.cancellation_reason).toBe(
        'abuse of service'
      );
    });

    it('requires a reason', async () => {
      await expect(
        service.radicalCancelSubscription(
          { subscriptionId: 'sub-1', reason: '' },
          'admin-9'
        )
      ).rejects.toThrow(BAD_REQUEST_ERRORS.REASON_REQUIRED);
    });
  });

  // ─────────────────────────────────────────────
  // 3) Gate de permisos en el seam del resolver
  // ─────────────────────────────────────────────
  describe('radicalCancelSubscription — resolver permission gate', () => {
    it('rejects a caller without the admin permission', async () => {
      const context: any = {
        currentUser: { id: 'user-1', permissionNames: [] },
      };

      await expect(
        (subscriptionResolvers.Mutation as any).radicalCancelSubscription(
          {},
          { input: { subscriptionId: 'sub-1', reason: 'x' } },
          context,
          {}
        )
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  // ─────────────────────────────────────────────
  // 4) adminOverride ya no puede transicionar a CANCELED
  // ─────────────────────────────────────────────
  describe('adminOverride — no CANCELED transition', () => {
    it('rejects a status override to CANCELED', async () => {
      await expect(
        service.adminOverride({
          subscriptionId: 'sub-1',
          status: SubscriptionStatus.CANCELED,
          reason: 'trying to cancel',
          adminId: 'admin-9',
        })
      ).rejects.toThrow(BAD_REQUEST_ERRORS.ADMIN_OVERRIDE_CANNOT_CANCEL);

      // No se muta el estado al rechazar.
      expect(subscription.status).toBe(SubscriptionStatus.ACTIVE);
    });

    it('still applies other overrides (non-CANCELED status change)', async () => {
      subscription = buildSubscription({ status: SubscriptionStatus.PAST_DUE });

      const response = await service.adminOverride({
        subscriptionId: 'sub-1',
        status: SubscriptionStatus.ACTIVE,
        reason: 'manual reactivation',
        adminId: 'admin-9',
      });

      expect(response.success).toBe(true);
      expect(subscription.status).toBe(SubscriptionStatus.ACTIVE);
      const history = subscription.metadata.history as any[];
      expect(history.some(h => h.event === 'admin_override')).toBe(true);
    });

    it('still applies non-status overrides (resetFailedAttempts)', async () => {
      subscription = buildSubscription({ failedPaymentAttempts: 3 });

      const response = await service.adminOverride({
        subscriptionId: 'sub-1',
        resetFailedAttempts: true,
        reason: 'goodwill',
        adminId: 'admin-9',
      });

      expect(response.success).toBe(true);
      expect(subscription.failedPaymentAttempts).toBe(0);
    });
  });

  // ─────────────────────────────────────────────
  // 5) Regresión del CRON: cancelación diferida al vencer
  // ─────────────────────────────────────────────
  describe('processBillingCycle — deferred cancellation regression', () => {
    it('transitions a due cancelAtPeriodEnd subscription to CANCELED', async () => {
      const dueSub: any = buildSubscription({
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: moment().subtract(1, 'day').toDate(),
      });

      mockEm.find = jest.fn(async (_entity: any, where: any) => {
        // Solo la query de cancelaciones diferidas debe devolver el due sub.
        if (where?.cancelAtPeriodEnd === true) return [dueSub];
        return [];
      });

      await service.processBillingCycle();

      expect(dueSub.status).toBe(SubscriptionStatus.CANCELED);
      expect(dueSub.canceledAt).toBeInstanceOf(Date);
      expect(dueSub.endedAt).toBeInstanceOf(Date);
      expect(dueSub.nextBillingDate).toBeUndefined();
      const history = dueSub.metadata.history as any[];
      expect(history.some(h => h.event === 'canceled')).toBe(true);
    });
  });
});
