export type RouteHandle = {
  crumbs: string[];
  trailingCrumb?: 'productName' | 'orderReference' | 'deliveryReference';
};
