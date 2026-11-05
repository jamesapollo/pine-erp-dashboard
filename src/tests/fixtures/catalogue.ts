import {
  type Category,
  type Money,
  type OptionType,
  type Paginated,
  type Product,
  type ProductImage,
  type ProductListItem,
  type ProductVariant,
  type StockMovement,
  type VariantStockLevel,
} from '@/types/catalogue';

export function buildMoney(amount: string): Money {
  return { amount, currency: 'KES' };
}

export function buildProductImageFixture(overrides: Partial<ProductImage> = {}): ProductImage {
  return {
    id: 1,
    url: 'https://example.test/images/1.jpg',
    original_url: 'https://example.test/images/1-original.jpg',
    alt_text: 'Ankara wrap dress',
    width: 1200,
    height: 1600,
    sort_order: 0,
    is_main: true,
    option_value_ids: [],
    ...overrides,
  };
}

export function buildVariantFixture(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: 1,
    product_id: 1,
    sku: 'ANKARA-WRAP-DRESS',
    is_active: true,
    sort_order: 0,
    price: null,
    effective_price: buildMoney('4500.00'),
    is_default: true,
    option_values: [],
    stock: { on_hand: 5, reserved: 0, available: 5 },
    ...overrides,
  };
}

export function buildProductFixture(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    title: 'Ankara wrap dress',
    slug: 'ankara-wrap-dress',
    description: null,
    status: 'draft',
    price: buildMoney('4500.00'),
    is_featured: false,
    published_at: null,
    category_ids: [],
    option_type_ids: [],
    main_image: null,
    created_at: '2026-10-01T09:00:00+00:00',
    updated_at: '2026-10-01T09:00:00+00:00',
    variants: [buildVariantFixture()],
    images: [],
    ...overrides,
  };
}

export function buildProductListItemFixture(
  overrides: Partial<ProductListItem> = {},
): ProductListItem {
  return {
    id: 1,
    title: 'Ankara wrap dress',
    slug: 'ankara-wrap-dress',
    description: null,
    status: 'draft',
    price: buildMoney('4500.00'),
    is_featured: false,
    published_at: null,
    category_ids: [],
    option_type_ids: [],
    variants_count: 1,
    stock_available: 5,
    main_image: null,
    created_at: '2026-10-01T09:00:00+00:00',
    updated_at: '2026-10-01T09:00:00+00:00',
    ...overrides,
  };
}

export function buildOptionTypeFixture(overrides: Partial<OptionType> = {}): OptionType {
  return {
    id: 1,
    name: 'Size',
    sort_order: 0,
    products_count: 0,
    values: ['S', 'M', 'L'].map((value, index) => ({
      id: index + 1,
      option_type_id: 1,
      value,
      sort_order: index,
      is_active: true,
      variants_count: 0,
    })),
    ...overrides,
  };
}

export function buildCategoryFixture(overrides: Partial<Category> = {}): Category {
  return {
    id: 1,
    parent_id: null,
    name: 'Dresses',
    slug: 'dresses',
    description: null,
    sort_order: 0,
    is_visible: true,
    kind: 'standard',
    show_in_nav: false,
    nav_order: null,
    ...overrides,
  };
}

export function buildPaginated<T>(
  data: T[],
  meta: Partial<Paginated<T>['meta']> = {},
): Paginated<T> {
  return {
    data,
    meta: { current_page: 1, per_page: 25, total: data.length, last_page: 1, ...meta },
  };
}

export function buildStockMovementFixture(overrides: Partial<StockMovement> = {}): StockMovement {
  return {
    id: 1,
    variant_id: 1,
    type: 'receipt',
    quantity: 5,
    on_hand_after: 5,
    reason: 'Opening stock',
    actor: { id: 1, name: 'Wanjiru Kamau' },
    order_id: null,
    created_at: '2026-10-01T09:00:00+00:00',
    ...overrides,
  };
}

export function buildVariantStockLevelFixture(
  overrides: Partial<VariantStockLevel> = {},
): VariantStockLevel {
  return {
    variant_id: 1,
    product_id: 1,
    product_title: 'Ankara wrap dress',
    product_status: 'published',
    sku: 'AWD-M-INDIGO',
    is_active: true,
    is_default: false,
    option_values: [
      { option_type_id: 1, option_value_id: 2, value: 'M' },
      { option_type_id: 2, option_value_id: 5, value: 'Indigo' },
    ],
    category_ids: [],
    image: null,
    stock: { on_hand: 12, reserved: 2, available: 10 },
    ...overrides,
  };
}
