import type { SelectHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        'w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-cafe-500 focus:outline-none focus:ring-1 focus:ring-cafe-500',
        className
      )}
      {...props}
    />
  );
}
