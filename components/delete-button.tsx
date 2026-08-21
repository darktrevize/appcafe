'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { DeleteMovementModal } from './delete-movement-modal';

export function DeleteButton({ id }: { id: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)} className="px-2 py-1 text-xs">
        Borrar
      </Button>
      {open && <DeleteMovementModal id={id} onClose={() => setOpen(false)} />}
    </>
  );
}
