import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';

import { FormErrorMessage } from '@/components/ui/FormErrorMessage';
import { cn } from '@/utils/cn';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, optional = false, rows = 3, id, disabled, className, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const hintId = `${textareaId}-hint`;
    const errorId = `${textareaId}-error`;
    const describedBy = error ? errorId : hint ? hintId : undefined;

    return (
      <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
        <label
          htmlFor={textareaId}
          className="text-[13px] font-medium leading-[1.3] text-text-primary"
        >
          {label}
          {optional ? <span className="ml-1 font-normal text-text-tertiary">Optional</span> : null}
        </label>
        <div
          className={cn(
            'flex items-stretch rounded-control border bg-surface-card text-text-tertiary transition duration-[120ms] ease-out hover:border-border-strong focus-within:border-border-focus focus-within:shadow-focus',
            error
              ? 'border-danger-500 hover:border-danger-500 focus-within:border-danger-500 focus-within:shadow-focus-danger'
              : 'border-border-default',
            disabled && 'cursor-not-allowed bg-surface-sunken opacity-70',
          )}
        >
          <textarea
            ref={ref}
            id={textareaId}
            rows={rows}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className="min-h-20 min-w-0 flex-1 resize-y appearance-none border-0 bg-transparent px-2.5 py-2 text-sm leading-normal text-text-primary outline-none placeholder:text-text-disabled disabled:cursor-not-allowed"
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

Textarea.displayName = 'Textarea';
