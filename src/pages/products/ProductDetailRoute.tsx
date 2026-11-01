import { useParams } from 'react-router-dom';

import { ProductDetailPage } from '@/pages/products/ProductDetailPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function ProductDetailRoute() {
  const { productId = '' } = useParams();
  return /^\d+$/.test(productId) ? <ProductDetailPage /> : <NotFoundPage />;
}
