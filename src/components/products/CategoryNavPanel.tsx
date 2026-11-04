import { useState } from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';

import { type Category } from '@/types/catalogue';
import { useSetCategoryNavMutation } from '@/hooks/api/mutations/catalogue/useSetCategoryNavMutation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormErrorMessage } from '@/components/ui/FormErrorMessage';
import { IconButton } from '@/components/ui/IconButton';
import { Select } from '@/components/ui/Select';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { flattenCategoryTree, indentCategoryLabel } from '@/utils/categoryTree';

const NAV_WARNING_THRESHOLD = 8;

export function CategoryNavPanel({ categories }: { categories: Category[] }) {
  const setNavMutation = useSetCategoryNavMutation();
  // null means no unsaved edits: the list is whatever the server has.
  const [draftIds, setDraftIds] = useState<number[] | null>(null);

  const all = flattenCategoryTree(categories);
  const byId = new Map(all.map(({ category }) => [category.id, category]));
  const savedIds = all
    .map(({ category }) => category)
    .filter((category) => category.show_in_nav)
    .sort((first, second) => (first.nav_order ?? 0) - (second.nav_order ?? 0))
    .map((category) => category.id);
  const navIds = (draftIds ?? savedIds).filter((id) => byId.has(id));
  const navSet = new Set(navIds);
  const addOptions = all
    .filter(({ category }) => category.is_visible && !navSet.has(category.id))
    .map(({ category, depth }) => ({
      value: String(category.id),
      label: indentCategoryLabel(category.name, depth).trim(),
    }));

  function move(index: number, offset: -1 | 1) {
    const next = [...navIds];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    setDraftIds(next);
  }

  function save() {
    setNavMutation.mutate(navIds, { onSuccess: () => setDraftIds(null) });
  }

  function cancel() {
    setDraftIds(null);
    setNavMutation.reset();
  }

  const isDirty = draftIds !== null;

  return (
    <div role="region" aria-label="Category nav" className="mb-4">
      <Card
        title="Category nav"
        subtitle="The categories shown in the website's menu, in order. Changes show on the website within about 5 minutes."
        footer={
          <>
            <Button
              variant="secondary"
              disabled={!isDirty || setNavMutation.isPending}
              onClick={cancel}
            >
              Cancel
            </Button>
            <Button disabled={!isDirty} isLoading={setNavMutation.isPending} onClick={save}>
              Save nav
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          {navIds.length === 0 ? (
            <p className="m-0 text-sm text-text-tertiary">No categories in the nav yet.</p>
          ) : (
            <ol
              aria-label="Categories in the nav"
              className="m-0 flex list-none flex-col gap-1 p-0"
            >
              {navIds.map((id, index) => {
                const category = byId.get(id) as Category;
                return (
                  <li
                    key={id}
                    className="flex items-center gap-1 rounded-control border border-border-subtle px-3 py-1.5"
                  >
                    <span data-nav-name className="min-w-0 flex-1 truncate text-sm font-medium">
                      {category.name}
                    </span>
                    <IconButton
                      size="sm"
                      icon={ArrowUp}
                      label={`Move ${category.name} up`}
                      disabled={index === 0 || setNavMutation.isPending}
                      onClick={() => move(index, -1)}
                    />
                    <IconButton
                      size="sm"
                      icon={ArrowDown}
                      label={`Move ${category.name} down`}
                      disabled={index === navIds.length - 1 || setNavMutation.isPending}
                      onClick={() => move(index, 1)}
                    />
                    <IconButton
                      size="sm"
                      icon={X}
                      label={`Remove ${category.name} from nav`}
                      disabled={setNavMutation.isPending}
                      onClick={() => setDraftIds(navIds.filter((navId) => navId !== id))}
                    />
                  </li>
                );
              })}
            </ol>
          )}
          {navIds.length > NAV_WARNING_THRESHOLD ? (
            <Alert tone="warning">More than 8 categories will make the row scroll</Alert>
          ) : null}
          <Select
            label="Add to nav"
            placeholder="Choose…"
            options={addOptions}
            value=""
            disabled={addOptions.length === 0 || setNavMutation.isPending}
            onChange={(event) => {
              if (event.target.value) setDraftIds([...navIds, Number(event.target.value)]);
            }}
          />
          {setNavMutation.isError ? (
            <FormErrorMessage
              id="category-nav-error"
              message={getActionErrorMessage(setNavMutation.error)}
            />
          ) : null}
        </div>
      </Card>
    </div>
  );
}
