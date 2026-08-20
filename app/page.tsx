import Link from 'next/link';
import { obtenerMovimientos, obtenerConfiguracion } from '@/lib/db/queries';
import { calcularKpis } from '@/lib/calculo';
import { KpiCards } from '@/components/kpi-cards';
import { MovementForm } from '@/components/movement-form';
import { LedgerTable } from '@/components/ledger-table';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [movimientos, config] = await Promise.all([obtenerMovimientos(), obtenerConfiguracion()]);
  const kpis = calcularKpis(movimientos);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100">Control de Stock — Tostado de Café</h1>
          <p className="text-sm text-neutral-400">Cuenta corriente de café verde y tostado con el tostadero</p>
        </div>
        <Link href="/configuracion" className="text-sm text-cafe-400 hover:text-cafe-300">
          Configuración →
        </Link>
      </div>

      <KpiCards kpis={kpis} />

      <MovementForm mermaPctDefault={config.mermaPctDefault} pesoBolsaDefaultKg={config.pesoBolsaDefaultKg} />

      <LedgerTable movimientos={movimientos} />
    </div>
  );
}
