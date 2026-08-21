import { clsx } from 'clsx';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import type { Kpis } from '@/lib/calculo';
import { formatKg, formatBolsasEntero, formatBolsasTeoricas } from '@/lib/format';

export function KpiCards({ kpis }: { kpis: Kpis }) {
  const remanenteNegativo = kpis.stockVerdeRemanente < 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card className={remanenteNegativo ? 'border-red-800' : undefined}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-400">Stock Verde Remanente</p>
          {remanenteNegativo && <Badge variant="alerta">Saldo negativo</Badge>}
        </div>
        <p
          className={clsx(
            'mt-2 text-2xl font-semibold',
            remanenteNegativo ? 'text-red-400' : 'text-neutral-100'
          )}
        >
          {formatKg(kpis.stockVerdeRemanente)} kg
        </p>
      </Card>
      <Card>
        <p className="text-sm text-neutral-400">Total Verde Ingresado</p>
        <p className="mt-2 text-2xl font-semibold text-neutral-100">
          {formatKg(kpis.totalVerdeIngresado)} kg
        </p>
      </Card>
      <Card>
        <p className="text-sm text-neutral-400">Tostado Recibido</p>
        <p className="mt-2 text-2xl font-semibold text-neutral-100">
          {formatKg(kpis.tostadoRecibido)} kg
        </p>
      </Card>
      <Card>
        <p className="text-sm text-neutral-400">Verde Consumido (teórico)</p>
        <p className="mt-2 text-2xl font-semibold text-neutral-100">
          {formatKg(kpis.verdeConsumidoTeorico)} kg
        </p>
      </Card>
      <Card>
        <p className="text-sm text-neutral-400">Bolsas Entregadas</p>
        <p className="mt-2 text-2xl font-semibold text-neutral-100">
          {formatBolsasEntero(kpis.bolsasEntregadas)}
        </p>
      </Card>
      <Card>
        <p className="text-sm text-neutral-400">Bolsas Teóricas (remanente)</p>
        <p className="mt-2 text-2xl font-semibold text-neutral-100">
          {formatBolsasTeoricas(kpis.bolsasTeoricas)}
        </p>
      </Card>
    </div>
  );
}
