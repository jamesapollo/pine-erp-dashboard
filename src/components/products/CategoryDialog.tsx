import { useId } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

import { type Category } from '@/types/catalogue';
import { useCreateCategoryMutation } from '@/hooks/api/mutations/catalogue/useCreateCategoryMutation';
import { useUpdateCategoryMutation } from '@/hooks/api/mutations/catalogue/useUpdateCategoryMutation';
import {
  buildCategorySchema,
  buildCreateCategoryBody,
  buildUpdateCategoryBody,
  toCategoryInput,
  type CategoryInput,
} from '@/components/products/categorySchema';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { getActionErrorMessage, getFieldError } from '@/utils/apiErrors';
import {
  flattenStandardCategories,
  getDescendantIds,
  getSubtreeHeight,
  indentCategoryLabel,
  slugify,
} from '@/utils/categoryTree';
import { MAX_CATEGORY_DEPTH } from '@/constants/catalogue';

const SERVER_FIELDS = ['name', 'slug', 'parent_id', 'description'] as const;

// Render it only while open, so each opening starts from the category (or empty for a new one).
export function CategoryDialog({
  category,
  parentId,
  tree,
  onSaved,
  onClose,
}: {
  /** Absent to add a category. */
  category?: Category;
  /** The parent a new category starts under. */
  parentId?: number;
  tree: Category[];
  onSaved: (category: Category) => void;
  onClose: () => void;
}) {
  const formId = useId();
  const isAdding = category === undefined;
  const createMutation = useCreateCategoryMutation({ shouldToastErrors: false });
  const updateMutation = useUpdateCategoryMutation({ shouldToastErrors: false });
  const mutation = isAdding ? createMutation : updateMutation;
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(buildCategorySchema({ isSlugRequired: !isAdding })),
    mode: 'onSubmit',
    defaultValues: toCategoryInput(category, parentId),
  });
  const [name, slug] = useWatch({ control, name: ['name', 'slug'] });

  const isSpecial = category !== undefined && category.kind !== 'standard';
  const excludedIds = new Set(
    category ? [category.id, ...getDescendantIds(tree, category.id)] : [],
  );
  // The category and everything under it must still fit within the depth limit.
  const levelsToPlace = category ? getSubtreeHeight(tree, category.id) : 1;
  const parentOptions = flattenStandardCategories(tree)
    .filter(
      ({ category: candidate, depth }) =>
        !excludedIds.has(candidate.id) && depth + 1 + levelsToPlace <= MAX_CATEGORY_DEPTH,
    )
    .map(({ category: candidate, depth }) => ({
      value: String(candidate.id),
      label: indentCategoryLabel(candidate.name, depth),
    }));

  const serverErrors = Object.fromEntries(
    SERVER_FIELDS.map((field) => [field, getFieldError(mutation.error, field)]),
  );
  const hasServerFieldError = SERVER_FIELDS.some((field) => serverErrors[field]);
  const generatedSlug = slugify(name);
  const slugHint = isAdding
    ? slug.trim() === '' && generatedSlug !== ''
      ? `Made from the name: ${generatedSlug}`
      : 'Made from the name if left empty.'
    : 'Changing it changes the category page’s address.';

  const onSubmit = handleSubmit((values) => {
    if (isAdding) {
      createMutation.mutate(buildCreateCategoryBody(values), {
        onSuccess: (created) => {
          onSaved(created);
          onClose();
        },
      });
      return;
    }
    const body = buildUpdateCategoryBody(values, category);
    if (Object.keys(body).length === 1) {
      onClose();
      return;
    }
    updateMutation.mutate(body, {
      onSuccess: (saved) => {
        onSaved(saved);
        onClose();
      },
    });
  });

  return (
    <Dialog
      isOpen
      title={isAdding ? 'New category' : 'Edit category'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={mutation.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} isLoading={mutation.isPending}>
            {isAdding ? 'Create' : 'Save'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={onSubmit} className="grid gap-3.5">
        {mutation.isError && !hasServerFieldError ? (
          <Alert tone="danger">{getActionErrorMessage(mutation.error)}</Alert>
        ) : null}
        <Input
          label="Name"
          autoFocus
          placeholder="Dresses"
          maxLength={120}
          error={errors.name?.message ?? serverErrors.name}
          {...register('name')}
        />
        <Input
          label={isAdding ? 'Slug (optional)' : 'Slug'}
          placeholder={generatedSlug || 'dresses'}
          autoComplete="off"
          hint={slugHint}
          error={errors.slug?.message ?? serverErrors.slug}
          {...register('slug')}
        />
        {isSpecial ? null : (
          <Select
            label="Parent"
            placeholder="Top level"
            options={parentOptions}
            error={serverErrors.parent_id}
            {...register('parentId')}
          />
        )}
        <Textarea
          label="Description"
          optional
          placeholder="Shown at the top of the category page"
          error={errors.description?.message ?? serverErrors.description}
          {...register('description')}
        />
        <Switch label="Visible on storefront" {...register('isVisible')} />
      </form>
    </Dialog>
  );
}
