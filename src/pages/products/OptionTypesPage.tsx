import { useState } from 'react';
import { Layers, Plus } from 'lucide-react';

import { useOptionTypesQuery } from '@/hooks/api/queries/catalogue/useOptionTypesQuery';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { AddOptionTypeDialog } from '@/components/products/AddOptionTypeDialog';
import { OptionTypeEditor } from '@/components/products/OptionTypeEditor';
import { OptionTypeList } from '@/components/products/OptionTypeList';
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
import { ROUTES } from '@/constants/routes';

export function OptionTypesPage() {
  const { hasPermission } = useAuthedSession();
  const canManage = hasPermission('catalogue.manage');
  const optionTypesQuery = useOptionTypesQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const optionTypes = optionTypesQuery.data ?? [];
  const selected = optionTypes.find((optionType) => optionType.id === selectedId) ?? optionTypes[0];

  let content;
  if (optionTypesQuery.isPending) {
    content = <Spinner label="Loading option types" />;
  } else if (optionTypesQuery.isError) {
    content = isStatus(optionTypesQuery.error, 403) ? (
      <NoAccess message="You don't have access to products." />
    ) : (
      <Alert tone="danger">Couldn't load option types. Try again.</Alert>
    );
  } else {
    content = (
      <div className="flex flex-wrap items-start gap-4">
        {selected ? (
          <OptionTypeList
            optionTypes={optionTypes}
            selectedId={selected.id}
            onSelect={setSelectedId}
          />
        ) : null}
        <div className="min-w-0 flex-[2_1_480px]">
          {selected ? (
            <OptionTypeEditor key={selected.id} optionType={selected} canManage={canManage} />
          ) : (
            <Card>
              <EmptyState
                icon={Layers}
                title="No option types"
                description="Add one, such as Size or Colour, to start building variants."
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
        title="Option types"
        sub="Shared across all products, so sizes and colours stay consistent on the storefront."
        back={<BackLink to={ROUTES.PRODUCTS}>Products</BackLink>}
        actions={
          canManage ? (
            <Button onClick={() => setIsAdding(true)}>
              <Icon icon={Plus} size={16} />
              Add option type
            </Button>
          ) : null
        }
      />
      {content}
      <AddOptionTypeDialog
        isOpen={isAdding}
        optionTypes={optionTypes}
        onAdded={(optionType) => setSelectedId(optionType.id)}
        onClose={() => setIsAdding(false)}
      />
    </div>
  );
}
