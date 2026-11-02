import { useNavigate } from 'react-router-dom';

import { type StaffMember } from '@/types/staff';
import { useResendInvitationMutation } from '@/hooks/api/mutations/staff/useResendInvitationMutation';
import { useRevokeInvitationMutation } from '@/hooks/api/mutations/staff/useRevokeInvitationMutation';
import { useSendStaffPasswordResetMutation } from '@/hooks/api/mutations/staff/useSendStaffPasswordResetMutation';
import { useStaffStatusMutation } from '@/hooks/api/mutations/staff/useStaffStatusMutation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { ROUTES } from '@/constants/routes';

export type StaffAction = 'resend' | 'revoke' | 'deactivate' | 'reactivate' | 'reset';

type Wording = {
  title: string;
  description: string;
  confirmLabel: string;
  variant: 'primary' | 'danger';
};

function getWording(action: StaffAction, member: StaffMember): Wording {
  switch (action) {
    case 'resend':
      return {
        title: 'Resend invitation?',
        description: `A new invite link goes to ${member.email}. The old link stops working.`,
        confirmLabel: 'Resend invite',
        variant: 'primary',
      };
    case 'revoke':
      return {
        title: 'Revoke invitation?',
        description: `${member.email} won’t be able to use their invite link.`,
        confirmLabel: 'Revoke invite',
        variant: 'danger',
      };
    case 'deactivate':
      return {
        title: `Deactivate ${member.name}?`,
        description:
          'They’re signed out now and can’t sign in until reactivated. Their history is kept.',
        confirmLabel: 'Deactivate',
        variant: 'danger',
      };
    case 'reactivate':
      return {
        title: `Reactivate ${member.name}?`,
        description: 'They can sign in again with their existing password.',
        confirmLabel: 'Reactivate',
        variant: 'primary',
      };
    case 'reset':
      return {
        title: 'Send password reset?',
        description: `A reset link goes to ${member.email}.`,
        confirmLabel: 'Send link',
        variant: 'primary',
      };
  }
}

// Render it only while open, so each opening starts without an earlier error.
export function StaffActionDialog({
  action,
  member,
  onClose,
}: {
  action: StaffAction;
  member: StaffMember;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const resendMutation = useResendInvitationMutation();
  const revokeMutation = useRevokeInvitationMutation();
  const statusMutation = useStaffStatusMutation();
  const resetMutation = useSendStaffPasswordResetMutation();
  const wording = getWording(action, member);

  const mutation = {
    resend: resendMutation,
    revoke: revokeMutation,
    deactivate: statusMutation,
    reactivate: statusMutation,
    reset: resetMutation,
  }[action];

  function confirm() {
    switch (action) {
      case 'resend':
        resendMutation.mutate(member.id, { onSuccess: onClose });
        break;
      case 'revoke':
        revokeMutation.mutate(member.id, { onSuccess: () => navigate(ROUTES.STAFF) });
        break;
      case 'deactivate':
      case 'reactivate':
        statusMutation.mutate({ memberId: member.id, action }, { onSuccess: onClose });
        break;
      case 'reset':
        resetMutation.mutate(member, { onSuccess: onClose });
        break;
    }
  }

  return (
    <Dialog
      isOpen
      title={wording.title}
      description={wording.description}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={mutation.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button variant={wording.variant} isLoading={mutation.isPending} onClick={confirm}>
            {wording.confirmLabel}
          </Button>
        </>
      }
    >
      {mutation.isError ? (
        <Alert tone="danger">{getActionErrorMessage(mutation.error)}</Alert>
      ) : null}
    </Dialog>
  );
}
