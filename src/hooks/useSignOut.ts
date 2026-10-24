import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useSignOutMutation } from '@/hooks/api/mutations/auth/useSignOutMutation';
import { ROUTES } from '@/constants/routes';

// Signs out and lands on the login screen. If the server could not end the session,
// the user stays where they are and `hasFailed` is set so the caller can say so.
export function useSignOut() {
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useSignOutMutation();
  const [hasFailed, setHasFailed] = useState(false);

  const signOut = async () => {
    setHasFailed(false);
    try {
      await mutateAsync();
    } catch {
      setHasFailed(true);
      return;
    }
    void navigate(ROUTES.LOGIN, { replace: true });
  };

  return { signOut, isSigningOut: isPending, hasFailed };
}
