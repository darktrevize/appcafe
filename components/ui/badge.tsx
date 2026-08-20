import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export type BadgeVariant = 'neutral' | 'verde' | 'tostado' | 'inicial' | 'alerta';

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-neutral-800 text-neutral-200',
  verde: 'bg-emerald-950 text-emerald-400 border border-emerald-800',
  tostado: 'bg-cafe-900 text-cafe-300 border border-cafe-700',
  inicial: 'bg-sky-950 text-sky-400 border border-sky-800',
  alerta: 'bg-red-950 text-red-400 border border-red-800',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
