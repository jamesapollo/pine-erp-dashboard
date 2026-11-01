import { Outlet } from 'react-router-dom';

import { useAuthedSession } from '@/hooks/useAuthedSession';
import { NoAccess } from '@/components/ui/NoAccess';

export function RequirePermission({ slug, message }: { slug: string; message: string }) {
  const { hasPermission } = useAuthedSession();
  return hasPermission(slug) ? <Outlet /> : <NoAccess message={message} />;
}
