import { type ProductStatus } from '@/types/catalogue';
import { type DeliveryStatus, type OrderStatus } from '@/types/sales';

export type ProductListFilters = {
  status?: ProductStatus;
  search?: string;
  category?: number;
  page?: number;
  perPage?: number;
};

export type OrderListFilters = {
  status?: OrderStatus;
  search?: string;
  feePending?: boolean;
  page?: number;
  perPage?: number;
};

export type DeliveryListFilters = {
  status?: DeliveryStatus;
  search?: string;
  courierId?: number;
  page?: number;
  perPage?: number;
};

const products = (storeId: number) => ['stores', storeId, 'products'] as const;
const orders = (storeId: number) => ['stores', storeId, 'orders'] as const;
const deliveries = (storeId: number) => ['stores', storeId, 'deliveries'] as const;

export const queryKeys = {
  me: ['me'],
  products,
  productList: (storeId: number, filters: ProductListFilters) =>
    [...products(storeId), 'list', filters] as const,
  product: (storeId: number, productId: number) =>
    [...products(storeId), 'detail', productId] as const,
  optionTypes: (storeId: number) => ['stores', storeId, 'option-types'] as const,
  categories: (storeId: number) => ['stores', storeId, 'categories'] as const,
  stockMovements: (storeId: number, productId: number) =>
    ['stores', storeId, 'stock-movements', productId] as const,
  orders,
  orderList: (storeId: number, filters: OrderListFilters) =>
    [...orders(storeId), 'list', filters] as const,
  order: (storeId: number, orderId: number) => [...orders(storeId), 'detail', orderId] as const,
  deliveries,
  deliveryList: (storeId: number, filters: DeliveryListFilters) =>
    [...deliveries(storeId), 'list', filters] as const,
  delivery: (storeId: number, deliveryId: number) =>
    [...deliveries(storeId), 'detail', deliveryId] as const,
  couriers: (storeId: number) => ['stores', storeId, 'couriers'] as const,
} as const;
