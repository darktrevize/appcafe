import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-sm',
        className
      )}
      {...props}
    />
  );
}
