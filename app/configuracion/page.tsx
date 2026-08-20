import Link from 'next/link';
import { obtenerConfiguracion } from '@/lib/db/queries';
import { ConfigForm } from '@/components/config-form';

export const dynamic = 'force-dynamic';

export default async function ConfiguracionPage() {
  const config = await obtenerConfiguracion();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-cafe-400 hover:text-cafe-300">
          ← Volver al dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-neutral-100">Configuración</h1>
      </div>
      <ConfigForm mermaPctDefault={config.mermaPctDefault} pesoBolsaDefaultKg={config.pesoBolsaDefaultKg} />
    </div>
  );
}
