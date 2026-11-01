import { useState } from 'react';
import { Plus, Tags } from 'lucide-react';

import { useCategoriesQuery } from '@/hooks/api/queries/catalogue/useCategoriesQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { AddCategoryDialog } from '@/components/products/AddCategoryDialog';
import { CategoryEditor } from '@/components/products/CategoryEditor';
import { Alert } from '@/components/ui/Alert';
import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { isStatus } from '@/utils/apiErrors';
import { cn } from '@/utils/cn';
import { flattenCategoryTree, indentCategoryLabel } from '@/utils/categoryTree';
import { ROUTES } from '@/constants/routes';

export function CategoriesPage() {
  const { hasPermission } = useAuthedSession();
  const canManage = hasPermission('catalogue.manage');
  const categoriesQuery = useCategoriesQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const tree = categoriesQuery.data ?? [];
  const rows = flattenCategoryTree(tree);
  const selected = rows.find(({ category }) => category.id === selectedId) ?? rows[0];

  let content;
  if (categoriesQuery.isPending) {
    content = <Spinner label="Loading categories" />;
  } else if (categoriesQuery.isError) {
    content = isStatus(categoriesQuery.error, 403) ? (
      <NoAccess message="You don't have access to products." />
    ) : (
      <Alert tone="danger">Couldn't load categories. Try again.</Alert>
    );
  } else {
    content = (
      <div className="flex flex-wrap items-start gap-4">
        <Card flush className="min-w-0 max-w-[340px] flex-[1_1_260px]">
          {rows.length === 0 ? null : (
            <ul aria-label="Categories" className="m-0 flex list-none flex-col p-1.5">
              {rows.map(({ category, depth }) => (
                <li key={category.id}>
                  <button
                    type="button"
                    aria-current={category.id === selected?.category.id ? 'true' : undefined}
                    onClick={() => setSelectedId(category.id)}
                    className={cn(
                      'flex w-full cursor-pointer items-center rounded-control border-0 px-3 py-2.5 text-left text-sm font-medium text-text-primary focus-visible:shadow-focus focus-visible:outline-none',
                      category.id === selected?.category.id
                        ? 'bg-surface-selected'
                        : 'bg-transparent hover:bg-surface-hover',
                    )}
                  >
                    {indentCategoryLabel(category.name, depth)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="min-w-0 flex-[2_1_480px]">
          {selected ? (
            <CategoryEditor
              key={selected.category.id}
              category={selected.category}
              tree={tree}
              canManage={canManage}
            />
          ) : (
            <Card>
              <EmptyState
                icon={Tags}
                title="No categories"
                description="Add one, such as Dresses, so products can be filed under it."
              />
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        sub="Group products so buyers can browse them on the storefront."
        back={<BackLink to={ROUTES.PRODUCTS}>Products</BackLink>}
        actions={
          canManage ? (
            <Button onClick={() => setIsAdding(true)}>
              <Icon icon={Plus} size={16} />
              Add category
            </Button>
          ) : null
        }
      />
      {content}
      <AddCategoryDialog isOpen={isAdding} tree={tree} onClose={() => setIsAdding(false)} />
    </div>
  );
}
