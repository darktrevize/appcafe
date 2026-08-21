'use client';

import { useState, useTransition } from 'react';
import { eliminarMovimiento } from '@/lib/actions';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';

export function DeleteMovementModal({
  id,
  onClose,
}: {
  id: number;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await eliminarMovimiento(id, codigo, nombre);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <Card className="w-full max-w-sm">
        <h2 className="mb-1 text-lg font-semibold text-neutral-100">Eliminar movimiento</h2>
        <p className="mb-4 text-sm text-neutral-400">
          Esta acción no se puede deshacer. Ingresá tu nombre y el código de autorización.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="codigo">Código</Label>
            <Input
              id="codigo"
              type="password"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleConfirm} disabled={isPending}>
              {isPending ? '…' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
