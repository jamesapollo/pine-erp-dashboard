import { type ProductStatus } from '@/types/catalogue';

export type ProductListFilters = {
  status?: ProductStatus;
  search?: string;
  category?: number;
  page?: number;
  perPage?: number;
};

const products = (storeId: number) => ['stores', storeId, 'products'] as const;

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
} as const;
