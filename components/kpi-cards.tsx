import { clsx } from 'clsx';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import type { Kpis } from '@/lib/calculo';

function formatKg(valor: number) {
  return `${valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
}

export function KpiCards({ kpis }: { kpis: Kpis }) {
  const remanenteNegativo = kpis.stockVerdeRemanente < 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          {formatKg(kpis.stockVerdeRemanente)}
        </p>
      </Card>
      <Card>
        <p className="text-sm text-neutral-400">Total Verde Ingresado</p>
        <p className="mt-2 text-2xl font-semibold text-neutral-100">
          {formatKg(kpis.totalVerdeIngresado)}
        </p>
      </Card>
      <Card>
        <p className="text-sm text-neutral-400">Tostado Recibido</p>
        <p className="mt-2 text-2xl font-semibold text-neutral-100">
          {formatKg(kpis.tostadoRecibido)}
        </p>
      </Card>
      <Card>
        <p className="text-sm text-neutral-400">Verde Consumido (teórico)</p>
        <p className="mt-2 text-2xl font-semibold text-neutral-100">
          {formatKg(kpis.verdeConsumidoTeorico)}
        </p>
      </Card>
    </div>
  );
}
