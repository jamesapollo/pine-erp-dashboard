export const ROUTES = {
  ROOT: '/',
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  PRODUCTS: '/products',
  PRODUCT_NEW: '/products/new',
  OPTION_TYPES: '/products/option-types',
  CATEGORIES: '/products/categories',
  PRODUCT_DETAIL: '/products/:productId',
  ORDERS: '/orders',
  ORDER_DETAIL: '/orders/:orderId',
  DELIVERIES: '/deliveries',
  DELIVERY_DETAIL: '/deliveries/:deliveryId',
  CATCH_ALL: '*',
} as const;

export function buildProductPath(productId: number): string {
  return `${ROUTES.PRODUCTS}/${productId}`;
}

export function buildOrderPath(orderId: number): string {
  return `${ROUTES.ORDERS}/${orderId}`;
}

export function buildDeliveryPath(deliveryId: number): string {
  return `${ROUTES.DELIVERIES}/${deliveryId}`;
}
