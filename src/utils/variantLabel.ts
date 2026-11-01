import { type ProductVariant } from '@/types/catalogue';

/** "S · Red" from the variant's option values; "Default" for the default variant. */
export function getVariantLabel(variant: ProductVariant): string {
  if (variant.is_default || variant.option_values.length === 0) return 'Default';
  return variant.option_values.map((optionValue) => optionValue.value).join(' · ');
}
