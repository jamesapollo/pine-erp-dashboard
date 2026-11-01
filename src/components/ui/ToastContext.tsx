import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { Toast, type ToastTone } from '@/components/ui/Toast';

const AUTO_DISMISS_MILLISECONDS = 5000;

type ToastInput = { title: string; description?: string; tone?: ToastTone };
type ToastEntry = ToastInput & { id: number };

type ToastContextState = {
  showToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextState>({ showToast: () => {} });

export function ToastContextProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { ...toast, id }]);
      window.setTimeout(() => dismissToast(id), AUTO_DISMISS_MILLISECONDS);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[200] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              tone={toast.tone}
              title={toast.title}
              description={toast.description}
              onClose={() => dismissToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// The provider and its consumer hook live together by convention (CLAUDE.md context pattern).
// eslint-disable-next-line react-refresh/only-export-components
export const useToastContext = () => useContext(ToastContext);
