import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, Search, Tags } from 'lucide-react';

import { type ProductStatus } from '@/types/catalogue';
import { useCategoriesQuery } from '@/hooks/api/queries/catalogue/useCategoriesQuery';
import {
  PRODUCTS_PER_PAGE,
  useProductsQuery,
} from '@/hooks/api/queries/catalogue/useProductsQuery';
import { useProductStatusCountsQuery } from '@/hooks/api/queries/catalogue/useProductStatusCountsQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { useProductListFilters } from '@/hooks/useProductListFilters';
import { ProductsTable } from '@/components/products/ProductsTable';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { isStatus } from '@/utils/apiErrors';
import { flattenCategoryTree, indentCategoryLabel } from '@/utils/categoryTree';
import { ROUTES } from '@/constants/routes';

export function ProductsPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuthedSession();
  const canManage = hasPermission('catalogue.manage');
  const { filters, searchText, setStatus, setSearch, setCategory, setPage } =
    useProductListFilters();
  const productsQuery = useProductsQuery(filters);
  const categoriesQuery = useCategoriesQuery();
  const { counts } = useProductStatusCountsQuery({
    search: filters.search,
    category: filters.category,
  });

  const categories = categoriesQuery.data ?? [];
  const hasFilters = Boolean(filters.status || filters.search || filters.category);
  const page = filters.page ?? 1;

  const productsData = productsQuery.data;
  // A stale or hand-edited page number past the end: move to the last page instead of
  // claiming there are no products.
  const isPastLastPage =
    productsData !== undefined && productsData.data.length === 0 && productsData.meta.total > 0;
  const lastPage = productsData?.meta.last_page ?? 1;

  useEffect(() => {
    if (isPastLastPage && page > lastPage) setPage(lastPage, true);
  }, [isPastLastPage, page, lastPage, setPage]);

  // A link or bookmark to a category that has since been deleted: drop the filter rather than
  // keep asking the API for it.
  const isUnknownCategory =
    filters.category !== undefined &&
    categoriesQuery.isSuccess &&
    !flattenCategoryTree(categoriesQuery.data).some(
      ({ category }) => category.id === filters.category,
    );

  useEffect(() => {
    if (isUnknownCategory) setCategory(undefined, true);
  }, [isUnknownCategory, setCategory]);

  let table;
  if (productsQuery.isPending || isPastLastPage) {
    table = <Spinner label="Loading products" />;
  } else if (productsQuery.isError) {
    table = (
      <div className="flex flex-col items-start gap-3 p-5">
        <Alert tone="danger">Couldn't load products. Try again.</Alert>
        <Button variant="secondary" onClick={() => productsQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  } else {
    table = (
      <>
        <ProductsTable
          products={productsQuery.data.data}
          categories={categories}
          hasFilters={hasFilters}
          canManage={canManage}
        />
        <Pagination
          page={page}
          perPage={PRODUCTS_PER_PAGE}
          total={productsQuery.data.meta.total}
          onPageChange={setPage}
        />
      </>
    );
  }

  const content =
    productsQuery.isError && isStatus(productsQuery.error, 403) ? (
      <NoAccess message="You don't have access to products." />
    ) : (
      <Card flush>
        <div className="px-5">
          <Tabs
            label="Product status"
            value={filters.status ?? 'all'}
            onChange={(value) => setStatus(value === 'all' ? undefined : (value as ProductStatus))}
            items={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'published', label: 'Published', count: counts.published },
              { value: 'draft', label: 'Draft', count: counts.draft },
              { value: 'archived', label: 'Archived', count: counts.archived },
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-2 border-b border-border-subtle px-5 py-3">
          <Input
            label="Search products"
            hideLabel
            icon={Search}
            size="sm"
            placeholder="Name or SKU"
            className="w-[260px]"
            value={searchText}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            label="Category"
            hideLabel
            size="sm"
            placeholder="All categories"
            className="w-[170px]"
            value={filters.category ? String(filters.category) : ''}
            onChange={(event) =>
              setCategory(event.target.value ? Number(event.target.value) : undefined)
            }
            options={flattenCategoryTree(categories).map(({ category, depth }) => ({
              value: String(category.id),
              label: indentCategoryLabel(category.name, depth),
            }))}
          />
        </div>
        {table}
      </Card>
    );

  return (
    <div>
      <PageHeader
        title="Products"
        sub="Only published products with a price show on the storefront."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(ROUTES.CATEGORIES)}>
              <Icon icon={Tags} size={16} />
              Categories
            </Button>
            <Button variant="secondary" onClick={() => navigate(ROUTES.OPTION_TYPES)}>
              <Icon icon={Layers} size={16} />
              Option types
            </Button>
            {canManage ? (
              <Button onClick={() => navigate(ROUTES.PRODUCT_NEW)}>
                <Icon icon={Plus} size={16} />
                Add product
              </Button>
            ) : null}
          </>
        }
      />
      {content}
    </div>
  );
}
