import { useState } from 'react';
import { Plus } from 'lucide-react';

import { type Category } from '@/types/catalogue';
import { useCategoriesQuery } from '@/hooks/api/queries/catalogue/useCategoriesQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { CategoryDetailCard } from '@/components/products/CategoryDetailCard';
import { CategoryDialog } from '@/components/products/CategoryDialog';
import { CategoryNavPanel } from '@/components/products/CategoryNavPanel';
import { CategoryTreeCard } from '@/components/products/CategoryTreeCard';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { isStatus } from '@/utils/apiErrors';
import { flattenCategoryTree } from '@/utils/categoryTree';

type DialogState =
  { kind: 'closed' } | { kind: 'new'; parentId?: number } | { kind: 'edit'; category: Category };

export function CategoriesPage() {
  const { hasPermission } = useAuthedSession();
  const canManage = hasPermission('catalogue.manage');
  const categoriesQuery = useCategoriesQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' });

  const tree = categoriesQuery.data ?? [];
  const rows = flattenCategoryTree(tree);
  const selected = rows.find(({ category }) => category.id === selectedId) ?? rows[0];
  const selectedParent = selected
    ? rows.find(({ category }) => category.id === selected.category.parent_id)?.category
    : undefined;

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
      <>
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <CategoryTreeCard
            rows={rows}
            selectedId={selected?.category.id}
            onSelect={setSelectedId}
          />
          {selected ? (
            <CategoryDetailCard
              key={selected.category.id}
              category={selected.category}
              parent={selectedParent}
              depth={selected.depth}
              canManage={canManage}
              onEdit={() => setDialog({ kind: 'edit', category: selected.category })}
              onAddSubcategory={() => setDialog({ kind: 'new', parentId: selected.category.id })}
            />
          ) : null}
        </div>
        {canManage ? (
          <div className="mt-4">
            <CategoryNavPanel categories={tree} />
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        sub="Hidden categories stay off the storefront menu but keep their products."
        actions={
          canManage ? (
            <Button onClick={() => setDialog({ kind: 'new' })}>
              <Icon icon={Plus} size={16} />
              New category
            </Button>
          ) : null
        }
      />
      {content}
      {dialog.kind === 'closed' ? null : (
        <CategoryDialog
          category={dialog.kind === 'edit' ? dialog.category : undefined}
          parentId={dialog.kind === 'new' ? dialog.parentId : undefined}
          tree={tree}
          onSaved={(category) => setSelectedId(category.id)}
          onClose={() => setDialog({ kind: 'closed' })}
        />
      )}
    </div>
  );
}
