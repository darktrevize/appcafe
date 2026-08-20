import type { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-cafe-500 text-neutral-950 hover:bg-cafe-400',
  secondary: 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700',
  danger: 'bg-red-900 text-red-100 hover:bg-red-800',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
