import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { type Offer } from '@/types/pricing';
import { useDeleteOfferMutation } from '@/hooks/api/mutations/pricing/useDeleteOfferMutation';
import { queryKeys } from '@/hooks/api/queryKeys';
import { useAuthedSession } from '@/hooks/useAuthedSession';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { getActionErrorMessage } from '@/utils/apiErrors';
import { getOfferStatus } from '@/utils/offers';
import { ROUTES } from '@/constants/routes';

export function DeleteOfferDialog({
  offer,
  onClose,
  onDeleted,
}: {
  offer: Offer;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { store } = useAuthedSession();
  const deleteMutation = useDeleteOfferMutation();
  const isDeleted = useRef(false);

  // Drop the deleted offer's detail only once its screen has gone, so it never reloads into a 404.
  useEffect(
    () => () => {
      if (isDeleted.current) {
        queryClient.removeQueries({ queryKey: queryKeys.offer(store.id, offer.id) });
      }
    },
    [queryClient, store.id, offer.id],
  );

  return (
    <Dialog
      isOpen
      title="Delete this offer?"
      description={
        getOfferStatus(offer) === 'live'
          ? 'Prices go back to normal straight away.'
          : "It won't run. This can't be undone, so pause it instead to keep it."
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={deleteMutation.isPending} onClick={onClose}>
            Keep
          </Button>
          <Button
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() =>
              deleteMutation.mutate(offer, {
                onSuccess: () => {
                  isDeleted.current = true;
                  onDeleted();
                  navigate(ROUTES.OFFERS);
                },
              })
            }
          >
            Delete offer
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
