import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { Spinner } from '@/components/ui/Spinner';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium';
  block?: boolean;
  isLoading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'medium',
      block = false,
      isLoading = false,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      data-variant={variant}
      data-size={size}
      data-block={block}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? <Spinner label="Working" /> : null}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
