import type { ReactNode } from 'react';
import { obtenerEliminaciones } from '@/lib/db/queries';
import { EliminacionesSidebar } from '@/components/eliminaciones-sidebar';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const log = await obtenerEliminaciones();

  return (
    <div className="flex items-start gap-6">
      <aside className="sticky top-8 w-64 shrink-0">
        <EliminacionesSidebar log={log} />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
