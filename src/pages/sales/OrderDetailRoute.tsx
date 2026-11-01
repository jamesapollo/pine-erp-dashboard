import { useParams } from 'react-router-dom';

import { NotFoundPage } from '@/pages/NotFoundPage';
import { OrderDetailPage } from '@/pages/sales/OrderDetailPage';

// Keyed by id so moving to another order starts that page afresh.
export function OrderDetailRoute() {
  const { orderId = '' } = useParams();
  return /^\d+$/.test(orderId) ? <OrderDetailPage key={orderId} /> : <NotFoundPage />;
}
