import { useParams } from 'react-router-dom';

import { ProductDetailPage } from '@/pages/products/ProductDetailPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Keyed by id so moving to another product starts that page afresh.
export function ProductDetailRoute() {
  const { productId = '' } = useParams();
  return /^\d+$/.test(productId) ? <ProductDetailPage key={productId} /> : <NotFoundPage />;
}
