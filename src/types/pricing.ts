export type OfferType = 'percent_off' | 'sale_price';
export type OfferStatus = 'scheduled' | 'live' | 'ended' | 'inactive';

export type OfferProductTarget = { id: number; title: string };
export type OfferVariantTarget = { id: number; sku: string; product_id: number };
export type OfferCategoryTarget = { id: number; name: string };

export type Offer = {
  id: number;
  name: string;
  type: OfferType;
  // A two-decimal string: the percentage for percent_off, the price for sale_price.
  value: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  status: OfferStatus;
  targets_count: number;
  products: OfferProductTarget[];
  variants: OfferVariantTarget[];
  categories: OfferCategoryTarget[];
  created_at: string;
  updated_at: string;
};
