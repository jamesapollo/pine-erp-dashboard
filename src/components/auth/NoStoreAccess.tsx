import { Button } from '@/components/ui/Button';

export function NoStoreAccess({ onSignOut }: { onSignOut: () => void }) {
  return (
    <main>
      <h1>You don't have access to a store yet</h1>
      <p>Ask the store owner to check your account.</p>
      <Button variant="secondary" onClick={onSignOut}>
        Sign out
      </Button>
    </main>
  );
}
