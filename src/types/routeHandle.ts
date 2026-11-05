export type RouteHandle = {
  crumbs: string[];
  trailingCrumb?:
    | 'productName'
    | 'orderReference'
    | 'deliveryReference'
    | 'stockVariantName'
    | 'staffMemberName'
    | 'roleName'
    | 'offerName';
};
