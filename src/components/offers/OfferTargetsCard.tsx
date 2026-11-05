import { useEffect, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Search } from 'lucide-react';

import { type Offer } from '@/types/pricing';
import { useCategoriesQuery } from '@/hooks/api/queries/catalogue/useCategoriesQuery';
import { useProductsQuery } from '@/hooks/api/queries/catalogue/useProductsQuery';
import { type OfferInput } from '@/components/offers/offerSchema';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormErrorMessage } from '@/components/ui/FormErrorMessage';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { flattenStandardCategories } from '@/utils/categoryTree';
import { formatMoney } from '@/utils/money';

const SEARCH_DEBOUNCE_MILLISECONDS = 300;
const PRODUCT_RESULTS = 25;

type TargetScope = 'categories' | 'products';

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function describeSelection(categoryCount: number, productCount: number): string {
  const parts = [];
  if (categoryCount) parts.push(countLabel(categoryCount, 'category', 'categories'));
  if (productCount) parts.push(countLabel(productCount, 'product', 'products'));
  return parts.length ? parts.join(' · ') : 'Nothing selected yet';
}

function toggleId(ids: number[], id: number, isOn: boolean): number[] {
  return isOn ? [...ids, id] : ids.filter((current) => current !== id);
}

function TargetRow({
  label,
  meta,
  isChecked,
  isDisabled,
  indent = 0,
  onChange,
}: {
  label: string;
  meta?: string;
  isChecked: boolean;
  isDisabled?: boolean;
  indent?: number;
  onChange: (isOn: boolean) => void;
}) {
  return (
    <li
      className="flex h-[var(--row-height)] items-center gap-3 border-b border-border-subtle px-5 has-[:checked]:bg-surface-selected"
      style={indent ? { paddingLeft: 20 + indent * 20 } : undefined}
    >
      <div className="min-w-0 flex-1">
        <Checkbox
          label={label}
          checked={isChecked}
          disabled={isDisabled}
          onChange={(event) => onChange(event.target.checked)}
        />
      </div>
      {meta ? <span className="shrink-0 text-[13px] text-text-tertiary">{meta}</span> : null}
    </li>
  );
}

function CategoryList({
  search,
  selectedIds,
  onChange,
}: {
  search: string;
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const categoriesQuery = useCategoriesQuery();
  if (categoriesQuery.isPending) return <Spinner label="Loading categories" />;
  if (categoriesQuery.isError) {
    return (
      <div className="p-5">
        <Alert tone="danger">Couldn&apos;t load categories. Try again.</Alert>
      </div>
    );
  }

  const term = search.trim().toLowerCase();
  // Special categories (New In, Sale) hold no products, so an offer on them would discount nothing.
  const rows = flattenStandardCategories(categoriesQuery.data).filter(({ category }) =>
    category.name.toLowerCase().includes(term),
  );
  if (!rows.length) {
    return <p className="m-0 px-5 py-4 text-[13px] text-text-tertiary">No categories match.</p>;
  }
  return (
    <ul className="m-0 list-none p-0">
      {rows.map(({ category, depth }) => (
        <TargetRow
          key={category.id}
          label={category.name}
          indent={term ? 0 : depth}
          isChecked={selectedIds.includes(category.id)}
          onChange={(isOn) => onChange(toggleId(selectedIds, category.id, isOn))}
        />
      ))}
    </ul>
  );
}

function ProductList({
  search,
  selectedIds,
  selectedCategoryIds,
  knownTitles,
  onChange,
}: {
  search: string;
  selectedIds: number[];
  selectedCategoryIds: number[];
  knownTitles: Map<number, string>;
  onChange: (ids: number[], title: { id: number; title: string }) => void;
}) {
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MILLISECONDS);
    return () => clearTimeout(timer);
  }, [search]);

  const productsQuery = useProductsQuery({
    search: debouncedSearch || undefined,
    perPage: PRODUCT_RESULTS,
  });
  const categoriesQuery = useCategoriesQuery();
  const categoryNames = new Map(
    (categoriesQuery.data ? flattenStandardCategories(categoriesQuery.data) : []).map(
      ({ category }) => [category.id, category.name],
    ),
  );

  if (productsQuery.isPending) return <Spinner label="Loading products" />;
  if (productsQuery.isError) {
    return (
      <div className="p-5">
        <Alert tone="danger">Couldn&apos;t load products. Try again.</Alert>
      </div>
    );
  }

  // Archived products are off the storefront, so they are not offered.
  const results = productsQuery.data.data.filter((product) => product.status !== 'archived');
  const resultIds = new Set(results.map((product) => product.id));
  // Chosen products outside the current results stay visible, so they can be unticked.
  const chosenElsewhere = debouncedSearch
    ? []
    : selectedIds
        .filter((id) => !resultIds.has(id))
        .map((id) => ({ id, title: knownTitles.get(id) ?? `Product ${id}` }));

  if (!results.length && !chosenElsewhere.length) {
    return <p className="m-0 px-5 py-4 text-[13px] text-text-tertiary">No products match.</p>;
  }
  return (
    <ul className="m-0 list-none p-0">
      {chosenElsewhere.map((product) => (
        <TargetRow
          key={product.id}
          label={product.title}
          isChecked
          onChange={(isOn) => onChange(toggleId(selectedIds, product.id, isOn), product)}
        />
      ))}
      {results.map((product) => {
        const coveringCategoryId = product.category_ids.find((id) =>
          selectedCategoryIds.includes(id),
        );
        const coveringCategory =
          coveringCategoryId === undefined ? undefined : categoryNames.get(coveringCategoryId);
        return (
          <TargetRow
            key={product.id}
            label={product.title}
            meta={
              coveringCategory ? `Included via ${coveringCategory}` : formatMoney(product.price)
            }
            isChecked={Boolean(coveringCategory) || selectedIds.includes(product.id)}
            isDisabled={Boolean(coveringCategory)}
            onChange={(isOn) => onChange(toggleId(selectedIds, product.id, isOn), product)}
          />
        );
      })}
    </ul>
  );
}

function ReadOnlyTargets({ offer }: { offer?: Offer }) {
  const names = [
    ...(offer?.categories ?? []).map((category) => ({
      key: `c${category.id}`,
      label: category.name,
    })),
    ...(offer?.products ?? []).map((product) => ({ key: `p${product.id}`, label: product.title })),
    ...(offer?.variants ?? []).map((variant) => ({ key: `v${variant.id}`, label: variant.sku })),
  ];
  return (
    <ul className="m-0 list-none p-0">
      {names.map((name) => (
        <li
          key={name.key}
          className="flex h-[var(--row-height)] items-center border-t border-border-subtle px-5 text-sm"
        >
          {name.label}
        </li>
      ))}
    </ul>
  );
}

export function OfferTargetsCard({
  offer,
  isReadOnly,
  serverError,
}: {
  offer?: Offer;
  isReadOnly: boolean;
  serverError?: string;
}) {
  const {
    control,
    setValue,
    formState: { errors, isSubmitted },
  } = useFormContext<OfferInput>();
  // After a failed submit, picking a target clears the "pick at least one" error straight away.
  const changeOptions = { shouldDirty: true, shouldValidate: isSubmitted };
  const [categoryIds, productIds] = useWatch({ control, name: ['categoryIds', 'productIds'] });
  const [scope, setScope] = useState<TargetScope>(
    offer && offer.products.length && !offer.categories.length ? 'products' : 'categories',
  );
  const [search, setSearch] = useState('');
  const [knownTitles, setKnownTitles] = useState(
    () => new Map((offer?.products ?? []).map((product) => [product.id, product.title])),
  );
  const variantCount = offer?.variants.length ?? 0;
  const error = errors.categoryIds?.message ?? serverError;

  const subtitle = useMemo(
    () =>
      isReadOnly
        ? describeSelection(offer?.categories.length ?? 0, offer?.products.length ?? 0)
        : describeSelection(categoryIds.length, productIds.length),
    [isReadOnly, offer, categoryIds.length, productIds.length],
  );

  return (
    <Card title="Applies to" subtitle={subtitle} flush>
      {variantCount ? (
        <div className="px-5 pb-3">
          <Alert tone="info">
            Also applies to {countLabel(variantCount, 'variant', 'variants')} chosen elsewhere.
            Saving keeps {variantCount === 1 ? 'it' : 'them'}.
          </Alert>
        </div>
      ) : null}
      {isReadOnly ? (
        <ReadOnlyTargets offer={offer} />
      ) : (
        <>
          <div className="px-5">
            <Tabs
              label="Offer targets"
              value={scope}
              onChange={(value) => {
                setScope(value as TargetScope);
                setSearch('');
              }}
              items={[
                {
                  value: 'categories',
                  label: 'Categories',
                  count: categoryIds.length || undefined,
                },
                { value: 'products', label: 'Products', count: productIds.length || undefined },
              ]}
            />
          </div>
          <div className="border-b border-border-subtle px-5 py-3">
            <Input
              key={scope}
              label={scope === 'categories' ? 'Search categories' : 'Search products'}
              hideLabel
              icon={Search}
              size="sm"
              placeholder={scope === 'categories' ? 'Category' : 'Product name'}
              className="w-[260px]"
              maxLength={100}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {scope === 'categories' ? (
              <CategoryList
                search={search}
                selectedIds={categoryIds}
                onChange={(ids) => setValue('categoryIds', ids, changeOptions)}
              />
            ) : (
              <ProductList
                search={search}
                selectedIds={productIds}
                selectedCategoryIds={categoryIds}
                knownTitles={knownTitles}
                onChange={(ids, product) => {
                  setKnownTitles((current) => new Map(current).set(product.id, product.title));
                  setValue('productIds', ids, changeOptions);
                }}
              />
            )}
          </div>
          <div className="px-5 py-2.5 text-[13px]">
            {error ? (
              <FormErrorMessage id="offer-targets-error" message={error} />
            ) : (
              <span className="text-text-tertiary">
                Categories include products added to them later.
              </span>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
