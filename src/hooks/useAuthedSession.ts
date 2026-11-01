import { useSession } from '@/hooks/useSession';
import { type Session } from '@/types/session';

export function useAuthedSession(): Extract<Session, { status: 'authed' }> {
  const session = useSession();
  if (session.status !== 'authed') throw new Error('useAuthedSession used outside ProtectedRoute');
  return session;
}
