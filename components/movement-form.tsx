'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';
import { crearMovimiento } from '@/lib/actions';
import { calcularKgTostado, calcularVerdeConsumido } from '@/lib/calculo';
import type { TipoMovimiento } from '@/lib/calculo';
import type { CrearMovimientoInput } from '@/lib/validation';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Button } from './ui/button';

const today = () => new Date().toISOString().slice(0, 10);

export function MovementForm({
  mermaPctDefault,
  pesoBolsaDefaultKg,
}: {
  mermaPctDefault: number;
  pesoBolsaDefaultKg: number;
}) {
  const [tipo, setTipo] = useState<TipoMovimiento>('ingreso_verde');
  const [fecha, setFecha] = useState(today());
  const [numeroRemito, setNumeroRemito] = useState('');
  const [kgVerde, setKgVerde] = useState('');
  const [bolsas, setBolsas] = useState('');
  const [pesoBolsaKg, setPesoBolsaKg] = useState(String(pesoBolsaDefaultKg));
  const [mermaPct, setMermaPct] = useState(String(mermaPctDefault));
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const preview = useMemo(() => {
    if (tipo !== 'recepcion_tostado') return null;
    const bolsasNum = Number(bolsas);
    const pesoNum = Number(pesoBolsaKg);
    const mermaNum = Number(mermaPct);
    if (!bolsasNum || !pesoNum || !mermaNum) return null;

    const kgTostado = calcularKgTostado(bolsasNum, pesoNum);
    const kgVerdeConsumido = calcularVerdeConsumido(kgTostado, mermaNum);
    return { kgTostado, kgVerdeConsumido };
  }, [tipo, bolsas, pesoBolsaKg, mermaPct]);

  function limpiarCamposEspecificos() {
    setNumeroRemito('');
    setKgVerde('');
    setBolsas('');
    setNotas('');
  }

  function buildInput(): CrearMovimientoInput {
    const notasInput = notas || undefined;

    if (tipo === 'recepcion_tostado') {
      return {
        tipo,
        fecha,
        numeroRemito,
        bolsas: Number(bolsas),
        pesoBolsaKg: Number(pesoBolsaKg),
        mermaPct: mermaPct ? Number(mermaPct) : undefined,
        notas: notasInput,
      };
    }

    if (tipo === 'ingreso_verde') {
      return {
        tipo,
        fecha,
        kgVerde: Number(kgVerde),
        numeroRemito,
        notas: notasInput,
      };
    }

    if (tipo === 'salida_bolsa_cafe') {
      return {
        tipo,
        fecha,
        bolsas: Number(bolsas),
        numeroRemito: numeroRemito || undefined,
        notas: notasInput,
      };
    }

    return {
      tipo,
      fecha,
      kgVerde: Number(kgVerde),
      numeroRemito: numeroRemito || undefined,
      notas: notasInput,
    };
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const input = buildInput();

    startTransition(async () => {
      const result = await crearMovimiento(input);
      if (!result.success) {
        setError(result.error);
        return;
      }
      limpiarCamposEspecificos();
    });
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-neutral-100">Cargar movimiento</h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="tipo">Tipo de movimiento</Label>
          <Select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimiento)}>
            <option value="saldo_inicial">Saldo inicial</option>
            <option value="ingreso_verde">Ingreso de café verde</option>
            <option value="recepcion_tostado">Recepción de café tostado</option>
            <option value="salida_bolsa_cafe">Salida Bolsa Café</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="fecha">Fecha</Label>
            <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </div>
          {tipo !== 'saldo_inicial' && (
            <div>
              <Label htmlFor="numeroRemito">Número de remito</Label>
              <Input
                id="numeroRemito"
                value={numeroRemito}
                onChange={(e) => setNumeroRemito(e.target.value)}
                required={tipo !== 'salida_bolsa_cafe'}
              />
            </div>
          )}
        </div>

        {(tipo === 'saldo_inicial' || tipo === 'ingreso_verde') && (
          <div>
            <Label htmlFor="kgVerde">Kg de café verde</Label>
            <Input
              id="kgVerde"
              type="number"
              step="0.01"
              min="0"
              value={kgVerde}
              onChange={(e) => setKgVerde(e.target.value)}
              required
            />
          </div>
        )}

        {tipo === 'recepcion_tostado' && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="bolsas">Cantidad de bolsas</Label>
                <Input
                  id="bolsas"
                  type="number"
                  min="0"
                  value={bolsas}
                  onChange={(e) => setBolsas(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="pesoBolsaKg">Peso por bolsa (kg)</Label>
                <Input
                  id="pesoBolsaKg"
                  type="number"
                  step="0.01"
                  min="0"
                  value={pesoBolsaKg}
                  onChange={(e) => setPesoBolsaKg(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="mermaPct">Merma aplicada (%)</Label>
                <Input
                  id="mermaPct"
                  type="number"
                  step="0.01"
                  min="0"
                  max="99"
                  value={mermaPct}
                  onChange={(e) => setMermaPct(e.target.value)}
                  required
                />
              </div>
            </div>

            {preview && (
              <div className="rounded-lg border border-cafe-800 bg-cafe-950/40 px-3 py-2 text-sm text-cafe-300">
                → {preview.kgTostado.toLocaleString('es-AR', { maximumFractionDigits: 2 })} kg tostados
                consumen{' '}
                <strong>
                  {preview.kgVerdeConsumido.toLocaleString('es-AR', { maximumFractionDigits: 2 })} kg
                </strong>{' '}
                de café verde
              </div>
            )}
          </>
        )}

        {tipo === 'salida_bolsa_cafe' && (
          <div>
            <Label htmlFor="bolsasSalida">Cantidad de bolsas</Label>
            <Input
              id="bolsasSalida"
              type="number"
              min="0"
              value={bolsas}
              onChange={(e) => setBolsas(e.target.value)}
              required
            />
          </div>
        )}

        <div>
          <Label htmlFor="notas">Notas (opcional)</Label>
          <Input id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando…' : 'Guardar movimiento'}
        </Button>
      </form>
    </Card>
  );
}
