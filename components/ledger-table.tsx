import { calcularArrastre, type Movimiento } from '@/lib/calculo';
import { formatKg } from '@/lib/format';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { DeleteButton } from './delete-button';

const tipoBadge: Record<Movimiento['tipo'], { label: string; variant: 'inicial' | 'verde' | 'tostado' | 'neutral' }> = {
  saldo_inicial: { label: 'Saldo inicial', variant: 'inicial' },
  ingreso_verde: { label: 'Ingreso verde', variant: 'verde' },
  recepcion_tostado: { label: 'Recepción tostado', variant: 'tostado' },
  salida_bolsa_cafe: { label: 'Egreso Café', variant: 'neutral' },
};

export function LedgerTable({ movimientos }: { movimientos: Movimiento[] }) {
  const conSaldo = calcularArrastre(movimientos).slice().reverse();

  if (conSaldo.length === 0) {
    return (
      <Card>
        <p className="text-sm text-neutral-400">Todavía no hay movimientos cargados.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b border-neutral-800 text-neutral-400">
          <tr>
            <th className="px-4 py-3 font-medium">Fecha</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium">Remito</th>
            <th className="px-4 py-3 font-medium">Detalle</th>
            <th className="px-4 py-3 text-right font-medium">Verde ±</th>
            <th className="px-4 py-3 text-right font-medium">Tostado +</th>
            <th className="px-4 py-3 text-right font-medium">Saldo verde</th>
            <th className="px-4 py-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {conSaldo.map((m) => {
            const badge = tipoBadge[m.tipo];
            const saldoNegativo = m.saldoVerde < 0;
            return (
              <tr key={m.id} className="text-neutral-200">
                <td className="whitespace-nowrap px-4 py-3">{m.fecha}</td>
                <td className="px-4 py-3">
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </td>
                <td className="px-4 py-3">{m.numeroRemito ?? '—'}</td>
                <td className="px-4 py-3">
                  {m.tipo === 'recepcion_tostado'
                    ? `${m.bolsas} bolsas × ${formatKg(m.pesoBolsaKg)} kg (merma ${m.mermaPctAplicada}%)`
                    : m.tipo === 'salida_bolsa_cafe'
                      ? `${m.bolsas} bolsas × 3 kg → ${m.sucursal ?? '—'}`
                      : (m.notas ?? '—')}
                </td>
                <td className="px-4 py-3 text-right">
                  {m.tipo === 'recepcion_tostado'
                    ? `-${formatKg(m.kgVerdeConsumido)}`
                    : m.kgVerde !== null
                      ? `+${formatKg(m.kgVerde)}`
                      : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  {m.tipo === 'recepcion_tostado' ? `+${formatKg(m.kgTostado)}` : '—'}
                </td>
                <td
                  className={`px-4 py-3 text-right font-medium ${
                    saldoNegativo ? 'text-red-400' : 'text-neutral-100'
                  }`}
                >
                  {formatKg(m.saldoVerde)}
                  {saldoNegativo && (
                    <Badge variant="alerta" className="ml-2" aria-label="Saldo negativo">
                      !
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <DeleteButton id={m.id} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
