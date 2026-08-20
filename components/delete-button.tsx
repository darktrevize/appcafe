'use client';

import { useTransition } from 'react';
import { eliminarMovimiento } from '@/lib/actions';
import { Button } from './ui/button';

export function DeleteButton({ id }: { id: number }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm('¿Eliminar este movimiento? Esta acción no se puede deshacer.')) return;
    startTransition(async () => {
      const result = await eliminarMovimiento(id);
      if (!result.success) {
        window.alert(result.error);
      }
    });
  }

  return (
    <Button variant="danger" onClick={handleClick} disabled={isPending} className="px-2 py-1 text-xs">
      {isPending ? '…' : 'Borrar'}
    </Button>
  );
}
