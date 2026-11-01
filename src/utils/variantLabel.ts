import { type ProductVariant, type VariantStockLevel } from '@/types/catalogue';

/** "S · Red" from the variant's option values; "Default" for the default variant. */
export function getVariantLabel(
  variant: Pick<ProductVariant, 'is_default' | 'option_values'>,
): string {
  if (variant.is_default || variant.option_values.length === 0) return 'Default';
  return variant.option_values.map((optionValue) => optionValue.value).join(' · ');
}

/** "Shirt · S · Red", or the product title alone for a default variant. */
export function getStockVariantName(
  level: Pick<VariantStockLevel, 'product_title' | 'is_default' | 'option_values'>,
): string {
  if (level.is_default || level.option_values.length === 0) return level.product_title;
  return `${level.product_title} · ${getVariantLabel(level)}`;
}
