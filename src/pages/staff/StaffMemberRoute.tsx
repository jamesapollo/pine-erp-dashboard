import { useParams } from 'react-router-dom';

import { NotFoundPage } from '@/pages/NotFoundPage';
import { StaffMemberPage } from '@/pages/staff/StaffMemberPage';

// Keyed by id so moving to another member starts that page afresh.
export function StaffMemberRoute() {
  const { memberId = '' } = useParams();
  return /^\d+$/.test(memberId) ? <StaffMemberPage key={memberId} /> : <NotFoundPage />;
}
