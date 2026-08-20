'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { actualizarConfiguracion } from '@/lib/actions';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';

export function ConfigForm({
  mermaPctDefault,
  pesoBolsaDefaultKg,
}: {
  mermaPctDefault: number;
  pesoBolsaDefaultKg: number;
}) {
  const [mermaPct, setMermaPct] = useState(String(mermaPctDefault));
  const [pesoBolsa, setPesoBolsa] = useState(String(pesoBolsaDefaultKg));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await actualizarConfiguracion({
        mermaPctDefault: Number(mermaPct),
        pesoBolsaDefaultKg: Number(pesoBolsa),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-neutral-100">Configuración</h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">
          Configuración guardada.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="mermaPctDefault">Merma pactada por defecto (%)</Label>
          <Input
            id="mermaPctDefault"
            type="number"
            step="0.01"
            min="0"
            max="99"
            value={mermaPct}
            onChange={(e) => setMermaPct(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="pesoBolsaDefaultKg">Peso de bolsa por defecto (kg)</Label>
          <Input
            id="pesoBolsaDefaultKg"
            type="number"
            step="0.01"
            min="0"
            value={pesoBolsa}
            onChange={(e) => setPesoBolsa(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando…' : 'Guardar configuración'}
        </Button>
      </form>
    </Card>
  );
}
