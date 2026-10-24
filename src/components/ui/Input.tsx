import { forwardRef, useId, type InputHTMLAttributes } from 'react';

import { FormErrorMessage } from '@/components/ui/FormErrorMessage';
import { cn } from '@/utils/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, id, disabled, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hintId = `${inputId}-hint`;
    const errorId = `${inputId}-error`;
    const describedBy = error ? errorId : hint ? hintId : undefined;

    return (
      <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
        <label
          htmlFor={inputId}
          className="text-[13px] font-medium leading-[1.3] text-text-primary"
        >
          {label}
        </label>
        <div
          className={cn(
            'flex h-[34px] items-center rounded-control border bg-surface-card text-text-tertiary transition duration-[120ms] ease-out hover:border-border-strong focus-within:border-border-focus focus-within:shadow-focus',
            error
              ? 'border-danger-500 hover:border-danger-500 focus-within:border-danger-500 focus-within:shadow-focus-danger'
              : 'border-border-default',
            disabled && 'cursor-not-allowed bg-surface-sunken opacity-70',
          )}
        >
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className="h-full min-w-0 flex-1 appearance-none border-0 bg-transparent px-2.5 text-sm leading-none text-text-primary outline-none placeholder:text-text-disabled"
            {...props}
          />
        </div>
        {error ? (
          <FormErrorMessage id={errorId} message={error} />
        ) : hint ? (
          <span id={hintId} className="text-xs leading-[1.4] text-text-tertiary">
            {hint}
          </span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
