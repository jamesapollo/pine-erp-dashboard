import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { IconButton } from '@/components/ui/IconButton';

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({
  isOpen,
  title,
  description,
  footer,
  width = 480,
  onClose,
  children,
}: {
  isOpen: boolean;
  title: string;
  description?: ReactNode;
  footer?: ReactNode;
  width?: number;
  onClose: () => void;
  children?: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Move focus in on open and hand it back to the opener on close.
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>(focusableSelector);
    (first ?? dialog)?.focus();
    return () => opener?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onCloseRef.current();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;

    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
    );
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === dialogRef.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div
      data-testid="dialog-overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--surface-overlay)] p-6 backdrop-blur-[var(--blur-overlay)]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        style={{ maxWidth: width }}
        className="flex max-h-full w-full flex-col rounded-dialog bg-surface-card shadow-lg focus:outline-none"
      >
        <div className="flex items-start gap-3 px-5 pt-5">
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="m-0 text-[length:var(--text-lg)] font-semibold leading-[1.3] tracking-[-0.01em] text-text-primary"
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="m-0 mt-1 text-[length:var(--text-sm)] leading-[1.45] text-text-secondary"
              >
                {description}
              </p>
            ) : null}
          </div>
          <IconButton
            icon={X}
            label="Close"
            size="sm"
            className="-mr-1.5 -mt-1"
            onClick={onClose}
          />
        </div>
        <div className="overflow-auto p-5 text-[length:var(--text-base)] text-text-primary">
          {children}
        </div>
        {footer ? (
          <div className="flex justify-end gap-2 rounded-b-dialog border-t border-border-subtle bg-surface-sunken px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
