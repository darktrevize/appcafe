import type { LabelHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={clsx('mb-1 block text-sm font-medium text-neutral-300', className)} {...props} />
  );
}
