import { useLocation } from 'react-router-dom';

import { type ProductDetailLocationState } from '@/hooks/useCreateProductFlow';
import { Alert } from '@/components/ui/Alert';
import { PageHeader } from '@/components/ui/PageHeader';

export function ProductDetailPage() {
  const location = useLocation();
  const saveIssues = (location.state as ProductDetailLocationState | null)?.saveIssues;

  return (
    <>
      <PageHeader title="Product" />
      {saveIssues ? <Alert tone="warning">{saveIssues}</Alert> : null}
    </>
  );
}
