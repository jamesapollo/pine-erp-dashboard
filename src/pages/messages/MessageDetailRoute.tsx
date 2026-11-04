import { useParams } from 'react-router-dom';

import { NotFoundPage } from '@/pages/NotFoundPage';
import { MessageDetailPage } from '@/pages/messages/MessageDetailPage';

// Keyed by id so moving to another message starts that page afresh.
export function MessageDetailRoute() {
  const { enquiryId = '' } = useParams();
  return /^\d+$/.test(enquiryId) ? <MessageDetailPage key={enquiryId} /> : <NotFoundPage />;
}
