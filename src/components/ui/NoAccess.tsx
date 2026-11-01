import { Lock } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

export function NoAccess({ message }: { message: string }) {
  return (
    <Card>
      <EmptyState icon={Lock} title={message} />
    </Card>
  );
}
