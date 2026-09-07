# Salida Bolsa Café Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth movement type, `salida_bolsa_cafe` ("Salida Bolsa Café"), that registers roasted-coffee bags leaving to retail locations, and a new "Stock Bolsas Tostadas" KPI (bags received from the roaster minus bags sent out).

**Architecture:** Extend the existing `movimientos`/`eliminacionesLog` tipo enum (shared between both tables via one new constant) with a fourth value; thread it through validation, the create-movement server action, the movement form, the ledger table, the deletion-audit sidebar, and `calcularKpis`. No new tables — reuses the existing `bolsas`/`numeroRemito`/`notas` columns.

**Tech Stack:** TypeScript, Drizzle ORM (Turso/libsql), Next.js 14 App Router (Server Actions), Zod, Vitest, Tailwind.

**Spec:** `docs/superpowers/specs/2026-08-22-salida-bolsa-cafe-design.md`

---

### Task 1: Shared `TIPOS_MOVIMIENTO` constant + schema migration

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Add the shared constant and use it in both tables**

In `lib/db/schema.ts`, add (near the top, after the imports):

```ts
export const TIPOS_MOVIMIENTO = [
  'saldo_inicial',
  'ingreso_verde',
  'recepcion_tostado',
  'salida_bolsa_cafe',
] as const;
```

Then change BOTH occurrences of the inline enum array to reference it:

In `movimientos` (currently):
```ts
  tipo: text('tipo', {
    enum: ['saldo_inicial', 'ingreso_verde', 'recepcion_tostado'],
  }).notNull(),
```
becomes:
```ts
  tipo: text('tipo', { enum: TIPOS_MOVIMIENTO }).notNull(),
```

In `eliminacionesLog` (currently the same array, duplicated):
```ts
  tipo: text('tipo', {
    enum: ['saldo_inicial', 'ingreso_verde', 'recepcion_tostado'],
  }).notNull(),
```
becomes:
```ts
  tipo: text('tipo', { enum: TIPOS_MOVIMIENTO }).notNull(),
```

Note: `text('tipo', { enum: [...] })` is TypeScript-only for SQLite in Drizzle — it does not
generate a database `CHECK` constraint. This change matters at compile time (so
`eliminarMovimiento`'s insert into `eliminacionesLog` type-checks against the same 4-value
type as `movimientos`), not at the SQL level.

- [ ] **Step 2: Generate and apply the migration locally**

Run: `npm run db:generate`
Expected: since this only changes a TypeScript-level enum annotation (not actual column
type/nullability/name), drizzle-kit may generate an empty or no-op migration, or none at all —
that's fine and expected. If a migration file IS generated, apply it:

Run: `npm run db:push`
Expected: reports no changes needed, or applies cleanly.

- [ ] **Step 3: Commit**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat: extract shared TIPOS_MOVIMIENTO const, add salida_bolsa_cafe"
```

(If Step 2 generated no migration file, just `git add lib/db/schema.ts`.)

---

### Task 2: `TipoMovimiento` derives from the shared constant; `Kpis` gains the two new fields

**Files:**
- Modify: `lib/calculo.ts:1` (type), `lib/calculo.ts:40-52` (Kpis/calcularKpis), `lib/calculo.ts:62-78` (calcularArrastre — no logic change, just confirm it compiles)
- Test: `lib/calculo.test.ts`

- [ ] **Step 1: Update `lib/calculo.test.ts` first (TDD)**

At the top of `lib/calculo.test.ts`, the `mov()` helper's default object already covers all
`Movimiento` fields — no changes needed there. In the `describe('calcularKpis', ...)` block:

1. Fix the existing "no movimientos" test (currently expects a 6-key object) — find:
```ts
  it('devuelve ceros cuando no hay movimientos', () => {
    expect(calcularKpis([], config)).toEqual({
      stockVerdeRemanente: 0,
      totalVerdeIngresado: 0,
      tostadoRecibido: 0,
      verdeConsumidoTeorico: 0,
      bolsasEntregadas: 0,
      bolsasTeoricas: 0,
    });
  });
```
and change the expected object to:
```ts
  it('devuelve ceros cuando no hay movimientos', () => {
    expect(calcularKpis([], config)).toEqual({
      stockVerdeRemanente: 0,
      totalVerdeIngresado: 0,
      tostadoRecibido: 0,
      verdeConsumidoTeorico: 0,
      bolsasEntregadas: 0,
      bolsasTeoricas: 0,
      bolsasSalidas: 0,
      stockBolsasTostadas: 0,
    });
  });
```

2. Add new test cases at the end of the `describe('calcularKpis', ...)` block, before its
   closing `});`:

```ts
  it('bolsasSalidas suma correctamente sobre varios movimientos salida_bolsa_cafe', () => {
    const movimientos: Movimiento[] = [
      mov({ id: 1, tipo: 'recepcion_tostado', fecha: '2026-01-01', bolsas: 20, kgTostado: 60, kgVerdeConsumido: 72.29 }),
      mov({ id: 2, tipo: 'salida_bolsa_cafe', fecha: '2026-01-05', bolsas: 5 }),
      mov({ id: 3, tipo: 'salida_bolsa_cafe', fecha: '2026-01-10', bolsas: 7 }),
    ];

    expect(calcularKpis(movimientos, config).bolsasSalidas).toBe(12);
  });

  it('stockBolsasTostadas es bolsasEntregadas menos bolsasSalidas', () => {
    const movimientos: Movimiento[] = [
      mov({ id: 1, tipo: 'recepcion_tostado', fecha: '2026-01-01', bolsas: 20, kgTostado: 60, kgVerdeConsumido: 72.29 }),
      mov({ id: 2, tipo: 'salida_bolsa_cafe', fecha: '2026-01-05', bolsas: 5 }),
    ];

    expect(calcularKpis(movimientos, config).stockBolsasTostadas).toBe(15);
  });

  it('stockBolsasTostadas puede quedar negativo, sin clampear', () => {
    const movimientos: Movimiento[] = [
      mov({ id: 1, tipo: 'recepcion_tostado', fecha: '2026-01-01', bolsas: 5, kgTostado: 15, kgVerdeConsumido: 18.07 }),
      mov({ id: 2, tipo: 'salida_bolsa_cafe', fecha: '2026-01-05', bolsas: 8 }),
    ];

    expect(calcularKpis(movimientos, config).stockBolsasTostadas).toBe(-3);
  });
```

3. Add one new test case to `describe('calcularArrastre', ...)`, before its closing `});`:

```ts
  it('salida_bolsa_cafe no afecta el saldo verde', () => {
    const movimientos: Movimiento[] = [
      mov({ id: 1, tipo: 'saldo_inicial', fecha: '2026-01-01', kgVerde: 100 }),
      mov({ id: 2, tipo: 'salida_bolsa_cafe', fecha: '2026-01-02', bolsas: 5 }),
    ];

    const resultado = calcularArrastre(movimientos);
    expect(resultado[1].saldoVerde).toBe(100);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- lib/calculo.test.ts`
Expected: FAIL — `vitest run` transpiles via esbuild without type-checking, so referencing
`tipo: 'salida_bolsa_cafe'` in a `Movimiento` literal doesn't itself error; instead the new
assertions fail because `calcularKpis` doesn't yet return `bolsasSalidas`/`stockBolsasTostadas`
(both `undefined`), and the updated "no movimientos" `toEqual` fails on the two extra expected
keys.

- [ ] **Step 3: Update `lib/calculo.ts`**

Change the top of the file (currently `export type TipoMovimiento = 'saldo_inicial' |
'ingreso_verde' | 'recepcion_tostado';`) to:

```ts
import { TIPOS_MOVIMIENTO } from './db/schema';

export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];
```

(This must be a normal value import, not `import type` — `typeof TIPOS_MOVIMIENTO` needs the
real binding. It's elided from the compiled output since it's only used in a type position, so
it doesn't pull `drizzle-orm` into any client bundle, and there's no circular-import risk since
`lib/db/schema.ts` only imports from `drizzle-orm`/`drizzle-orm/sqlite-core`.)

`calcularArrastre` needs no logic change — its `if/else if` already only branches on
`saldo_inicial`/`ingreso_verde`/`recepcion_tostado`; `salida_bolsa_cafe` correctly falls through
untouched, leaving `saldoVerde` unaffected.

Update the `Kpis` interface (currently ends with `bolsasTeoricas: number;`) to add two fields:
```ts
export interface Kpis {
  stockVerdeRemanente: number;
  totalVerdeIngresado: number;
  tostadoRecibido: number;
  verdeConsumidoTeorico: number;
  bolsasEntregadas: number;
  bolsasTeoricas: number;
  bolsasSalidas: number;
  stockBolsasTostadas: number;
}
```

Update `calcularKpis` to compute and return the two new fields. After the existing
`bolsasTeoricas` calculation and before the `return` statement, add:

```ts
  const bolsasSalidas = movimientos
    .filter((m) => m.tipo === 'salida_bolsa_cafe')
    .reduce((acc, m) => acc + (m.bolsas ?? 0), 0);

  // Sin clamp — puede quedar negativo, igual que stockVerdeRemanente, si se registran más
  // bolsas de salida que las efectivamente recibidas del tostadero.
  const stockBolsasTostadas = bolsasEntregadas - bolsasSalidas;
```

And add both new fields to the returned object:
```ts
  return {
    stockVerdeRemanente,
    totalVerdeIngresado,
    tostadoRecibido,
    verdeConsumidoTeorico,
    bolsasEntregadas,
    bolsasTeoricas,
    bolsasSalidas,
    stockBolsasTostadas,
  };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- lib/calculo.test.ts`
Expected: PASS (all tests, including the pre-existing ones and the new ones above).

- [ ] **Step 5: Run the build to catch any remaining type errors**

Run: `npm run build`
Expected: this will FAIL at this point — specifically in `components/ledger-table.tsx` and
`components/eliminaciones-sidebar.tsx`, whose `Record<Movimiento['tipo'], ...>` /
`Record<EliminacionLog['tipo'], ...>` objects (`tipoBadge`, `tipoLabel`) are no longer
exhaustive once the union has a 4th member. The other files that reference `Movimiento`/`Kpis`/
`TipoMovimiento` (`lib/validation.ts`, `lib/actions.ts`, `components/movement-form.tsx`,
`components/kpi-cards.tsx`) consume them structurally, without exhaustively enumerating the
union, so they don't error yet at this point — that's expected too, not a sign something's
missing. Confirm the only two errors are in `ledger-table.tsx`/`eliminaciones-sidebar.tsx`
(both fixed in Tasks 7–8), then proceed.

- [ ] **Step 6: Commit**

```bash
git add lib/calculo.ts lib/calculo.test.ts
git commit -m "feat: derive TipoMovimiento from shared const, add bolsasSalidas/stockBolsasTostadas"
```

---

### Task 3: `salidaBolsaCafeSchema` validation

**Files:**
- Modify: `lib/validation.ts`

- [ ] **Step 1: Add the schema and add it to the discriminated union**

Add, after `recepcionTostadoSchema` and before `crearMovimientoSchema`:

```ts
export const salidaBolsaCafeSchema = z.object({
  tipo: z.literal('salida_bolsa_cafe'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  bolsas: z.coerce.number().positive('La cantidad de bolsas debe ser mayor a 0'),
  numeroRemito: z.string().optional(),
  notas: z.string().optional(),
});
```

Change `crearMovimientoSchema` from:
```ts
export const crearMovimientoSchema = z.discriminatedUnion('tipo', [
  saldoInicialSchema,
  ingresoVerdeSchema,
  recepcionTostadoSchema,
]);
```
to:
```ts
export const crearMovimientoSchema = z.discriminatedUnion('tipo', [
  saldoInicialSchema,
  ingresoVerdeSchema,
  recepcionTostadoSchema,
  salidaBolsaCafeSchema,
]);
```

- [ ] **Step 2: Run the build**

Run: `npm run build`
Expected: still fails, and this step actually introduces NEW errors on top of Task 2's two
(`ledger-table.tsx`, `eliminaciones-sidebar.tsx`) — widening `CrearMovimientoInput` to 4
discriminated members breaks the implicit "else means recepcion_tostado" narrowing in
`crearMovimiento`'s trailing `else` branch (`lib/actions.ts`), so `data.mermaPct`/
`data.pesoBolsaKg` there now fail to type-check (that branch's `data` is no longer narrowed to
just `recepcion_tostado`'s shape). This is expected — `lib/validation.ts` itself has no errors,
but this task's change is exactly what makes Task 4's restructuring of `crearMovimiento`
necessary, not just cosmetic. Confirm the new errors are in `lib/actions.ts` (plus the two
carried over from Task 2), then proceed — Task 4 fixes all of them.

- [ ] **Step 3: Commit**

```bash
git add lib/validation.ts
git commit -m "feat: add salidaBolsaCafeSchema validation"
```

---

### Task 4: `crearMovimiento` server action handles `salida_bolsa_cafe`

**Files:**
- Modify: `lib/actions.ts:13-65`

- [ ] **Step 1: Restructure the tipo branching**

The current `crearMovimiento` body has:
```ts
    if (data.tipo === 'saldo_inicial') {
      await db.insert(movimientos).values({ ... });
    } else if (data.tipo === 'ingreso_verde') {
      await db.insert(movimientos).values({ ... });
    } else {
      const config = await obtenerConfiguracion();
      const mermaPct = data.mermaPct ?? config.mermaPctDefault;
      const kgTostado = calcularKgTostado(data.bolsas, data.pesoBolsaKg);
      const kgVerdeConsumido = calcularVerdeConsumido(kgTostado, mermaPct);

      await db.insert(movimientos).values({
        tipo: 'recepcion_tostado',
        ...
      });
    }
```

Change the trailing `else` to an explicit `else if (data.tipo === 'recepcion_tostado')`, and add
a new final `else` for `salida_bolsa_cafe`:

```ts
    if (data.tipo === 'saldo_inicial') {
      await db.insert(movimientos).values({
        tipo: 'saldo_inicial',
        fecha: data.fecha,
        createdAt: new Date().toISOString(),
        numeroRemito: data.numeroRemito || null,
        kgVerde: data.kgVerde,
        notas: data.notas || null,
      });
    } else if (data.tipo === 'ingreso_verde') {
      await db.insert(movimientos).values({
        tipo: 'ingreso_verde',
        fecha: data.fecha,
        createdAt: new Date().toISOString(),
        numeroRemito: data.numeroRemito,
        kgVerde: data.kgVerde,
        notas: data.notas || null,
      });
    } else if (data.tipo === 'recepcion_tostado') {
      const config = await obtenerConfiguracion();
      const mermaPct = data.mermaPct ?? config.mermaPctDefault;
      const kgTostado = calcularKgTostado(data.bolsas, data.pesoBolsaKg);
      const kgVerdeConsumido = calcularVerdeConsumido(kgTostado, mermaPct);

      await db.insert(movimientos).values({
        tipo: 'recepcion_tostado',
        fecha: data.fecha,
        createdAt: new Date().toISOString(),
        numeroRemito: data.numeroRemito,
        bolsas: data.bolsas,
        pesoBolsaKg: data.pesoBolsaKg,
        kgTostado,
        mermaPctAplicada: mermaPct,
        kgVerdeConsumido,
        notas: data.notas || null,
      });
    } else {
      await db.insert(movimientos).values({
        tipo: 'salida_bolsa_cafe',
        fecha: data.fecha,
        createdAt: new Date().toISOString(),
        numeroRemito: data.numeroRemito || null,
        bolsas: data.bolsas,
        notas: data.notas || null,
      });
    }
```

`eliminarMovimiento` does NOT change — it already copies all fields of the read `movimiento`
generically regardless of type, so once Task 1's schema change lands, a `salida_bolsa_cafe`
movement is already auditable without any code change here.

- [ ] **Step 2: Run the build**

Run: `npm run build`
Expected: still fails — but the errors this fixed (Task 3's new `lib/actions.ts` ones) are
gone now. Remaining errors should be only the same two as after Task 2:
`components/ledger-table.tsx` and `components/eliminaciones-sidebar.tsx`.
`components/movement-form.tsx` and `components/kpi-cards.tsx` do NOT error at this point — they
consume the types structurally and aren't affected until their own tasks add code that
references `salida_bolsa_cafe` explicitly.

- [ ] **Step 3: Commit**

```bash
git add lib/actions.ts
git commit -m "feat: handle salida_bolsa_cafe in crearMovimiento"
```

---

### Task 5: `movement-form.tsx` — new option, split bolsas field, optional remito, buildInput branch

**Files:**
- Modify: `components/movement-form.tsx`

- [ ] **Step 1: Import the shared `TipoMovimiento` instead of the local duplicate**

Change:
```ts
type TipoMovimiento = 'saldo_inicial' | 'ingreso_verde' | 'recepcion_tostado';
```
to:
```ts
import type { TipoMovimiento } from '@/lib/calculo';
```
(Add this to the existing import block near the top of the file, e.g. alongside the
`calcularKgTostado`/`calcularVerdeConsumido` import from `@/lib/calculo`, and delete the old
local `type TipoMovimiento = ...` line entirely.)

- [ ] **Step 2: Add the new `<option>`**

In the `<Select id="tipo" ...>` block, add a fourth option after "Recepción de café tostado":
```tsx
<option value="salida_bolsa_cafe">Salida Bolsa Café</option>
```

- [ ] **Step 3: Split the "Cantidad de bolsas" field out of the recepcion_tostado-only block**

The current code has one block:
```tsx
        {tipo === 'recepcion_tostado' && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="bolsas">Cantidad de bolsas</Label>
                <Input id="bolsas" type="number" min="0" value={bolsas} onChange={(e) => setBolsas(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="pesoBolsaKg">Peso por bolsa (kg)</Label>
                ...
              </div>
              <div>
                <Label htmlFor="mermaPct">Merma aplicada (%)</Label>
                ...
              </div>
            </div>
            {preview && (...)}
          </>
        )}
```

Leave that whole block exactly as-is (still conditioned on `tipo === 'recepcion_tostado'` only —
it keeps its own "Cantidad de bolsas" field, unchanged), and add a NEW, separate block right
after it for `salida_bolsa_cafe`:

```tsx
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
```

(Uses a different `id`/`htmlFor`, `bolsasSalida`, to avoid a duplicate DOM id with the
recepcion_tostado block's `bolsas` input — React won't render both at once since they're
mutually exclusive on `tipo`, but distinct ids are still good practice. Both bind to the same
`bolsas`/`setBolsas` state — no new state needed.)

- [ ] **Step 4: Make "Número de remito" optional for `salida_bolsa_cafe`**

Current:
```tsx
          {tipo !== 'saldo_inicial' && (
            <div>
              <Label htmlFor="numeroRemito">Número de remito</Label>
              <Input id="numeroRemito" value={numeroRemito} onChange={(e) => setNumeroRemito(e.target.value)} required />
            </div>
          )}
```
Change the `required` attribute to be conditional:
```tsx
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
```

- [ ] **Step 5: Add the `buildInput()` branch**

The current `buildInput()` is three independent `if` blocks with early returns (no
`else`/`else if`) ending in an unconditional trailing `return` that implicitly assumes
`saldo_inicial`:
```ts
    if (tipo === 'recepcion_tostado') {
      return { ... };
    }

    if (tipo === 'ingreso_verde') {
      return { ... };
    }

    return {
      tipo,
      fecha,
      kgVerde: Number(kgVerde),
      numeroRemito: numeroRemito || undefined,
      notas: notasInput,
    };
```

Add a new `if` block for `salida_bolsa_cafe`, before the final trailing `return`:
```ts
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
```

- [ ] **Step 6: Update `limpiarCamposEspecificos()` if needed**

Read the current `limpiarCamposEspecificos()` function — it already resets `numeroRemito`,
`kgVerde`, `bolsas`, `notas` after a successful submit, which covers `salida_bolsa_cafe`'s
fields too (`bolsas`, `numeroRemito`, `notas`). No change needed here — just confirm this by
reading the function before moving on.

- [ ] **Step 7: Run the build**

Run: `npm run build`
Expected: still fails — but only the same two errors as before this task:
`components/ledger-table.tsx` and `components/eliminaciones-sidebar.tsx`.
`components/kpi-cards.tsx` does NOT error yet (Task 6 is the one that touches it).

- [ ] **Step 8: Commit**

```bash
git add components/movement-form.tsx
git commit -m "feat: add Salida Bolsa Café option to movement form"
```

---

### Task 6: KPI card — "Stock Bolsas Tostadas"

**Files:**
- Modify: `components/kpi-cards.tsx`

- [ ] **Step 1: Widen the grid and add the new card**

Change the grid `div`'s className from `'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'`
to `'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'`.

Add a new `const` right after `remanenteNegativo` is declared:
```ts
  const stockBolsasNegativo = kpis.stockBolsasTostadas < 0;
```

Add a new `Card` as the LAST card in the grid (after "Bolsas Teóricas (remanente)", before the
closing `</div>`):
```tsx
      <Card className={stockBolsasNegativo ? 'border-red-800' : undefined}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-400">Stock Bolsas Tostadas</p>
          {stockBolsasNegativo && <Badge variant="alerta">Saldo negativo</Badge>}
        </div>
        <p
          className={clsx(
            'mt-2 text-2xl font-semibold',
            stockBolsasNegativo ? 'text-red-400' : 'text-neutral-100'
          )}
        >
          {formatBolsasEntero(kpis.stockBolsasTostadas)}
        </p>
      </Card>
```

Note: this uses `formatBolsasEntero` (already imported in this file), NOT `formatKg` — it's a
bag count, not kilograms, so there's no `" kg"` suffix (unlike "Stock Verde Remanente").

- [ ] **Step 2: Run the build**

Run: `npm run build`
Expected: still fails — remaining errors should now only be in `components/ledger-table.tsx`
and `components/eliminaciones-sidebar.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/kpi-cards.tsx
git commit -m "feat: add Stock Bolsas Tostadas KPI card"
```

---

### Task 7: Ledger table — badge, detail, "Verde ±" fix

**Files:**
- Modify: `components/ledger-table.tsx`

- [ ] **Step 1: Widen `tipoBadge`'s type and add the new entry**

Change:
```ts
const tipoBadge: Record<Movimiento['tipo'], { label: string; variant: 'inicial' | 'verde' | 'tostado' }> = {
  saldo_inicial: { label: 'Saldo inicial', variant: 'inicial' },
  ingreso_verde: { label: 'Ingreso verde', variant: 'verde' },
  recepcion_tostado: { label: 'Recepción tostado', variant: 'tostado' },
};
```
to:
```ts
const tipoBadge: Record<Movimiento['tipo'], { label: string; variant: 'inicial' | 'verde' | 'tostado' | 'neutral' }> = {
  saldo_inicial: { label: 'Saldo inicial', variant: 'inicial' },
  ingreso_verde: { label: 'Ingreso verde', variant: 'verde' },
  recepcion_tostado: { label: 'Recepción tostado', variant: 'tostado' },
  salida_bolsa_cafe: { label: 'Salida Bolsa Café', variant: 'neutral' },
};
```

- [ ] **Step 2: Update the "Detalle" column**

Change:
```tsx
                <td className="px-4 py-3">
                  {m.tipo === 'recepcion_tostado'
                    ? `${m.bolsas} bolsas × ${formatKg(m.pesoBolsaKg)} kg (merma ${m.mermaPctAplicada}%)`
                    : (m.notas ?? '—')}
                </td>
```
to:
```tsx
                <td className="px-4 py-3">
                  {m.tipo === 'recepcion_tostado'
                    ? `${m.bolsas} bolsas × ${formatKg(m.pesoBolsaKg)} kg (merma ${m.mermaPctAplicada}%)`
                    : m.tipo === 'salida_bolsa_cafe'
                      ? `${m.bolsas} bolsas`
                      : (m.notas ?? '—')}
                </td>
```

- [ ] **Step 3: Fix "Verde ±" to avoid `+—` for movements with no `kgVerde`**

Change:
```tsx
                <td className="px-4 py-3 text-right">
                  {m.tipo === 'recepcion_tostado'
                    ? `-${formatKg(m.kgVerdeConsumido)}`
                    : `+${formatKg(m.kgVerde)}`}
                </td>
```
to:
```tsx
                <td className="px-4 py-3 text-right">
                  {m.tipo === 'recepcion_tostado'
                    ? `-${formatKg(m.kgVerdeConsumido)}`
                    : m.kgVerde !== null
                      ? `+${formatKg(m.kgVerde)}`
                      : '—'}
                </td>
```

(`m.tipo === 'salida_bolsa_cafe'` movements have `kgVerde === null`, so they'll now correctly
show `—` instead of `+—`. `saldo_inicial`/`ingreso_verde` are unaffected — they always have a
non-null `kgVerde`.)

The "Tostado +" column needs no change — it already shows `—` for any non-`recepcion_tostado`
row.

- [ ] **Step 4: Run the build**

Run: `npm run build`
Expected: still fails — remaining errors should now only be in
`components/eliminaciones-sidebar.tsx`.

- [ ] **Step 5: Commit**

```bash
git add components/ledger-table.tsx
git commit -m "feat: show Salida Bolsa Café in ledger table, fix Verde column for bagless types"
```

---

### Task 8: Deletion-audit sidebar — label and summary for the new type

**Files:**
- Modify: `components/eliminaciones-sidebar.tsx`

- [ ] **Step 1: Add the label**

Change:
```ts
const tipoLabel: Record<EliminacionLog['tipo'], string> = {
  saldo_inicial: 'Saldo inicial',
  ingreso_verde: 'Ingreso verde',
  recepcion_tostado: 'Recepción tostado',
};
```
to:
```ts
const tipoLabel: Record<EliminacionLog['tipo'], string> = {
  saldo_inicial: 'Saldo inicial',
  ingreso_verde: 'Ingreso verde',
  recepcion_tostado: 'Recepción tostado',
  salida_bolsa_cafe: 'Salida Bolsa Café',
};
```

(No type-widening needed here — unlike `tipoBadge` in ledger-table.tsx, this `Record`'s value
type is a plain `string`, not a restricted union.)

- [ ] **Step 2: Add the summary branch**

Current `resumen()`:
```ts
function resumen(log: EliminacionLog): string {
  if (log.tipo === 'recepcion_tostado') {
    return `${log.bolsas ?? '—'} bolsas × ${formatKg(log.pesoBolsaKg)} kg`;
  }
  return `${formatKg(log.kgVerde)} kg`;
}
```
Add a branch for `salida_bolsa_cafe` before the final `return`:
```ts
function resumen(log: EliminacionLog): string {
  if (log.tipo === 'recepcion_tostado') {
    return `${log.bolsas ?? '—'} bolsas × ${formatKg(log.pesoBolsaKg)} kg`;
  }
  if (log.tipo === 'salida_bolsa_cafe') {
    return `${log.bolsas ?? '—'} bolsas`;
  }
  return `${formatKg(log.kgVerde)} kg`;
}
```

- [ ] **Step 3: Run the full build and test suite**

Run: `npm run build`
Expected: SUCCEEDS now — this was the last file with a type error from the 4th `TipoMovimiento`
value.

Run: `npm run test`
Expected: PASS (all tests, unchanged count from Task 2 plus whatever was already there).

- [ ] **Step 4: Commit**

```bash
git add components/eliminaciones-sidebar.tsx
git commit -m "feat: show Salida Bolsa Café in deletion audit sidebar"
```

---

### Task 9: Manual verification in preview

- [ ] **Step 1: End-to-end check**

Use the project's preview tooling to start the dev server, log in, and:
1. Open the movement form, select "Salida Bolsa Café" — confirm only "Cantidad de bolsas",
   "Fecha", "Número de remito" (not marked required), and "Notas" show; no peso/merma/preview.
2. Submit one with just fecha + bolsas (no remito) — confirm it saves successfully.
3. Confirm the new row appears in the ledger table with the "Salida Bolsa Café" badge, correct
   bag count in "Detalle", `—` in "Verde ±", `—` in "Tostado +".
4. Confirm the dashboard now shows 7 KPI cards in a 4-column grid (rows of 4 and 3), and "Stock
   Bolsas Tostadas" reflects bags received minus bags sent out.
5. Delete that test movement with the correct `DELETE_CODE` — confirm it succeeds (validates
   the `eliminacionesLog` insert accepts the new tipo) and the deletion-audit sidebar shows
   "Salida Bolsa Café" with the correct bag count.

No commit needed for this step — it's verification only.
