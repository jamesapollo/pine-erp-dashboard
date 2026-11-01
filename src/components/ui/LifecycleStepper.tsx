import { Check } from 'lucide-react';

import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

export function LifecycleStepper({
  steps,
  current,
  cancelled = false,
}: {
  steps: { label: string; time?: string }[];
  current: number;
  cancelled?: boolean;
}) {
  return (
    <div className="flex w-full items-start gap-1.5">
      {steps.map((step, index) => {
        const state =
          index < current ? 'done' : index === current ? (cancelled ? 'done' : 'current') : 'todo';
        return (
          <div
            key={step.label}
            data-state={state}
            className="relative flex min-w-0 flex-1 flex-col gap-2"
          >
            <div
              className={cn(
                'h-1 rounded-sm bg-neutral-100',
                state === 'done' && (cancelled ? 'bg-neutral-300' : 'bg-brand-500'),
                state === 'current' &&
                  'bg-[linear-gradient(90deg,var(--brand-500)_50%,var(--neutral-100)_50%)]',
              )}
            />
            <div
              className={cn(
                'flex items-center gap-1.5 text-[length:var(--text-sm)] font-medium leading-[1.2]',
                state === 'todo' ? 'text-text-tertiary' : 'text-text-primary',
              )}
            >
              {state === 'done' && !cancelled ? (
                <Icon icon={Check} size={13} className="text-brand-600" />
              ) : null}
              {step.label}
            </div>
            {step.time ? (
              <div className="text-[length:var(--text-xs)] text-text-tertiary tabular-nums">
                {step.time}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
