import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react';

import { type Category } from '@/types/catalogue';
import { useDeleteCategoryMutation } from '@/hooks/api/mutations/catalogue/useDeleteCategoryMutation';
import { useUpdateCategoryMutation } from '@/hooks/api/mutations/catalogue/useUpdateCategoryMutation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Switch } from '@/components/ui/Switch';
import { MAX_CATEGORY_DEPTH } from '@/constants/catalogue';
import { ROUTES } from '@/constants/routes';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[length:var(--text-2xs)] font-semibold uppercase leading-[1.2] tracking-[var(--tracking-caps)] text-text-tertiary">
        {label}
      </div>
      <div className="text-sm text-text-primary">{children}</div>
    </div>
  );
}

export function CategoryDetailCard({
  category,
  parent,
  depth,
  canManage,
  onEdit,
  onAddSubcategory,
}: {
  category: Category;
  parent: Category | undefined;
  /** 0 for a top-level category. */
  depth: number;
  canManage: boolean;
  onEdit: () => void;
  onAddSubcategory: () => void;
}) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const updateMutation = useUpdateCategoryMutation();
  const deleteMutation = useDeleteCategoryMutation();
  const isSpecial = category.kind !== 'standard';
  const subcategoryCount = (category.children ?? []).length;
  const canHoldSubcategories = !isSpecial && depth + 1 < MAX_CATEGORY_DEPTH;

  function closeDeleteDialog() {
    setIsConfirmingDelete(false);
    deleteMutation.reset();
  }

  return (
    <>
      <Card
        title={category.name}
        subtitle={`/${category.slug}`}
        actions={
          canManage ? (
            <>
              <Button size="sm" variant="secondary" onClick={onEdit}>
                <Icon icon={Pencil} size={14} />
                Edit
              </Button>
              {isSpecial ? null : (
                <IconButton
                  size="sm"
                  icon={Trash2}
                  label="Delete category"
                  className="border-border-default bg-surface-card shadow-xs"
                  onClick={() => setIsConfirmingDelete(true)}
                />
              )}
            </>
          ) : null
        }
      >
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-3 rounded-control border border-border-subtle px-3.5 py-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-text-primary">Visible on storefront</div>
              <div className="text-[13px] text-text-secondary">
                {category.is_visible
                  ? 'Shows in the storefront menu and category pages.'
                  : 'Hidden from the menu. Products stay purchasable by direct link.'}
              </div>
            </div>
            <Switch
              aria-label="Visible on storefront"
              checked={category.is_visible}
              disabled={!canManage || updateMutation.isPending}
              onChange={(event) =>
                updateMutation.mutate({ categoryId: category.id, is_visible: event.target.checked })
              }
            />
          </div>
          {isSpecial ? (
            <div>
              <Badge tone="info">
                {category.kind === 'new_in' ? 'Automatic — New In' : 'Automatic — Sale'}
              </Badge>
              <p className="m-0 mt-2 text-[13px] text-text-secondary">
                Filled automatically, so products can't be added to it by hand.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Fact label="Parent">{parent ? parent.name : 'Top level'}</Fact>
              <Fact label="Subcategories">{subcategoryCount || 'None'}</Fact>
            </div>
          )}
          {category.description ? (
            <Fact label="Description">
              <span className="whitespace-pre-line text-text-secondary">
                {category.description}
              </span>
            </Fact>
          ) : null}
          {isSpecial ? null : (
            <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-border-subtle pt-3">
              {canManage && canHoldSubcategories ? (
                <Button size="sm" variant="secondary" onClick={onAddSubcategory}>
                  <Icon icon={Plus} size={14} />
                  Subcategory
                </Button>
              ) : null}
              <Link
                to={`${ROUTES.PRODUCTS}?category=${category.id}`}
                className="inline-flex h-7 items-center gap-[5px] rounded-control px-2.5 text-[13px] font-medium leading-none text-text-secondary no-underline transition duration-[120ms] ease-out hover:bg-neutral-100 hover:text-text-primary focus-visible:shadow-focus focus-visible:outline-none"
              >
                View products
                <Icon icon={ArrowRight} size={14} />
              </Link>
            </div>
          )}
        </div>
      </Card>
      {subcategoryCount > 0 ? (
        <Dialog
          isOpen={isConfirmingDelete}
          title={`Can't delete ${category.name}`}
          description={`Delete or move its ${subcategoryCount === 1 ? 'subcategory' : `${subcategoryCount} subcategories`} first.`}
          onClose={closeDeleteDialog}
          footer={<Button onClick={closeDeleteDialog}>OK</Button>}
        />
      ) : (
        <Dialog
          isOpen={isConfirmingDelete}
          title={`Delete ${category.name}?`}
          description="Products in it keep selling but lose this category. Offers targeting it stop applying."
          onClose={closeDeleteDialog}
          footer={
            <>
              <Button variant="secondary" onClick={closeDeleteDialog}>
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={deleteMutation.isPending}
                onClick={() =>
                  deleteMutation.mutate(
                    { categoryId: category.id, name: category.name },
                    { onSuccess: closeDeleteDialog },
                  )
                }
              >
                Delete
              </Button>
            </>
          }
        />
      )}
    </>
  );
}
