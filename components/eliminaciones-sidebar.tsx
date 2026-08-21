import type { EliminacionLog } from '@/lib/calculo';
import { formatFechaHora, formatKg } from '@/lib/format';
import { Card } from './ui/card';

const tipoLabel: Record<EliminacionLog['tipo'], string> = {
  saldo_inicial: 'Saldo inicial',
  ingreso_verde: 'Ingreso verde',
  recepcion_tostado: 'Recepción tostado',
};

function resumen(log: EliminacionLog): string {
  if (log.tipo === 'recepcion_tostado') {
    return `${log.bolsas ?? '—'} bolsas × ${formatKg(log.pesoBolsaKg)} kg`;
  }
  return `${formatKg(log.kgVerde)} kg`;
}

export function EliminacionesSidebar({ log }: { log: EliminacionLog[] }) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-100">Log de eliminaciones</h2>
      {log.length === 0 ? (
        <p className="text-sm text-neutral-500">Todavía no se eliminó ningún movimiento.</p>
      ) : (
        <ul className="space-y-3">
          {log.map((entry) => (
            <li key={entry.id} className="border-b border-neutral-800 pb-3 last:border-0 last:pb-0">
              <p className="text-sm font-medium text-neutral-200">{entry.nombre}</p>
              <p className="text-xs text-neutral-500">{formatFechaHora(entry.eliminadoEn)}</p>
              <p className="mt-1 text-xs text-neutral-400">
                {tipoLabel[entry.tipo]} ({entry.fecha}) — {resumen(entry)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
