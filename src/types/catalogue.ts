export type Money = { amount: string; currency: string };
export type ProductStatus = 'draft' | 'published' | 'archived';
export type ProductImage = {
  id: number;
  url: string;
  original_url: string;
  alt_text: string;
  width: number;
  height: number;
  sort_order: number;
  is_main: boolean;
  option_value_ids: number[];
};
export type VariantStock = { on_hand: number; reserved: number; available: number };
export type VariantOptionValue = { option_type_id: number; option_value_id: number; value: string };
export type ProductVariant = {
  id: number;
  product_id: number;
  sku: string;
  is_active: boolean;
  sort_order: number;
  price: Money | null;
  effective_price: Money | null;
  is_default: boolean;
  option_values: VariantOptionValue[];
  stock: VariantStock;
};
export type ProductListItem = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  status: ProductStatus;
  price: Money | null;
  is_featured: boolean;
  published_at: string | null;
  category_ids: number[];
  option_type_ids: number[];
  variants_count: number;
  stock_available: number;
  main_image: ProductImage | null;
  created_at: string;
  updated_at: string;
};
export type Product = Omit<ProductListItem, 'variants_count' | 'stock_available'> & {
  variants: ProductVariant[];
  images: ProductImage[];
};
export type OptionValue = {
  id: number;
  option_type_id: number;
  value: string;
  sort_order: number;
  is_active: boolean;
  variants_count: number;
};
export type OptionType = {
  id: number;
  name: string;
  sort_order: number;
  values: OptionValue[];
  products_count: number;
};
export type CategoryKind = 'standard' | 'new_in' | 'on_sale';
export type Category = {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_visible: boolean;
  kind: CategoryKind;
  show_in_nav: boolean;
  nav_order: number | null;
  children?: Category[];
};
export type StockMovementType = 'receipt' | 'adjustment' | 'sale' | 'return';
export type StockMovement = {
  id: number;
  variant_id: number;
  type: StockMovementType;
  quantity: number;
  on_hand_after: number;
  reason: string | null;
  actor: { id: number; name: string } | null;
  order_id: number | null;
  created_at: string;
};
export type VariantStockLevel = {
  variant_id: number;
  product_id: number;
  product_title: string;
  product_status: ProductStatus;
  sku: string;
  is_active: boolean;
  is_default: boolean;
  option_values: VariantOptionValue[];
  category_ids: number[];
  image: Pick<ProductImage, 'url' | 'alt_text'> | null;
  stock: VariantStock;
};
export type StockTotals = { on_hand: number; reserved: number };
export type Paginated<T> = {
  data: T[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
};
