import { KeyRound, Send } from 'lucide-react';

import { type StaffMember } from '@/types/staff';
import { type StaffAction } from '@/components/staff/StaffActionDialog';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

// Which action shows in which status. The API sends reset links to active members only.
export function StaffHeaderActions({
  member,
  onAction,
}: {
  member: StaffMember;
  onAction: (action: StaffAction) => void;
}) {
  if (member.status === 'invited') {
    return (
      <>
        <Button variant="secondary" onClick={() => onAction('revoke')}>
          Revoke invite
        </Button>
        <Button onClick={() => onAction('resend')}>
          <Icon icon={Send} />
          Resend invite
        </Button>
      </>
    );
  }

  if (member.status === 'suspended') {
    return <Button onClick={() => onAction('reactivate')}>Reactivate</Button>;
  }

  return (
    <>
      <Button variant="secondary" onClick={() => onAction('reset')}>
        <Icon icon={KeyRound} />
        Send reset link
      </Button>
      <Button variant="secondary" onClick={() => onAction('deactivate')}>
        Deactivate
      </Button>
    </>
  );
}
