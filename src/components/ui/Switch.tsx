import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/utils/cn';

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role' | 'children'> & {
  label?: string;
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, disabled, className, ...props }, ref) => (
    <label
      className={cn(
        'inline-flex items-center gap-2.5 text-[length:var(--text-base)] leading-[1.3] text-text-primary',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className,
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        role="switch"
        disabled={disabled}
        className="peer absolute size-0 opacity-0"
        {...props}
      />
      <span
        aria-hidden
        className="relative h-[18px] w-8 shrink-0 rounded-full bg-neutral-300 transition-colors duration-[180ms] ease-out after:absolute after:left-0.5 after:top-0.5 after:size-3.5 after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(0,0,0,0.2)] after:transition-transform after:duration-[180ms] after:ease-out after:content-[''] peer-checked:bg-action-primary peer-checked:after:translate-x-3.5 peer-focus-visible:shadow-focus"
      />
      {label ? <span>{label}</span> : null}
    </label>
  ),
);

Switch.displayName = 'Switch';
