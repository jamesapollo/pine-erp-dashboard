import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';

import { type Category, type ProductListItem } from '@/types/catalogue';
import { ProductThumbnail } from '@/components/products/ProductThumbnail';
import { StockCount } from '@/components/products/StockCount';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { flattenCategoryTree } from '@/utils/categoryTree';
import { formatAmount } from '@/utils/money';
import { buildProductPath, ROUTES } from '@/constants/routes';

export function ProductsTable({
  products,
  categories,
  hasFilters,
  canManage,
}: {
  products: ProductListItem[];
  categories: Category[];
  hasFilters: boolean;
  canManage: boolean;
}) {
  const navigate = useNavigate();
  const categoryNames = new Map(
    flattenCategoryTree(categories).map(({ category }) => [category.id, category.name]),
  );

  function readCategoryNames(product: ProductListItem): string {
    return product.category_ids
      .map((categoryId) => categoryNames.get(categoryId))
      .filter((name): name is string => name !== undefined)
      .join(', ');
  }

  const empty = hasFilters ? (
    <EmptyState
      icon={Package}
      title="No products match"
      description="Try a different search or clear the filters."
    />
  ) : (
    <div className="flex flex-col items-center">
      <EmptyState
        icon={Package}
        title="No products yet"
        description="Add your first product to start building the catalogue."
      />
      {canManage ? (
        <Button className="mb-6" onClick={() => navigate(ROUTES.PRODUCT_NEW)}>
          Add product
        </Button>
      ) : null}
    </div>
  );

  return (
    <DataTable
      caption="Products"
      rows={products}
      getRowKey={(product) => product.id}
      onRowClick={(product) => navigate(buildProductPath(product.id))}
      empty={empty}
      columns={[
        {
          key: 'title',
          header: 'Product',
          render: (product) => (
            <div className="flex items-center gap-3">
              <ProductThumbnail image={product.main_image} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-medium">
                  {product.title}
                  {product.is_featured ? (
                    <Badge size="sm" tone="info">
                      Featured
                    </Badge>
                  ) : null}
                </div>
                <div className="text-xs text-text-tertiary">{readCategoryNames(product)}</div>
              </div>
            </div>
          ),
        },
        {
          key: 'status',
          header: 'Status',
          render: (product) => <StatusBadge kind="product" status={product.status} />,
        },
        { key: 'variants_count', header: 'Variants', align: 'right' },
        {
          key: 'stock_available',
          header: 'Available',
          align: 'right',
          render: (product) => <StockCount value={product.stock_available} />,
        },
        {
          key: 'price',
          header: 'Price (KES)',
          align: 'right',
          render: (product) => formatAmount(product.price),
        },
      ]}
    />
  );
}
