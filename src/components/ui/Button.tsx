import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/utils/cn';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  isLoading?: boolean;
};

const variantClasses = {
  primary: 'bg-action-primary text-white shadow-sm hover:enabled:bg-action-primary-hover',
  secondary:
    'border-border-default bg-surface-card text-text-primary shadow-xs hover:enabled:border-border-strong hover:enabled:bg-surface-hover',
  ghost:
    'bg-transparent text-text-secondary hover:enabled:bg-neutral-100 hover:enabled:text-text-primary',
  danger:
    'bg-action-danger text-white shadow-sm hover:enabled:bg-action-danger-hover focus-visible:shadow-focus-danger',
} as const;

const sizeClasses = {
  sm: 'h-7 gap-[5px] px-2.5 text-[13px]',
  md: 'h-[34px] gap-1.5 px-3.5 text-sm',
  lg: 'h-10 gap-2 px-[18px] text-base',
} as const;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      block = false,
      isLoading = false,
      disabled,
      children,
      className,
      type = 'button',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-control border border-transparent font-medium leading-none tracking-[-0.005em] no-underline transition duration-[120ms] ease-out focus-visible:shadow-focus focus-visible:outline-none active:enabled:translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.45]',
        variantClasses[variant],
        sizeClasses[size],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {isLoading ? <Spinner label="Working" /> : null}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
