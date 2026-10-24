import { Inbox } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

export function OverviewPage() {
  return (
    <>
      <h1 className="m-0 mb-6 text-2xl font-semibold tracking-[-0.02em]">Overview</h1>
      <Card>
        <EmptyState icon={Inbox} title="Nothing here yet" />
      </Card>
    </>
  );
}
