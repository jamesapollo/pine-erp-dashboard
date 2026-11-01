import { type ProductStatus, type StockMovementType } from '@/types/catalogue';
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

export type StockStatusFilter = 'low' | 'out';

export type StockListFilters = {
  status?: StockStatusFilter;
  search?: string;
  category?: number;
  page?: number;
  perPage?: number;
};

const products = (storeId: number) => ['stores', storeId, 'products'] as const;
const orders = (storeId: number) => ['stores', storeId, 'orders'] as const;
const deliveries = (storeId: number) => ['stores', storeId, 'deliveries'] as const;
const allStockMovements = (storeId: number) => ['stores', storeId, 'stock-movements'] as const;
const stockLevels = (storeId: number) => ['stores', storeId, 'stock-levels'] as const;

export const queryKeys = {
  me: ['me'],
  products,
  productList: (storeId: number, filters: ProductListFilters) =>
    [...products(storeId), 'list', filters] as const,
  product: (storeId: number, productId: number) =>
    [...products(storeId), 'detail', productId] as const,
  optionTypes: (storeId: number) => ['stores', storeId, 'option-types'] as const,
  categories: (storeId: number) => ['stores', storeId, 'categories'] as const,
  allStockMovements,
  stockMovements: (storeId: number, productId: number) =>
    [...allStockMovements(storeId), productId] as const,
  variantStockMovements: (storeId: number, variantId: number, type?: StockMovementType) =>
    [...allStockMovements(storeId), 'variant', variantId, type ?? 'all'] as const,
  stockLevels,
  stockLevelList: (storeId: number, filters: StockListFilters) =>
    [...stockLevels(storeId), 'list', filters] as const,
  stockLevel: (storeId: number, variantId: number) =>
    [...stockLevels(storeId), 'detail', variantId] as const,
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
  deliveryZones: (storeId: number) => ['stores', storeId, 'delivery-zones'] as const,
} as const;
