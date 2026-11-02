import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserX } from 'lucide-react';

import { type StaffMember } from '@/types/staff';
import { useRemoveStaffMemberMutation } from '@/hooks/api/mutations/staff/useRemoveStaffMemberMutation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { ROUTES } from '@/constants/routes';

function RemoveStaffDialog({ member, onClose }: { member: StaffMember; onClose: () => void }) {
  const navigate = useNavigate();
  const removeMutation = useRemoveStaffMemberMutation();

  return (
    <Dialog
      isOpen
      title={`Remove ${member.name}?`}
      description="They lose access to the store. Orders and stock movements they made stay in the history."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={removeMutation.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            isLoading={removeMutation.isPending}
            onClick={() =>
              removeMutation.mutate(member, { onSuccess: () => navigate(ROUTES.STAFF) })
            }
          >
            Remove
          </Button>
        </>
      }
    >
      {removeMutation.isError ? (
        <Alert tone="danger">{getActionErrorMessage(removeMutation.error)}</Alert>
      ) : null}
    </Dialog>
  );
}

export function RemoveStaffCard({ member }: { member: StaffMember }) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <Card
      title="Remove from store"
      subtitle="Their past orders and stock movements stay in the history."
    >
      <Button variant="danger" onClick={() => setIsConfirming(true)}>
        <Icon icon={UserX} />
        Remove {member.name}
      </Button>
      {isConfirming ? (
        <RemoveStaffDialog member={member} onClose={() => setIsConfirming(false)} />
      ) : null}
    </Card>
  );
}
