'use client';

import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Card className="max-w-md text-center">
        <p className="text-lg font-semibold text-neutral-100">Ocurrió un error</p>
        <p className="mt-2 text-sm text-neutral-400">
          No se pudo cargar la información. Verificá la conexión con la base de datos e intentá de nuevo.
        </p>
        <Button className="mt-4" onClick={() => reset()}>
          Reintentar
        </Button>
      </Card>
    </div>
  );
}
