# Log de Eliminaciones con Código de Autorización Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require a shared authorization code + the deleter's name before any `movimientos` row can be deleted, persist an audit trail of every successful deletion (with a full snapshot of what was deleted), and show that log in an always-visible sidebar on every authenticated page.

**Architecture:** New `eliminaciones_log` Drizzle table + query + hand-written domain type (following the existing `Movimiento` pattern). `eliminarMovimiento` server action gains `codigo`/`nombre` params, validates the code server-side against `process.env.DELETE_CODE`, snapshots the row, then deletes. UI: a new confirm modal replaces `window.confirm`, and a new `(app)` route group wraps the dashboard + configuración pages with a persistent sidebar, leaving `/login` untouched.

**Tech Stack:** TypeScript, Drizzle ORM (Turso/libsql), Next.js 14 App Router (Server Actions, route groups), Tailwind, Zod.

**Spec:** `docs/superpowers/specs/2026-08-21-log-eliminaciones-design.md`

**No automated tests are added in this plan** — the spec explicitly scopes this out (I/O-heavy feature, no new calculation logic, and the codebase has no UI test infra). Each task instead ends with a manual/build verification step in place of a test-run step.

---

### Task 1: Add the `eliminaciones_log` table and generate the migration

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Add the table definition**

Append to `lib/db/schema.ts` (after the existing `movimientos` table):

```ts
export const eliminacionesLog = sqliteTable('eliminaciones_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  eliminadoEn: text('eliminado_en')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  movimientoId: integer('movimiento_id').notNull(),
  movimientoCreatedAt: text('movimiento_created_at').notNull(),
  tipo: text('tipo', {
    enum: ['saldo_inicial', 'ingreso_verde', 'recepcion_tostado'],
  }).notNull(),
  fecha: text('fecha').notNull(),
  numeroRemito: text('numero_remito'),
  kgVerde: real('kg_verde'),
  bolsas: integer('bolsas'),
  pesoBolsaKg: real('peso_bolsa_kg'),
  kgTostado: real('kg_tostado'),
  mermaPctAplicada: real('merma_pct_aplicada'),
  kgVerdeConsumido: real('kg_verde_consumido'),
  notas: text('notas'),
});
```

(`sql`, `sqliteTable`, `text`, `integer`, `real` are already imported at the top of the file — no new imports needed.)

- [ ] **Step 2: Generate and apply the migration locally**

Run: `npm run db:generate`
Expected: a new file appears under `drizzle/` describing the `CREATE TABLE eliminaciones_log` migration.

Run: `npm run db:push`
Expected: command reports the new table applied to the Turso DB pointed to by your local `.env.local`.

- [ ] **Step 3: Commit**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat: add eliminaciones_log table"
```

---

### Task 2: Add the `EliminacionLog` domain type

**Files:**
- Modify: `lib/calculo.ts`

- [ ] **Step 1: Add the interface next to `Movimiento`**

In `lib/calculo.ts`, after the existing `MovimientoConSaldo` interface (after line 20), add:

```ts
export interface EliminacionLog {
  id: number;
  nombre: string;
  eliminadoEn: string;
  movimientoId: number;
  movimientoCreatedAt: string;
  tipo: TipoMovimiento;
  fecha: string;
  numeroRemito: string | null;
  kgVerde: number | null;
  bolsas: number | null;
  pesoBolsaKg: number | null;
  kgTostado: number | null;
  mermaPctAplicada: number | null;
  kgVerdeConsumido: number | null;
  notas: string | null;
}
```

- [ ] **Step 2: Run the build to confirm no syntax errors**

Run: `npm run build`
Expected: succeeds (this type isn't used anywhere yet, so nothing else should be affected).

- [ ] **Step 3: Commit**

```bash
git add lib/calculo.ts
git commit -m "feat: add EliminacionLog domain type"
```

---

### Task 3: Add `obtenerEliminaciones` query

**Files:**
- Modify: `lib/db/queries.ts`

- [ ] **Step 1: Add the query function**

In `lib/db/queries.ts`, add the import and function:

```ts
import { desc, eq } from 'drizzle-orm';
import { db } from './client';
import { movimientos, configuracion, eliminacionesLog } from './schema';
import type { Movimiento, EliminacionLog } from '../calculo';

// ...existing obtenerMovimientos / obtenerConfiguracion...

export async function obtenerEliminaciones(): Promise<EliminacionLog[]> {
  return db.select().from(eliminacionesLog).orderBy(desc(eliminacionesLog.eliminadoEn));
}
```

(Note: the existing `eq` import stays — it's already used by `obtenerConfiguracion`. Only `desc` and `eliminacionesLog`/`EliminacionLog` are new.)

- [ ] **Step 2: Run the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/db/queries.ts
git commit -m "feat: add obtenerEliminaciones query"
```

---

### Task 4: Add `eliminarMovimientoSchema` validation

**Files:**
- Modify: `lib/validation.ts`

- [ ] **Step 1: Add the schema**

Append to `lib/validation.ts`:

```ts
export const eliminarMovimientoSchema = z.object({
  codigo: z.string().min(1, 'Ingresá el código'),
  nombre: z.string().min(1, 'Ingresá tu nombre'),
});

export type EliminarMovimientoInput = z.infer<typeof eliminarMovimientoSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add lib/validation.ts
git commit -m "feat: add eliminarMovimientoSchema"
```

---

### Task 5: Update `eliminarMovimiento` server action

**Files:**
- Modify: `lib/actions.ts:67-76`

- [ ] **Step 1: Replace the function**

In `lib/actions.ts`, the current imports (lines 1-9) are:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from './db/client';
import { movimientos, configuracion } from './db/schema';
import { obtenerConfiguracion } from './db/queries';
import { calcularKgTostado, calcularVerdeConsumido } from './calculo';
import { crearMovimientoSchema, configuracionSchema } from './validation';
```

Keep `revalidatePath` and `eq` as-is (both are still used — `revalidatePath` by `crearMovimiento`/`actualizarConfiguracion`, `eq` by the new `eliminarMovimiento` body below). Only change the schema and validation import lines, adding the two new names:

```ts
import { movimientos, configuracion, eliminacionesLog } from './db/schema';
```

```ts
import { crearMovimientoSchema, configuracionSchema, eliminarMovimientoSchema } from './validation';
```

Replace `eliminarMovimiento` (lines 67-76) with:

```ts
export async function eliminarMovimiento(
  id: number,
  codigo: string,
  nombre: string
): Promise<ActionResult> {
  const parsed = eliminarMovimientoSchema.safeParse({ codigo, nombre });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  if (parsed.data.codigo !== (process.env.DELETE_CODE ?? '')) {
    return { success: false, error: 'Código incorrecto.' };
  }

  try {
    const [movimiento] = await db.select().from(movimientos).where(eq(movimientos.id, id));
    if (!movimiento) {
      return { success: false, error: 'No se pudo eliminar el movimiento.' };
    }

    // eliminadoEn is set explicitly here (UTC, trailing "Z") instead of relying on the
    // column's CURRENT_TIMESTAMP default — same pattern movimientos.createdAt already
    // uses in crearMovimiento above. The "Z" suffix matters: formatFechaHora (Task 6)
    // needs a value Date() can parse as UTC unambiguously to convert to Argentina time.
    await db.insert(eliminacionesLog).values({
      nombre: parsed.data.nombre,
      eliminadoEn: new Date().toISOString(),
      movimientoId: movimiento.id,
      movimientoCreatedAt: movimiento.createdAt,
      tipo: movimiento.tipo,
      fecha: movimiento.fecha,
      numeroRemito: movimiento.numeroRemito,
      kgVerde: movimiento.kgVerde,
      bolsas: movimiento.bolsas,
      pesoBolsaKg: movimiento.pesoBolsaKg,
      kgTostado: movimiento.kgTostado,
      mermaPctAplicada: movimiento.mermaPctAplicada,
      kgVerdeConsumido: movimiento.kgVerdeConsumido,
      notas: movimiento.notas,
    });

    await db.delete(movimientos).where(eq(movimientos.id, id));

    revalidatePath('/');
    revalidatePath('/configuracion');
    return { success: true };
  } catch (err) {
    console.error('Error al eliminar movimiento', err);
    return { success: false, error: 'No se pudo eliminar el movimiento.' };
  }
}
```

- [ ] **Step 2: Run the build**

Run: `npm run build`
Expected: FAILS at this point — `components/delete-button.tsx` still calls `eliminarMovimiento(id)` with the old 1-argument signature. This is expected; it's fixed in Task 7. Confirm the error is specifically an arity/type mismatch on that call site and nothing else, then proceed (do not fix delete-button.tsx here — that's Task 7's job, keeping this task's diff focused on the action itself).

- [ ] **Step 3: Commit**

```bash
git add lib/actions.ts
git commit -m "feat: require code+nombre and log snapshot in eliminarMovimiento

Note: components/delete-button.tsx still calls the old signature;
fixed in a following commit."
```

---

### Task 6: Add `formatFechaHora`

**Files:**
- Modify: `lib/format.ts`

- [ ] **Step 1: Add the formatter**

Append to `lib/format.ts`:

```ts
export function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
```

`timeZone` is pinned explicitly because the server (Vercel, and the deployed DB) runs in UTC —
without it, `eliminadoEn` (stored/passed as a UTC ISO string, see Task 5) would render in the
server's UTC offset while labeled `es-AR`, showing a time ~3 hours off from actual Argentina
local time.

- [ ] **Step 2: Commit**

```bash
git add lib/format.ts
git commit -m "feat: add formatFechaHora"
```

---

### Task 7: Replace `window.confirm` with a name+code modal

**Files:**
- Create: `components/delete-movement-modal.tsx`
- Modify: `components/delete-button.tsx`

- [ ] **Step 1: Create the modal component**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { eliminarMovimiento } from '@/lib/actions';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';

export function DeleteMovementModal({
  id,
  onClose,
}: {
  id: number;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await eliminarMovimiento(id, codigo, nombre);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <Card className="w-full max-w-sm">
        <h2 className="mb-1 text-lg font-semibold text-neutral-100">Eliminar movimiento</h2>
        <p className="mb-4 text-sm text-neutral-400">
          Esta acción no se puede deshacer. Ingresá tu nombre y el código de autorización.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="codigo">Código</Label>
            <Input
              id="codigo"
              type="password"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleConfirm} disabled={isPending}>
              {isPending ? '…' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Update `DeleteButton` to open the modal instead of `window.confirm`**

Replace the full contents of `components/delete-button.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { DeleteMovementModal } from './delete-movement-modal';

export function DeleteButton({ id }: { id: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)} className="px-2 py-1 text-xs">
        Borrar
      </Button>
      {open && <DeleteMovementModal id={id} onClose={() => setOpen(false)} />}
    </>
  );
}
```

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: succeeds now — the old-signature call site is gone.

- [ ] **Step 4: Commit**

```bash
git add components/delete-movement-modal.tsx components/delete-button.tsx
git commit -m "feat: replace window.confirm with name+code delete modal"
```

---

### Task 8: Add the sidebar component

**Files:**
- Create: `components/eliminaciones-sidebar.tsx`

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add components/eliminaciones-sidebar.tsx
git commit -m "feat: add EliminacionesSidebar component"
```

---

### Task 9: Restructure routes into an `(app)` group with the sidebar layout

**Files:**
- Create: `app/(app)/layout.tsx`
- Move: `app/page.tsx` → `app/(app)/page.tsx`
- Move: `app/configuracion/page.tsx` → `app/(app)/configuracion/page.tsx`

- [ ] **Step 1: Move the two page files (content unchanged)**

```bash
mkdir -p "app/(app)/configuracion"
git mv app/page.tsx "app/(app)/page.tsx"
git mv app/configuracion/page.tsx "app/(app)/configuracion/page.tsx"
```

(`app/configuracion/` should now be empty — remove it if `git mv` didn't clean it up: check with `ls app/configuracion` and `rmdir app/configuracion` if empty.)

- [ ] **Step 2: Create the group layout**

```tsx
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
```

Save as `app/(app)/layout.tsx`.

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: succeeds. `/` and `/configuracion` keep the same URLs (route groups don't affect routing); `/login` is untouched and unaffected since it's outside `app/(app)/`.

- [ ] **Step 4: Commit**

`app/configuracion/` may or may not still exist at this point depending on whether Step 1's
optional `rmdir` ran — use a repo-wide `git add -A` instead of pinning a pathspec to it, so
the commit doesn't fail with "pathspec did not match any files" either way:

```bash
git add -A
git commit -m "feat: add persistent eliminaciones sidebar via (app) route group"
```

---

### Task 10: Add `DELETE_CODE` env var

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Document the new env var**

Append to `.env.example`:

```
DELETE_CODE=1234
```

- [ ] **Step 2: Add it to your local `.env.local`**

Manually add `DELETE_CODE=1234` (or whatever value you want) to `.env.local` — this file is gitignored, so it's not part of this commit. Restart the dev server after editing it.

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "docs: document DELETE_CODE env var"
```

---

### Task 11: Manual verification in preview

- [ ] **Step 1: End-to-end check**

Use the project's preview tooling to start the dev server, log in, and:
1. Confirm the sidebar ("Log de eliminaciones") renders on both `/` and `/configuracion`, and is absent on `/login`.
2. Create a throwaway test movement on the dashboard.
3. Click "Borrar" on it — confirm the modal opens (not a browser `confirm()` dialog).
4. Submit with a wrong code — confirm it shows "Código incorrecto." inline and the movement is NOT deleted (still in the ledger).
5. Submit with the correct code (from `.env.local`) and a name — confirm the movement disappears from the ledger and a new entry appears at the top of the sidebar with that name, a timestamp, and the right movement summary. Check that the displayed hour roughly matches your actual local time in Argentina (not off by ~3 hours) — this validates the `timeZone: 'America/Argentina/Buenos_Aires'` fix in `formatFechaHora`.
6. Navigate to `/configuracion` — confirm the new log entry is still visible there too (validates the `revalidatePath` + shared-layout fetch).

No commit needed for this step — it's verification only.

- [ ] **Step 2: Production migration (separate from this plan's local work)**

Once this plan's code is merged/deployed, apply the schema migration against the production Turso database and add `DELETE_CODE` to Vercel's Production (and Preview) environment variables — same process used earlier to diagnose the `TURSO_DATABASE_URL` issue. This is an operational step, not a code change, and is intentionally left out of the automated task list above; flag it to the user before running `db:push` against production credentials.
