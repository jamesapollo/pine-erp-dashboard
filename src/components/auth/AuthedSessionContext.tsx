import { createContext, useContext, type ReactNode } from 'react';

import { type Session } from '@/types/session';

export type AuthedSession = Extract<Session, { status: 'authed' }>;

// The signed-in session as ProtectedRoute last rendered it. Screens below ProtectedRoute
// read it from here rather than from the `me` query, so they always agree with the route
// that decided to render them: when a mid-session 401 sets `me` to null, React may
// re-render a screen for its own query before ProtectedRoute re-renders and redirects,
// and that screen must still see the signed-in session it was mounted with.
const AuthedSessionContext = createContext<AuthedSession | null>(null);

export function AuthedSessionContextProvider({
  session,
  children,
}: {
  session: AuthedSession;
  children: ReactNode;
}) {
  return <AuthedSessionContext.Provider value={session}>{children}</AuthedSessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuthedSessionContext = () => useContext(AuthedSessionContext);
