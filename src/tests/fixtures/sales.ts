import {
  type Courier,
  type Delivery,
  type DeliveryListItem,
  type DeliveryTimelineEvent,
  type DeliveryZone,
  type Order,
  type OrderDelivery,
  type OrderLine,
  type OrderListItem,
} from '@/types/sales';
import { buildMoney } from '@/tests/fixtures/catalogue';

export function buildOrderListItemFixture(overrides: Partial<OrderListItem> = {}): OrderListItem {
  return {
    id: 1,
    reference: 'ZN7K-Q4M2-X9TD',
    status: 'pending',
    buyer_name: 'Achieng Otieno',
    buyer_phone: '+254712345678',
    country: 'KE',
    zone_name: 'Nairobi CBD',
    item_count: 1,
    grand_total: buildMoney('5000.00'),
    delivery_fee_pending: false,
    created_at: '2026-10-18T08:30:00+00:00',
    hold_expires_at: '2026-10-19T20:30:00+00:00',
    delivery_status: null,
    ...overrides,
  };
}

export function buildOrderLineFixture(overrides: Partial<OrderLine> = {}): OrderLine {
  return {
    id: 1,
    product_variant_id: 1,
    product_name: 'Ankara wrap dress',
    variant_label: 'Medium / Blue',
    sku: 'ANKARA-WRAP-DRESS-M-BLU',
    quantity: 1,
    unit_price: buildMoney('4500.00'),
    unit_discount: buildMoney('0.00'),
    unit_price_paid: buildMoney('4500.00'),
    line_total: buildMoney('4500.00'),
    ...overrides,
  };
}

export function buildDeliveryEventFixture(
  overrides: Partial<DeliveryTimelineEvent> = {},
): DeliveryTimelineEvent {
  return {
    id: 1,
    type: 'status_changed',
    from_status: null,
    to_status: 'preparing',
    note: null,
    actor_user_id: 1,
    actor: { id: 1, name: 'Wanjiru Kamau' },
    created_at: '2026-10-18T09:00:00+00:00',
    ...overrides,
  };
}

export function buildOrderDeliveryFixture(overrides: Partial<OrderDelivery> = {}): OrderDelivery {
  return {
    id: 1,
    method: 'courier',
    status: 'preparing',
    status_label: 'Preparing',
    courier_name: 'Swift Riders',
    tracking_number: null,
    tracking_url: null,
    dispatched_at: null,
    delivered_at: null,
    failure_reason: null,
    timeline: [buildDeliveryEventFixture()],
    ...overrides,
  };
}

export function buildOrderFixture(overrides: Partial<Order> = {}): Order {
  return {
    ...buildOrderListItemFixture(),
    lines: [buildOrderLineFixture()],
    buyer_email: 'achieng@example.test',
    address: {
      line1: '12 Ngong Road',
      line2: null,
      city: 'Nairobi',
      region: 'Nairobi',
      postal_code: '00100',
    },
    delivery_charge: {
      zone_name: 'Nairobi CBD',
      fee: buildMoney('500.00'),
      source: 'zone',
      pending_quote: false,
    },
    subtotal: buildMoney('4500.00'),
    discount_total: buildMoney('0.00'),
    tax_total: buildMoney('0.00'),
    confirmed_at: null,
    dispatched_at: null,
    completed_at: null,
    cancelled_at: null,
    cancel_reason: null,
    cancelled_by: null,
    updated_at: '2026-10-18T08:30:00+00:00',
    delivery: null,
    ...overrides,
  };
}

export function buildDeliveryListItemFixture(
  overrides: Partial<DeliveryListItem> = {},
): DeliveryListItem {
  return {
    id: 1,
    order_id: 1,
    order_reference: 'ZN7K-Q4M2-X9TD',
    method: 'courier',
    courier_name: 'Swift Riders',
    tracking_number: null,
    status: 'preparing',
    status_label: 'Preparing',
    dispatched_at: null,
    updated_at: '2026-10-18T09:00:00+00:00',
    ...overrides,
  };
}

export function buildDeliveryFixture(overrides: Partial<Delivery> = {}): Delivery {
  return {
    ...buildDeliveryListItemFixture(),
    courier_id: 1,
    tracking_url: null,
    failure_reason: null,
    delivered_at: null,
    failed_at: null,
    returned_at: null,
    cancelled_at: null,
    created_at: '2026-10-18T09:00:00+00:00',
    timeline: [buildDeliveryEventFixture()],
    ...overrides,
  };
}

export function buildCourierFixture(overrides: Partial<Courier> = {}): Courier {
  return {
    id: 1,
    name: 'Swift Riders',
    phone: '+254712345678',
    tracking_url_template: 'https://track.swiftriders.test/{tracking_number}',
    is_active: true,
    created_at: '2026-10-01T08:00:00+00:00',
    updated_at: '2026-10-01T08:00:00+00:00',
    ...overrides,
  };
}

export function buildDeliveryZoneFixture(overrides: Partial<DeliveryZone> = {}): DeliveryZone {
  return {
    id: 1,
    country: 'KE',
    name: 'Nairobi CBD',
    fee: buildMoney('200.00'),
    is_active: true,
    sort_order: 0,
    created_at: '2026-10-01T09:00:00+00:00',
    updated_at: '2026-10-01T09:00:00+00:00',
    ...overrides,
  };
}
