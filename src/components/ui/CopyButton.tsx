import { Copy } from 'lucide-react';

import { IconButton } from '@/components/ui/IconButton';
import { useToastContext } from '@/components/ui/ToastContext';

export function CopyButton({ value, label }: { value: string; label: string }) {
  const { showToast } = useToastContext();

  function handleClick() {
    // Wrapped so that a missing clipboard (an insecure page) is reported like a refused write.
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(value))
      .then(
        () => showToast({ title: 'Copied', description: value }),
        () => showToast({ title: "Couldn't copy. Try again.", tone: 'danger' }),
      );
  }

  return <IconButton icon={Copy} label={label} size="sm" onClick={handleClick} />;
}
