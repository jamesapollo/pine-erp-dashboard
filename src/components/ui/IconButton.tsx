import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { type LucideIcon } from 'lucide-react';

import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: LucideIcon;
  label: string;
  size?: 'sm' | 'md';
};

const sizeClasses = { sm: 'size-7', md: 'size-[34px]' } as const;
const iconSizes = { sm: 14, md: 16 } as const;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, size = 'md', className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-control border border-transparent bg-transparent text-text-secondary transition duration-[120ms] ease-out hover:enabled:bg-neutral-100 hover:enabled:text-text-primary focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-[0.45]',
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      <Icon icon={icon} size={iconSizes[size]} />
    </button>
  ),
);

IconButton.displayName = 'IconButton';
