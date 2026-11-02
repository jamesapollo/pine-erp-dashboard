import { useParams } from 'react-router-dom';

import { NotFoundPage } from '@/pages/NotFoundPage';
import { RoleDetailPage } from '@/pages/staff/RoleDetailPage';

// Keyed by id so moving to another role starts that page afresh.
export function RoleDetailRoute() {
  const { roleId = '' } = useParams();
  return /^\d+$/.test(roleId) ? <RoleDetailPage key={roleId} /> : <NotFoundPage />;
}
