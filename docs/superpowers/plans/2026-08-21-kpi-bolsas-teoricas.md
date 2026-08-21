# KPIs de Bolsas Entregadas y Teóricas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new KPI cards to the dashboard — total bags delivered (`bolsasEntregadas`) and a theoretical bag count projected from the remaining green-coffee stock (`bolsasTeoricas`) — computed in `lib/calculo.ts` and displayed via `components/kpi-cards.tsx`.

**Architecture:** Pure-function changes to `calcularKpis` (now takes a `config` param for the default merma % and bag weight) plus two new locale-formatted display helpers and two new `Card`s in the existing KPI grid. No schema/DB changes.

**Tech Stack:** TypeScript, Vitest, Next.js 14 App Router, Tailwind.

**Spec:** `docs/superpowers/specs/2026-08-21-kpi-bolsas-teoricas-design.md`

---

### Task 1: Extend `Kpis`/`calcularKpis` with `bolsasEntregadas` and `bolsasTeoricas`

**Files:**
- Modify: `lib/calculo.ts:22-27` (interface), `lib/calculo.ts:55-72` (function)
- Test: `lib/calculo.test.ts:83-113`

- [ ] **Step 1: Update the two existing `calcularKpis` tests to pass a config object (will fail to typecheck until Task 1 Step 3 is done)**

Replace lines 83-113 of `lib/calculo.test.ts` with:

```ts
describe('calcularKpis', () => {
  const config = { mermaPctDefault: 17, pesoBolsaDefaultKg: 3 };

  it('resume stock remanente, ingresos, tostado recibido y verde consumido', () => {
    const movimientos: Movimiento[] = [
      mov({ id: 1, tipo: 'saldo_inicial', fecha: '2026-01-01', kgVerde: 500 }),
      mov({ id: 2, tipo: 'ingreso_verde', fecha: '2026-01-05', kgVerde: 100 }),
      mov({
        id: 3,
        tipo: 'recepcion_tostado',
        fecha: '2026-01-10',
        kgTostado: 60,
        kgVerdeConsumido: 72.29,
      }),
    ];

    const kpis = calcularKpis(movimientos, config);

    expect(kpis.totalVerdeIngresado).toBe(100);
    expect(kpis.tostadoRecibido).toBe(60);
    expect(kpis.verdeConsumidoTeorico).toBeCloseTo(72.29, 2);
    expect(kpis.stockVerdeRemanente).toBeCloseTo(527.71, 2);
  });

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

  it('suma bolsasEntregadas sobre varios movimientos recepcion_tostado', () => {
    const movimientos: Movimiento[] = [
      mov({ id: 1, tipo: 'saldo_inicial', fecha: '2026-01-01', kgVerde: 500 }),
      mov({
        id: 2,
        tipo: 'recepcion_tostado',
        fecha: '2026-01-05',
        bolsas: 10,
        kgTostado: 30,
        kgVerdeConsumido: 36.14,
      }),
      mov({
        id: 3,
        tipo: 'recepcion_tostado',
        fecha: '2026-01-10',
        bolsas: 15,
        kgTostado: 45,
        kgVerdeConsumido: 54.22,
      }),
    ];

    expect(calcularKpis(movimientos, config).bolsasEntregadas).toBe(25);
  });

  it('bolsasTeoricas usa la merma % default y NO redondea', () => {
    const movimientos: Movimiento[] = [
      mov({ id: 1, tipo: 'saldo_inicial', fecha: '2026-01-01', kgVerde: 100 }),
    ];

    // (100 * (1 - 17/100)) / 3 = 83 / 3 = 27.6666...
    expect(calcularKpis(movimientos, config).bolsasTeoricas).toBeCloseTo(27.67, 2);
  });

  it('bolsasTeoricas se clampea a 0 cuando el remanente es negativo', () => {
    const movimientos: Movimiento[] = [
      mov({ id: 1, tipo: 'saldo_inicial', fecha: '2026-01-01', kgVerde: 10 }),
      mov({
        id: 2,
        tipo: 'recepcion_tostado',
        fecha: '2026-01-02',
        kgTostado: 60,
        kgVerdeConsumido: 72.29,
      }),
    ];

    expect(calcularKpis(movimientos, config).bolsasTeoricas).toBe(0);
  });

  it('bolsasTeoricas devuelve 0 en vez de Infinity si pesoBolsaDefaultKg es 0', () => {
    const movimientos: Movimiento[] = [
      mov({ id: 1, tipo: 'saldo_inicial', fecha: '2026-01-01', kgVerde: 100 }),
    ];

    const kpis = calcularKpis(movimientos, { mermaPctDefault: 17, pesoBolsaDefaultKg: 0 });
    expect(kpis.bolsasTeoricas).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- lib/calculo.test.ts`
Expected: FAIL — `vitest run` transpiles via esbuild without type-checking, so the extra `config` argument doesn't cause a compile error, and the current `calcularKpis` doesn't touch its second parameter at all (so nothing throws either). Instead, the returned object simply has no `bolsasEntregadas`/`bolsasTeoricas` keys, so the new assertions (`toBe(25)`, `toBeCloseTo(27.67, 2)`, etc.) fail as `undefined` vs. the expected number, and the "no movimientos" `toEqual` fails because the expected object has two keys the real one lacks.

- [ ] **Step 3: Update `Kpis` interface and `calcularKpis` implementation**

In `lib/calculo.ts`, replace the `Kpis` interface (lines 22-27) with:

```ts
export interface Kpis {
  stockVerdeRemanente: number;
  totalVerdeIngresado: number;
  tostadoRecibido: number;
  verdeConsumidoTeorico: number;
  bolsasEntregadas: number;
  bolsasTeoricas: number;
}

export interface KpisConfig {
  mermaPctDefault: number;
  pesoBolsaDefaultKg: number;
}
```

Replace `calcularKpis` (lines 55-72) with:

```ts
export function calcularKpis(movimientos: Movimiento[], config: KpisConfig): Kpis {
  const conSaldo = calcularArrastre(movimientos);
  const stockVerdeRemanente = conSaldo.length > 0 ? conSaldo[conSaldo.length - 1].saldoVerde : 0;

  const totalVerdeIngresado = movimientos
    .filter((m) => m.tipo === 'ingreso_verde')
    .reduce((acc, m) => acc + (m.kgVerde ?? 0), 0);

  const tostadoRecibido = movimientos
    .filter((m) => m.tipo === 'recepcion_tostado')
    .reduce((acc, m) => acc + (m.kgTostado ?? 0), 0);

  const verdeConsumidoTeorico = movimientos
    .filter((m) => m.tipo === 'recepcion_tostado')
    .reduce((acc, m) => acc + (m.kgVerdeConsumido ?? 0), 0);

  const bolsasEntregadas = movimientos
    .filter((m) => m.tipo === 'recepcion_tostado')
    .reduce((acc, m) => acc + (m.bolsas ?? 0), 0);

  // Verde remanente -> tostado esperado es la relación inversa de calcularVerdeConsumido
  // (que va de tostado -> verde necesario). El remanente se clampea a 0 porque un saldo
  // negativo (ya señalizado en la UI) no debe traducirse en bolsas negativas, y se guarda
  // contra pesoBolsaDefaultKg <= 0 para no devolver Infinity/NaN.
  const bolsasTeoricas =
    config.pesoBolsaDefaultKg <= 0
      ? 0
      : (Math.max(stockVerdeRemanente, 0) * (1 - config.mermaPctDefault / 100)) /
        config.pesoBolsaDefaultKg;

  return {
    stockVerdeRemanente,
    totalVerdeIngresado,
    tostadoRecibido,
    verdeConsumidoTeorico,
    bolsasEntregadas,
    bolsasTeoricas,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- lib/calculo.test.ts`
Expected: PASS (all `calcularKpis` + pre-existing `calcularKgTostado`/`calcularVerdeConsumido`/`calcularArrastre` tests green).

- [ ] **Step 5: Commit**

```bash
git add lib/calculo.ts lib/calculo.test.ts
git commit -m "feat: add bolsasEntregadas and bolsasTeoricas to calcularKpis"
```

---

### Task 2: Add display formatters

**Files:**
- Modify: `lib/format.ts`

- [ ] **Step 1: Add the two new formatters**

Append to `lib/format.ts`:

```ts
export function formatBolsasEntero(valor: number): string {
  return valor.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatBolsasTeoricas(valor: number): string {
  return valor.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/format.ts
git commit -m "feat: add bolsas formatters"
```

---

### Task 3: Wire config into `calcularKpis` call and render the new cards

**Files:**
- Modify: `app/page.tsx:12`
- Modify: `components/kpi-cards.tsx`

- [ ] **Step 1: Pass config into `calcularKpis`**

In `app/page.tsx`, change line 12 from:

```ts
const kpis = calcularKpis(movimientos);
```

to:

```ts
const kpis = calcularKpis(movimientos, config);
```

(`config` is already fetched above via `obtenerConfiguracion()` — no new query needed.)

- [ ] **Step 2: Add the two new KPI cards and switch the grid to 3 columns**

In `components/kpi-cards.tsx`:
1. Add the import: `import { formatKg, formatBolsasEntero, formatBolsasTeoricas } from '@/lib/format';` (replacing the current `formatKg`-only import).
2. Change the grid `div` className from `'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'` to `'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'`.
3. Add two new `Card`s after the existing "Verde Consumido (teórico)" card, before the closing `</div>`:

```tsx
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
```

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: PASS (no test touches `kpi-cards.tsx` or `page.tsx` directly — this step just guards against a stray regression elsewhere).

- [ ] **Step 4: Run the build to catch type errors across call sites**

Run: `npm run build`
Expected: Build succeeds (this is also the check that no other `calcularKpis` call site was missed — TypeScript would fail the build otherwise).

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx components/kpi-cards.tsx
git commit -m "feat: display bolsasEntregadas and bolsasTeoricas KPI cards"
```

---

### Task 4: Manual verification in preview

- [ ] **Step 1: Start the dev server and check the dashboard**

Use the project's preview tooling to start the dev server, log in, and load `/`. Confirm:
- Six KPI cards render in a 3-column grid (2 rows) on desktop width.
- "Bolsas Entregadas" shows the sum of `bolsas` across `recepcion_tostado` rows in the ledger table below.
- "Bolsas Teóricas (remanente)" shows one decimal place (e.g. `27,7`), comma as separator.
- If the current data has a negative saldo verde (red "Saldo negativo" badge), "Bolsas Teóricas" reads `0,0`, not negative.

No commit needed for this step — it's verification only.
