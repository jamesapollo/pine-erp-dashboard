import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

import { FormErrorMessage } from '@/components/ui/FormErrorMessage';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  label: string;
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  optional?: boolean;
  placeholder?: string;
  options: { value: string; label: string }[];
  size?: 'sm' | 'md';
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      hideLabel = false,
      hint,
      error,
      optional = false,
      placeholder,
      options,
      size = 'md',
      id,
      disabled,
      className,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const hintId = `${selectId}-hint`;
    const errorId = `${selectId}-error`;
    const describedBy = error ? errorId : hint ? hintId : undefined;

    return (
      <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
        <label
          htmlFor={selectId}
          className={cn(
            'text-[13px] font-medium leading-[1.3] text-text-primary',
            hideLabel && 'sr-only',
          )}
        >
          {label}
          {optional ? <span className="ml-1 font-normal text-text-tertiary">Optional</span> : null}
        </label>
        <div
          className={cn(
            'relative flex items-center rounded-control border bg-surface-card text-text-tertiary transition duration-[120ms] ease-out hover:border-border-strong focus-within:border-border-focus focus-within:shadow-focus',
            size === 'sm' ? 'h-7' : 'h-[34px]',
            error
              ? 'border-danger-500 hover:border-danger-500 focus-within:border-danger-500 focus-within:shadow-focus-danger'
              : 'border-border-default',
            disabled && 'cursor-not-allowed bg-surface-sunken opacity-70',
          )}
        >
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className="h-full min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent pl-2.5 pr-8 text-sm leading-none text-text-primary outline-none disabled:cursor-not-allowed"
            {...props}
          >
            {placeholder ? <option value="">{placeholder}</option> : null}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Icon
            icon={ChevronDown}
            className="pointer-events-none absolute right-2.5 text-text-tertiary"
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

Select.displayName = 'Select';
