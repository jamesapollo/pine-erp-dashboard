import { Send } from 'lucide-react';

import { type ProductStatus } from '@/types/catalogue';
import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ROUTES } from '@/constants/routes';

export type ProductStatusAction = 'publish' | 'unpublish' | 'archive' | 'restore';

export function ProductDetailHeader({
  title,
  status,
  sub,
  canManage,
  isDirty,
  isSaving,
  pendingAction,
  onSave,
  onStatusAction,
}: {
  title: string;
  status: ProductStatus;
  sub: string;
  canManage: boolean;
  isDirty: boolean;
  isSaving: boolean;
  pendingAction?: ProductStatusAction;
  onSave: () => void;
  onStatusAction: (action: ProductStatusAction) => void;
}) {
  const isBusy = isSaving || pendingAction !== undefined;

  function statusButton(action: ProductStatusAction, label: string, isPrimary = false) {
    return (
      <Button
        variant={isPrimary ? 'primary' : 'secondary'}
        disabled={isBusy}
        isLoading={pendingAction === action}
        onClick={() => onStatusAction(action)}
      >
        {isPrimary ? <Icon icon={Send} size={16} /> : null}
        {label}
      </Button>
    );
  }

  let actions = null;
  if (canManage && status === 'archived') {
    actions = statusButton('restore', 'Restore');
  } else if (canManage) {
    actions = (
      <>
        {statusButton('archive', 'Archive')}
        {status === 'draft' ? statusButton('publish', 'Publish', true) : null}
        {status === 'published' ? statusButton('unpublish', 'Unpublish') : null}
        <Button disabled={!isDirty || isBusy} isLoading={isSaving} onClick={onSave}>
          Save changes
        </Button>
      </>
    );
  }

  return (
    <PageHeader
      title={
        <span className="inline-flex items-center gap-3">
          {title}
          <StatusBadge kind="product" status={status} />
        </span>
      }
      sub={sub}
      back={<BackLink to={ROUTES.PRODUCTS}>Products</BackLink>}
      actions={actions}
    />
  );
}
