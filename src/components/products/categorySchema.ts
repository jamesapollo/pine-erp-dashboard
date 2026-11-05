import { z } from 'zod';

import { type Category } from '@/types/catalogue';
import { type CreateCategoryMutationParams } from '@/hooks/api/mutations/catalogue/useCreateCategoryMutation';
import { type UpdateCategoryMutationParams } from '@/hooks/api/mutations/catalogue/useUpdateCategoryMutation';
import { SLUG_MAX_LENGTH } from '@/constants/catalogue';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DESCRIPTION_MAX_LENGTH = 5000;

export type CategoryInput = {
  name: string;
  slug: string;
  /** A category id, or '' for top level. */
  parentId: string;
  description: string;
  isVisible: boolean;
};

// A new category may leave the slug empty (the API makes one from the name); a saved one keeps one.
export function buildCategorySchema({ isSlugRequired }: { isSlugRequired: boolean }) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Name the category.')
      .max(120, 'Keep the name under 120 characters.'),
    slug: z
      .string()
      .trim()
      .max(SLUG_MAX_LENGTH, `Keep the slug under ${SLUG_MAX_LENGTH} characters.`)
      .refine((slug) => !isSlugRequired || slug !== '', 'Give the category a slug.')
      .refine(
        (slug) => slug === '' || SLUG_PATTERN.test(slug),
        'Use lowercase letters, numbers and hyphens.',
      ),
    parentId: z.string(),
    description: z
      .string()
      .max(DESCRIPTION_MAX_LENGTH, 'Keep the description under 5,000 characters.'),
    isVisible: z.boolean(),
  });
}

export function toCategoryInput(category?: Category, parentId?: number): CategoryInput {
  const parent = category ? category.parent_id : (parentId ?? null);
  return {
    name: category?.name ?? '',
    slug: category?.slug ?? '',
    parentId: parent === null ? '' : String(parent),
    description: category?.description ?? '',
    isVisible: category?.is_visible ?? true,
  };
}

function toParentId(parentId: string): number | null {
  return parentId === '' ? null : Number(parentId);
}

function toDescription(description: string): string | null {
  return description.trim() === '' ? null : description.trim();
}

export function buildCreateCategoryBody(input: CategoryInput): CreateCategoryMutationParams {
  const slug = input.slug.trim();
  return {
    name: input.name.trim(),
    ...(slug === '' ? {} : { slug }),
    parent_id: toParentId(input.parentId),
    description: toDescription(input.description),
    is_visible: input.isVisible,
  };
}

/** Only the fields that changed, so an untouched field never trips the API's checks. */
export function buildUpdateCategoryBody(
  input: CategoryInput,
  category: Category,
): UpdateCategoryMutationParams {
  const body: UpdateCategoryMutationParams = { categoryId: category.id };
  const saved = toCategoryInput(category);
  if (input.name.trim() !== saved.name) body.name = input.name.trim();
  if (input.slug.trim() !== saved.slug) body.slug = input.slug.trim();
  if (input.parentId !== saved.parentId) body.parent_id = toParentId(input.parentId);
  if (toDescription(input.description) !== toDescription(saved.description)) {
    body.description = toDescription(input.description);
  }
  if (input.isVisible !== saved.isVisible) body.is_visible = input.isVisible;
  return body;
}
