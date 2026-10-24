import { useNavigate } from 'react-router-dom';

import { useSignOutMutation } from '@/hooks/api/mutations/auth/useSignOutMutation';
import { ROUTES } from '@/constants/routes';

// Signs out, then lands on the login screen whatever the outcome.
export function useSignOut() {
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useSignOutMutation();

  const signOut = async () => {
    try {
      await mutateAsync();
    } finally {
      navigate(ROUTES.LOGIN, { replace: true });
    }
  };

  return { signOut, isSigningOut: isPending };
}
