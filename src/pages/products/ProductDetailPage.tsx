import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useCategoriesQuery } from '@/hooks/api/queries/catalogue/useCategoriesQuery';
import { useProductQuery } from '@/hooks/api/queries/catalogue/useProductQuery';
import { type ProductDetailLocationState } from '@/hooks/useCreateProductFlow';
import { ProductDetailForm } from '@/components/products/ProductDetailForm';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { isStatus } from '@/utils/apiErrors';

export function ProductDetailPage() {
  const { productId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const stateSaveIssues = (location.state as ProductDetailLocationState | null)?.saveIssues;
  // Add product's "didn't save" message is for this visit only: keep it here and clear it from
  // history, so a reload or coming Back doesn't show it again.
  const [saveIssues] = useState(stateSaveIssues);
  useEffect(() => {
    if (stateSaveIssues === undefined) return;
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: null },
    );
  }, [stateSaveIssues, navigate, location.pathname, location.search, location.hash]);
  const productQuery = useProductQuery(Number(productId));
  // The category select needs its options before the form sets its value.
  const categoriesQuery = useCategoriesQuery();

  if (productQuery.isError) {
    if (isStatus(productQuery.error, 404)) return <NotFoundPage />;
    if (isStatus(productQuery.error, 403)) {
      return (
        <>
          <PageHeader title="Product" />
          <NoAccess message="You don't have access to products." />
        </>
      );
    }
    return (
      <>
        <PageHeader title="Product" />
        <div className="flex flex-col items-start gap-3">
          <Alert tone="danger">Couldn&apos;t load this product. Try again.</Alert>
          <Button variant="secondary" onClick={() => productQuery.refetch()}>
            Try again
          </Button>
        </div>
      </>
    );
  }

  if (productQuery.isPending || categoriesQuery.isPending) {
    return (
      <div className="flex justify-center p-10 text-text-tertiary">
        <Spinner label="Loading product" />
      </div>
    );
  }

  return (
    <ProductDetailForm
      key={productQuery.data.id}
      product={productQuery.data}
      categories={categoriesQuery.data ?? []}
      saveIssues={saveIssues}
    />
  );
}
