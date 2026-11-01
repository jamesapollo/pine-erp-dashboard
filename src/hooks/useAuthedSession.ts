import {
  type AuthedSession,
  useAuthedSessionContext,
} from '@/components/auth/AuthedSessionContext';

export function useAuthedSession(): AuthedSession {
  const session = useAuthedSessionContext();
  if (!session) throw new Error('useAuthedSession used outside ProtectedRoute');
  return session;
}
