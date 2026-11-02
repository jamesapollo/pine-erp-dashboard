import { forwardRef, type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';

import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> & {
  label?: string;
  description?: string;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, disabled, className, ...props }, ref) => (
    <label
      className={cn(
        'group inline-flex items-start gap-2.5 text-[length:var(--text-base)] leading-[1.35] text-text-primary',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className,
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        disabled={disabled}
        className="peer absolute size-0 opacity-0"
        {...props}
      />
      <span
        aria-hidden
        className="mt-px inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-border-strong bg-surface-card text-transparent transition duration-[120ms] ease-out group-hover:border-neutral-400 peer-checked:border-action-primary peer-checked:bg-action-primary peer-checked:text-white peer-focus-visible:shadow-focus"
      >
        <Icon icon={Check} size={12} />
      </span>
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

Checkbox.displayName = 'Checkbox';
