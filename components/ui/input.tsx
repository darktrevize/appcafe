import type { InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-cafe-500 focus:outline-none focus:ring-1 focus:ring-cafe-500',
        className
      )}
      {...props}
    />
  );
}
