import { type Money } from '@/types/catalogue';

export type OrderStatus = 'pending' | 'confirmed' | 'dispatched' | 'completed' | 'cancelled';
export type DeliveryStatus =
  'preparing' | 'dispatched' | 'in_transit' | 'delivered' | 'failed' | 'returned' | 'cancelled';
export type DeliveryMethod = 'courier' | 'pickup';
// The name is null when the user account has since been deleted.
export type Actor = { id: number; name: string | null };

export type OrderListItem = {
  id: number;
  reference: string;
  status: OrderStatus;
  buyer_name: string;
  buyer_phone: string;
  country: string;
  zone_name: string | null;
  item_count: number;
  grand_total: Money | null;
  delivery_fee_pending: boolean;
  created_at: string;
  hold_expires_at: string | null;
  delivery_status: DeliveryStatus | null;
};

export type OrderLine = {
  id: number;
  product_variant_id: number;
  product_name: string;
  variant_label: string;
  sku: string;
  quantity: number;
  unit_price: Money;
  unit_discount: Money;
  unit_price_paid: Money;
  line_total: Money;
  // The product's photo as the catalogue has it now (not saved with the order); null when there is none.
  image_url: string | null;
};

export type DeliveryTimelineEvent = {
  id: number;
  type: 'status_changed' | 'note';
  from_status: DeliveryStatus | null;
  to_status: DeliveryStatus | null;
  note: string | null;
  actor_user_id: number | null;
  actor: Actor | null;
  created_at: string;
};

export type OrderDelivery = {
  id: number;
  method: DeliveryMethod;
  status: DeliveryStatus;
  status_label: string;
  courier_name: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  failure_reason: string | null;
  timeline: DeliveryTimelineEvent[];
};

export type Order = OrderListItem & {
  lines: OrderLine[];
  buyer_email: string | null;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    region: string | null;
    postal_code: string | null;
  };
  delivery_charge: {
    zone_name: string | null;
    fee: Money | null;
    source: 'zone' | 'quote' | null;
    pending_quote: boolean;
  };
  subtotal: Money;
  discount_total: Money;
  tax_total: Money;
  confirmed_at: string | null;
  dispatched_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  cancelled_by: Actor | null;
  updated_at: string;
  delivery: OrderDelivery | null;
};

export type DeliveryListItem = {
  id: number;
  order_id: number;
  order_reference: string;
  method: DeliveryMethod;
  courier_name: string | null;
  tracking_number: string | null;
  status: DeliveryStatus;
  status_label: string;
  dispatched_at: string | null;
  updated_at: string;
};

export type Delivery = DeliveryListItem & {
  courier_id: number | null;
  tracking_url: string | null;
  failure_reason: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  returned_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  timeline: DeliveryTimelineEvent[];
};

export type Courier = {
  id: number;
  name: string;
  phone: string | null;
  tracking_url_template: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export type DeliveryZone = {
  id: number;
  country: string;
  name: string;
  fee: Money;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
