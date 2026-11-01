import {
  buildDeliveryFixture,
  buildOrderDeliveryFixture,
  buildOrderFixture,
} from '@/tests/fixtures/sales';
import { type DeliveryMethod, type DeliveryStatus, type OrderStatus } from '@/types/sales';
import { getDeliveryActions, getOrderActions, isHoldEndingSoon } from '@/utils/salesRules';

const none = {
  canConfirm: false,
  canCancel: false,
  canDispatch: false,
  canComplete: false,
  isCompleteReady: false,
  canSetFee: false,
};

describe('getOrderActions', () => {
  it('allows nothing without permission', () => {
    const statuses: OrderStatus[] = [
      'pending',
      'confirmed',
      'dispatched',
      'completed',
      'cancelled',
    ];
    for (const status of statuses) {
      expect(getOrderActions(buildOrderFixture({ status }), false)).toEqual(none);
    }
  });

  it('lets a pending order be confirmed, cancelled or given a fee', () => {
    expect(getOrderActions(buildOrderFixture({ status: 'pending' }), true)).toEqual({
      ...none,
      canConfirm: true,
      canCancel: true,
      canSetFee: true,
    });
  });

  it('lets a confirmed order be dispatched, cancelled or given a fee', () => {
    expect(getOrderActions(buildOrderFixture({ status: 'confirmed' }), true)).toEqual({
      ...none,
      canDispatch: true,
      canCancel: true,
      canSetFee: true,
    });
  });

  it('shows complete on a dispatched order but only ready once delivered', () => {
    const outForDelivery = buildOrderFixture({
      status: 'dispatched',
      delivery: buildOrderDeliveryFixture({ status: 'in_transit' }),
    });
    expect(getOrderActions(outForDelivery, true)).toEqual({ ...none, canComplete: true });

    const delivered = buildOrderFixture({
      status: 'dispatched',
      delivery: buildOrderDeliveryFixture({ status: 'delivered' }),
    });
    expect(getOrderActions(delivered, true)).toEqual({
      ...none,
      canComplete: true,
      isCompleteReady: true,
    });
  });

  it('is not complete-ready when a dispatched order has no delivery', () => {
    const order = buildOrderFixture({ status: 'dispatched', delivery: null });
    expect(getOrderActions(order, true).isCompleteReady).toBe(false);
  });

  it('allows cancelling a dispatched order only after the delivery failed or returned', () => {
    const statuses: DeliveryStatus[] = [
      'preparing',
      'dispatched',
      'in_transit',
      'delivered',
      'failed',
      'returned',
      'cancelled',
    ];
    for (const status of statuses) {
      const order = buildOrderFixture({
        status: 'dispatched',
        delivery: buildOrderDeliveryFixture({ status }),
      });
      expect(getOrderActions(order, true).canCancel).toBe(
        status === 'failed' || status === 'returned',
      );
    }
  });

  it('allows nothing on final orders', () => {
    expect(getOrderActions(buildOrderFixture({ status: 'completed' }), true)).toEqual(none);
    expect(getOrderActions(buildOrderFixture({ status: 'cancelled' }), true)).toEqual(none);
  });
});

describe('getDeliveryActions', () => {
  const noDeliveryActions = {
    canMarkInTransit: false,
    canMarkDelivered: false,
    canMarkFailed: false,
    canRetry: false,
    canMarkReturned: false,
    canEditTracking: false,
    canAddNote: false,
  };

  function actionsFor(status: DeliveryStatus, method: DeliveryMethod, canManage = true) {
    return getDeliveryActions(buildDeliveryFixture({ status, method }), canManage);
  }

  it('allows nothing without permission', () => {
    expect(actionsFor('dispatched', 'courier', false)).toEqual(noDeliveryActions);
  });

  it('preparing: edit tracking (courier only) and notes', () => {
    expect(actionsFor('preparing', 'courier')).toEqual({
      ...noDeliveryActions,
      canEditTracking: true,
      canAddNote: true,
    });
    expect(actionsFor('preparing', 'pickup')).toEqual({ ...noDeliveryActions, canAddNote: true });
  });

  it('dispatched: in transit only for courier, delivered, failed, notes', () => {
    expect(actionsFor('dispatched', 'courier')).toEqual({
      ...noDeliveryActions,
      canMarkInTransit: true,
      canMarkDelivered: true,
      canMarkFailed: true,
      canAddNote: true,
    });
    expect(actionsFor('dispatched', 'pickup')).toEqual({
      ...noDeliveryActions,
      canMarkDelivered: true,
      canMarkFailed: true,
      canAddNote: true,
    });
  });

  it('in transit: delivered, failed, notes', () => {
    for (const method of ['courier', 'pickup'] as const) {
      expect(actionsFor('in_transit', method)).toEqual({
        ...noDeliveryActions,
        canMarkDelivered: true,
        canMarkFailed: true,
        canAddNote: true,
      });
    }
  });

  it('failed: retry, returned, notes, and tracking for courier', () => {
    expect(actionsFor('failed', 'courier')).toEqual({
      ...noDeliveryActions,
      canRetry: true,
      canMarkReturned: true,
      canEditTracking: true,
      canAddNote: true,
    });
    expect(actionsFor('failed', 'pickup')).toEqual({
      ...noDeliveryActions,
      canRetry: true,
      canMarkReturned: true,
      canAddNote: true,
    });
  });

  it('final statuses allow nothing', () => {
    for (const status of ['delivered', 'returned', 'cancelled'] as const) {
      for (const method of ['courier', 'pickup'] as const) {
        expect(actionsFor(status, method)).toEqual(noDeliveryActions);
      }
    }
  });
});

describe('isHoldEndingSoon', () => {
  const now = new Date('2026-10-18T12:00:00Z');
  const hoursFromNow = (hours: number) => new Date(now.getTime() + hours * 3_600_000).toISOString();

  it('is true within six hours', () => {
    expect(isHoldEndingSoon(hoursFromNow(5), now)).toBe(true);
  });

  it('is false beyond six hours', () => {
    expect(isHoldEndingSoon(hoursFromNow(7), now)).toBe(false);
  });

  it('is false once past', () => {
    expect(isHoldEndingSoon(hoursFromNow(-1), now)).toBe(false);
  });

  it('is false without a hold', () => {
    expect(isHoldEndingSoon(null, now)).toBe(false);
  });
});
