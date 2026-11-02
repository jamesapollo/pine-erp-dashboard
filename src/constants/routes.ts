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
  STOCK: '/inventory',
  STOCK_VARIANT: '/inventory/:variantId',
  DELIVERY_ZONES: '/delivery-zones',
  STAFF: '/staff',
  STAFF_MEMBER: '/staff/:memberId',
  ROLES: '/roles',
  ROLE_DETAIL: '/roles/:roleId',
  ACCEPT_INVITE: '/accept-invite',
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

export function buildStockVariantPath(variantId: number): string {
  return `${ROUTES.STOCK}/${variantId}`;
}

export function buildStaffMemberPath(memberId: number): string {
  return `${ROUTES.STAFF}/${memberId}`;
}

export function buildRolePath(roleId: number): string {
  return `${ROUTES.ROLES}/${roleId}`;
}
