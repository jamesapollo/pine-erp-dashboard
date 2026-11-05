import { useParams } from 'react-router-dom';

import { NotFoundPage } from '@/pages/NotFoundPage';
import { OfferDetailPage } from '@/pages/offers/OfferDetailPage';

// Keyed by id so moving to another offer starts that page afresh.
export function OfferDetailRoute() {
  const { offerId = '' } = useParams();
  return /^\d+$/.test(offerId) ? <OfferDetailPage key={offerId} /> : <NotFoundPage />;
}
