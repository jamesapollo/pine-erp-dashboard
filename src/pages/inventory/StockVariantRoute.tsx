import { useParams } from 'react-router-dom';

import { NotFoundPage } from '@/pages/NotFoundPage';
import { StockVariantPage } from '@/pages/inventory/StockVariantPage';

// Keyed by id so moving to another variant starts that page afresh.
export function StockVariantRoute() {
  const { variantId = '' } = useParams();
  return /^\d+$/.test(variantId) ? <StockVariantPage key={variantId} /> : <NotFoundPage />;
}
