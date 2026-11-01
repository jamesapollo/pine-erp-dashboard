import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/utils/cn';

type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> & {
  label?: string;
  description?: string;
};

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, description, disabled, className, ...props }, ref) => (
    <label
      className={cn(
        'group inline-flex items-start gap-2 text-[length:var(--text-base)] leading-[1.35] text-text-primary',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className,
      )}
    >
      <input
        ref={ref}
        type="radio"
        disabled={disabled}
        className="peer absolute size-0 opacity-0"
        {...props}
      />
      <span
        aria-hidden
        className="mt-px inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-card transition duration-[120ms] ease-out group-hover:border-neutral-400 peer-checked:border-[5px] peer-checked:border-action-primary peer-focus-visible:shadow-focus"
      />
      {label || description ? (
        <span>
          {label}
          {description ? (
            <span className="mt-0.5 block text-[length:var(--text-xs)] text-text-tertiary">
              {description}
            </span>
          ) : null}
        </span>
      ) : null}
    </label>
  ),
);

Radio.displayName = 'Radio';
