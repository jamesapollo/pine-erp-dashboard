import { useParams } from 'react-router-dom';

import { NotFoundPage } from '@/pages/NotFoundPage';
import { DeliveryDetailPage } from '@/pages/sales/DeliveryDetailPage';

// Keyed by id so moving to another delivery starts that page afresh.
export function DeliveryDetailRoute() {
  const { deliveryId = '' } = useParams();
  return /^\d+$/.test(deliveryId) ? <DeliveryDetailPage key={deliveryId} /> : <NotFoundPage />;
}
