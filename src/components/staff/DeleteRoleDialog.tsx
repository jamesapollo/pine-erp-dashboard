import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { type RoleDetail } from '@/types/staff';
import { useDeleteRoleMutation } from '@/hooks/api/mutations/staff/useDeleteRoleMutation';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { ROUTES } from '@/constants/routes';

export function DeleteRoleDialog({
  role,
  onClose,
  onDeleted,
}: {
  role: RoleDetail;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { store } = useAuthedSession();
  const deleteMutation = useDeleteRoleMutation();
  const isDeleted = useRef(false);

  // Drop the deleted role's detail only once its screen has gone, so it never reloads into a 404.
  useEffect(
    () => () => {
      if (isDeleted.current) {
        queryClient.removeQueries({ queryKey: queryKeys.role(store.id, role.id) });
      }
    },
    [queryClient, store.id, role.id],
  );

  return (
    <Dialog
      isOpen
      title={`Delete ${role.name}?`}
      description="This can't be undone."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={deleteMutation.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() =>
              deleteMutation.mutate(role, {
                onSuccess: () => {
                  isDeleted.current = true;
                  onDeleted();
                  navigate(ROUTES.ROLES);
                },
              })
            }
          >
            Delete role
          </Button>
        </>
      }
    >
      {deleteMutation.isError ? (
        <Alert tone="danger">{getActionErrorMessage(deleteMutation.error)}</Alert>
      ) : null}
    </Dialog>
  );
}
