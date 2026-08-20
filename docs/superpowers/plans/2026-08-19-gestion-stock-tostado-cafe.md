# Gestión de Stock y Cuenta Corriente de Tostado de Café — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js (App Router) app that tracks a running "cuenta corriente" of green coffee sent to an external roaster vs. roasted coffee received, computing theoretical green-coffee consumption from a configurable shrinkage (merma) percentage.

**Architecture:** Server Components fetch data from Turso via Drizzle ORM and render KPI cards + a chronological ledger table; a Client Component form handles data entry with a live calculation preview; Server Actions handle all writes (validated with Zod, persisted with Drizzle) and revalidate the page. All shrinkage math lives in one dependency-free module (`lib/calculo.ts`) reused by both the client preview and the server insert path.

**Tech Stack:** Next.js 14 (App Router, Server Actions), TypeScript, Tailwind CSS (dark mode), Drizzle ORM, `@libsql/client` (Turso), Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-19-gestion-stock-tostado-cafe-design.md`

---

## Task 0: Scaffold the Next.js project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `next-env.d.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `vitest.config.ts`
- Create: `app/globals.css`
- Create: `app/layout.tsx`
- Create: `app/page.tsx` (placeholder, replaced in Task 10)
- Create: `.env.example`
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "app-cafe",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install next@14 react@18 react-dom@18 drizzle-orm @libsql/client zod clsx
npm install -D typescript @types/react @types/node @types/react-dom tailwindcss postcss autoprefixer drizzle-kit vitest dotenv "eslint@^8.57.0" "eslint-config-next@14"
```

Note: `eslint`/`eslint-config-next` are pinned to versions compatible with
Next 14's `next lint` (which uses the legacy eslintrc API). Installing
unpinned `eslint`/`eslint-config-next` resolves to ESLint 9+, whose default
`ESLint` class is flat-config-only and rejects the `useEslintrc`/`extensions`
options Next 14 passes internally, making `next lint` throw.

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `next-env.d.ts`**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 5: Create `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

- [ ] **Step 6: Create `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cafe: {
          50: '#fbf5ef',
          100: '#f3e4d3',
          200: '#e5c6a3',
          300: '#d5a26e',
          400: '#c6813f',
          500: '#a8632a',
          600: '#8a4d22',
          700: '#6d3b1c',
          800: '#4f2b16',
          900: '#341b0d',
          950: '#1f0f07',
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 7: Create `postcss.config.js`**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 8: Create `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  color-scheme: dark;
}

body {
  @apply bg-neutral-950 text-neutral-100;
}
```

- [ ] **Step 9: Create `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Control de Stock — Tostado de Café',
  description: 'Cuenta corriente de café verde y tostado con el tostadero',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </body>
    </html>
  );
}
```

- [ ] **Step 10: Create placeholder `app/page.tsx`** (replaced in Task 10)

```tsx
export default function DashboardPage() {
  return <p>Cargando…</p>;
}
```

- [ ] **Step 11: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 12: Create `.env.example`**

```
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

- [ ] **Step 13: Create `.gitignore`**

```
node_modules
.next
.env.local
.env
*.db
*.db-journal
dist
coverage
```

- [ ] **Step 14: Create `.eslintrc.json`**

```json
{
  "extends": "next/core-web-vitals"
}
```

Without this file, `next lint` (used in Task 12) launches an interactive
first-run setup prompt that hangs in a non-interactive shell.

- [ ] **Step 15: Create `README.md`**

```markdown
# App Café — Control de Stock de Tostado

App para llevar la cuenta corriente de café verde enviado a un tostadero externo
vs. café tostado recibido, calculando el consumo teórico de verde a partir de la
merma pactada.

## Setup

1. `npm install`
2. Copiá `.env.example` a `.env.local` y completá `TURSO_DATABASE_URL` y
   `TURSO_AUTH_TOKEN` con las credenciales de tu base en Turso.
3. Generá y aplicá el schema: `npm run db:generate && npm run db:push`
4. `npm run dev`

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` / `npm run start` — build y arranque de producción
- `npm run test` — tests unitarios de la lógica de cálculo (Vitest)
- `npm run db:generate` / `npm run db:push` — migraciones Drizzle contra Turso
```

- [ ] **Step 16: Verify dev server boots**

Run: `npm run dev -- --port 3100 &` then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3100` (or open in browser), then stop the server.
Expected: HTTP 200, page renders "Cargando…".

- [ ] **Step 17: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Tailwind project"
```

---

## Task 1: Drizzle schema and Turso client

**Files:**
- Create: `lib/db/schema.ts`
- Create: `lib/db/client.ts`
- Create: `drizzle.config.ts`

- [ ] **Step 1: Create `lib/db/schema.ts`**

```ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const configuracion = sqliteTable('configuracion', {
  id: integer('id').primaryKey(),
  mermaPctDefault: real('merma_pct_default').notNull().default(17),
  pesoBolsaDefaultKg: real('peso_bolsa_default_kg').notNull().default(3),
});

export const movimientos = sqliteTable('movimientos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tipo: text('tipo', {
    enum: ['saldo_inicial', 'ingreso_verde', 'recepcion_tostado'],
  }).notNull(),
  fecha: text('fecha').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
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

- [ ] **Step 2: Create `lib/db/client.ts`**

```ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

let instance: DbInstance | null = null;

function getInstance(): DbInstance {
  if (!instance) {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL ?? '',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    instance = drizzle(client, { schema });
  }
  return instance;
}

// `createClient` throws synchronously if the URL is missing/invalid. Next.js
// imports every route module during `next build` (even force-dynamic ones) to
// collect page data, so calling createClient() at module-eval time would break
// the build whenever `.env.local` isn't set up yet. This Proxy defers the real
// client creation until the first actual query at request time.
export const db = new Proxy({} as DbInstance, {
  get(_target, prop, receiver) {
    return Reflect.get(getInstance(), prop, receiver);
  },
});
```

- [ ] **Step 3: Create `drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: '.env.local' });

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? '',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
```

- [ ] **Step 4: Generate the initial migration**

Run: `npm run db:generate`
Expected: creates SQL files under `drizzle/` describing the `configuracion` and
`movimientos` tables. This step only reads the schema file, it does not need a
live DB connection.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Drizzle schema and Turso client"
```

---

## Task 2: Calculation logic (TDD)

**Files:**
- Create: `lib/calculo.ts`
- Test: `lib/calculo.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/calculo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  calcularKgTostado,
  calcularVerdeConsumido,
  calcularArrastre,
  calcularKpis,
  type Movimiento,
} from './calculo';

function mov(overrides: Partial<Movimiento>): Movimiento {
  return {
    id: 0,
    tipo: 'ingreso_verde',
    fecha: '2026-01-01',
    createdAt: '2026-01-01T00:00:00.000Z',
    numeroRemito: null,
    kgVerde: null,
    bolsas: null,
    pesoBolsaKg: null,
    kgTostado: null,
    mermaPctAplicada: null,
    kgVerdeConsumido: null,
    notas: null,
    ...overrides,
  };
}

describe('calcularKgTostado', () => {
  it('multiplica bolsas por peso por bolsa', () => {
    expect(calcularKgTostado(20, 3)).toBe(60);
  });
});

describe('calcularVerdeConsumido', () => {
  it('calcula el verde consumido según la merma pactada (caso del enunciado)', () => {
    expect(calcularVerdeConsumido(60, 17)).toBeCloseTo(72.29, 2);
  });

  it('con 0% de merma consume exactamente el tostado', () => {
    expect(calcularVerdeConsumido(50, 0)).toBe(50);
  });
});

describe('calcularArrastre', () => {
  it('ordena cronológicamente y acumula el saldo fila por fila', () => {
    const movimientos: Movimiento[] = [
      mov({ id: 2, tipo: 'ingreso_verde', fecha: '2026-01-10', kgVerde: 100 }),
      mov({ id: 1, tipo: 'saldo_inicial', fecha: '2026-01-01', kgVerde: 500 }),
      mov({
        id: 3,
        tipo: 'recepcion_tostado',
        fecha: '2026-01-15',
        kgTostado: 60,
        kgVerdeConsumido: 72.29,
      }),
    ];

    const resultado = calcularArrastre(movimientos);

    expect(resultado.map((m) => m.id)).toEqual([1, 2, 3]);
    expect(resultado[0].saldoVerde).toBe(500);
    expect(resultado[1].saldoVerde).toBe(600);
    expect(resultado[2].saldoVerde).toBeCloseTo(527.71, 2);
  });

  it('permite que el saldo quede negativo sin bloquear el cálculo', () => {
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

    const resultado = calcularArrastre(movimientos);
    expect(resultado[1].saldoVerde).toBeCloseTo(-62.29, 2);
  });
});

describe('calcularKpis', () => {
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

    const kpis = calcularKpis(movimientos);

    expect(kpis.totalVerdeIngresado).toBe(100);
    expect(kpis.tostadoRecibido).toBe(60);
    expect(kpis.verdeConsumidoTeorico).toBeCloseTo(72.29, 2);
    expect(kpis.stockVerdeRemanente).toBeCloseTo(527.71, 2);
  });

  it('devuelve ceros cuando no hay movimientos', () => {
    expect(calcularKpis([])).toEqual({
      stockVerdeRemanente: 0,
      totalVerdeIngresado: 0,
      tostadoRecibido: 0,
      verdeConsumidoTeorico: 0,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/calculo.test.ts`
Expected: FAIL — `lib/calculo.ts` does not exist yet.

- [ ] **Step 3: Implement `lib/calculo.ts`**

```ts
export type TipoMovimiento = 'saldo_inicial' | 'ingreso_verde' | 'recepcion_tostado';

export interface Movimiento {
  id: number;
  tipo: TipoMovimiento;
  fecha: string;
  createdAt: string;
  numeroRemito: string | null;
  kgVerde: number | null;
  bolsas: number | null;
  pesoBolsaKg: number | null;
  kgTostado: number | null;
  mermaPctAplicada: number | null;
  kgVerdeConsumido: number | null;
  notas: string | null;
}

export interface MovimientoConSaldo extends Movimiento {
  saldoVerde: number;
}

export interface Kpis {
  stockVerdeRemanente: number;
  totalVerdeIngresado: number;
  tostadoRecibido: number;
  verdeConsumidoTeorico: number;
}

export function calcularKgTostado(bolsas: number, pesoBolsaKg: number): number {
  return bolsas * pesoBolsaKg;
}

export function calcularVerdeConsumido(kgTostado: number, mermaPct: number): number {
  return kgTostado / (1 - mermaPct / 100);
}

export function calcularArrastre(movimientos: Movimiento[]): MovimientoConSaldo[] {
  const ordenados = [...movimientos].sort((a, b) => {
    const porFecha = a.fecha.localeCompare(b.fecha);
    if (porFecha !== 0) return porFecha;
    return a.createdAt.localeCompare(b.createdAt);
  });

  let saldo = 0;
  return ordenados.map((m) => {
    if (m.tipo === 'saldo_inicial' || m.tipo === 'ingreso_verde') {
      saldo += m.kgVerde ?? 0;
    } else if (m.tipo === 'recepcion_tostado') {
      saldo -= m.kgVerdeConsumido ?? 0;
    }
    return { ...m, saldoVerde: saldo };
  });
}

export function calcularKpis(movimientos: Movimiento[]): Kpis {
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

  return { stockVerdeRemanente, totalVerdeIngresado, tostadoRecibido, verdeConsumidoTeorico };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/calculo.test.ts`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add pure calculation functions for shrinkage math"
```

---

## Task 3: Database query helpers

**Files:**
- Create: `lib/db/queries.ts`

- [ ] **Step 1: Create `lib/db/queries.ts`**

```ts
import { eq } from 'drizzle-orm';
import { db } from './client';
import { movimientos, configuracion } from './schema';
import type { Movimiento } from '../calculo';

export async function obtenerMovimientos(): Promise<Movimiento[]> {
  return db.select().from(movimientos);
}

export async function obtenerConfiguracion() {
  const [config] = await db.select().from(configuracion).where(eq(configuracion.id, 1));
  return config ?? { id: 1, mermaPctDefault: 17, pesoBolsaDefaultKg: 3 };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors related to `lib/db/queries.ts`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add DB query helpers for movimientos and configuracion"
```

---

## Task 4: Validation schemas

**Files:**
- Create: `lib/validation.ts`

- [ ] **Step 1: Create `lib/validation.ts`**

```ts
import { z } from 'zod';

export const saldoInicialSchema = z.object({
  tipo: z.literal('saldo_inicial'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  kgVerde: z.coerce.number().positive('El kg de verde debe ser mayor a 0'),
  numeroRemito: z.string().optional(),
  notas: z.string().optional(),
});

export const ingresoVerdeSchema = z.object({
  tipo: z.literal('ingreso_verde'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  kgVerde: z.coerce.number().positive('El kg de verde debe ser mayor a 0'),
  numeroRemito: z.string().min(1, 'El número de remito es obligatorio'),
  notas: z.string().optional(),
});

export const recepcionTostadoSchema = z.object({
  tipo: z.literal('recepcion_tostado'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  bolsas: z.coerce.number().positive('La cantidad de bolsas debe ser mayor a 0'),
  pesoBolsaKg: z.coerce.number().positive('El peso por bolsa debe ser mayor a 0'),
  mermaPct: z.coerce.number().positive('La merma debe ser mayor a 0').max(99).optional(),
  numeroRemito: z.string().min(1, 'El número de remito es obligatorio'),
  notas: z.string().optional(),
});

export const crearMovimientoSchema = z.discriminatedUnion('tipo', [
  saldoInicialSchema,
  ingresoVerdeSchema,
  recepcionTostadoSchema,
]);

export type CrearMovimientoInput = z.infer<typeof crearMovimientoSchema>;

export const configuracionSchema = z.object({
  mermaPctDefault: z.coerce.number().positive('La merma debe ser mayor a 0').max(99),
  pesoBolsaDefaultKg: z.coerce.number().positive('El peso de bolsa debe ser mayor a 0'),
});

export type ConfiguracionInput = z.infer<typeof configuracionSchema>;
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors related to `lib/validation.ts`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Zod validation schemas for movimientos and configuracion"
```

---

## Task 5: Server Actions

**Files:**
- Create: `lib/actions.ts`

- [ ] **Step 1: Create `lib/actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from './db/client';
import { movimientos, configuracion } from './db/schema';
import { obtenerConfiguracion } from './db/queries';
import { calcularKgTostado, calcularVerdeConsumido } from './calculo';
import { crearMovimientoSchema, configuracionSchema } from './validation';

export type ActionResult = { success: true } | { success: false; error: string };

export async function crearMovimiento(input: unknown): Promise<ActionResult> {
  const parsed = crearMovimientoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }
  const data = parsed.data;

  try {
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
    } else {
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
    }

    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Error al crear movimiento', err);
    return { success: false, error: 'No se pudo guardar el movimiento. Intentá de nuevo.' };
  }
}

export async function eliminarMovimiento(id: number): Promise<ActionResult> {
  try {
    await db.delete(movimientos).where(eq(movimientos.id, id));
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('Error al eliminar movimiento', err);
    return { success: false, error: 'No se pudo eliminar el movimiento.' };
  }
}

export async function actualizarConfiguracion(input: unknown): Promise<ActionResult> {
  const parsed = configuracionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await db
      .insert(configuracion)
      .values({ id: 1, ...parsed.data })
      .onConflictDoUpdate({ target: configuracion.id, set: parsed.data });

    revalidatePath('/');
    revalidatePath('/configuracion');
    return { success: true };
  } catch (err) {
    console.error('Error al actualizar configuración', err);
    return { success: false, error: 'No se pudo guardar la configuración.' };
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors related to `lib/actions.ts`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Server Actions for movimientos and configuracion"
```

---

## Task 6: UI primitives

**Files:**
- Create: `components/ui/card.tsx`
- Create: `components/ui/badge.tsx`
- Create: `components/ui/button.tsx`
- Create: `components/ui/input.tsx`
- Create: `components/ui/select.tsx`
- Create: `components/ui/label.tsx`

- [ ] **Step 1: Create `components/ui/card.tsx`**

```tsx
import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-sm',
        className
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Create `components/ui/badge.tsx`**

```tsx
import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'neutral' | 'verde' | 'tostado' | 'inicial' | 'alerta';

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-neutral-800 text-neutral-200',
  verde: 'bg-emerald-950 text-emerald-400 border border-emerald-800',
  tostado: 'bg-cafe-900 text-cafe-300 border border-cafe-700',
  inicial: 'bg-sky-950 text-sky-400 border border-sky-800',
  alerta: 'bg-red-950 text-red-400 border border-red-800',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 3: Create `components/ui/button.tsx`**

```tsx
import type { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-cafe-500 text-neutral-950 hover:bg-cafe-400',
  secondary: 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700',
  danger: 'bg-red-900 text-red-100 hover:bg-red-800',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 4: Create `components/ui/input.tsx`**

```tsx
import type { InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-cafe-500 focus:outline-none focus:ring-1 focus:ring-cafe-500',
        className
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 5: Create `components/ui/select.tsx`**

```tsx
import type { SelectHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        'w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-cafe-500 focus:outline-none focus:ring-1 focus:ring-cafe-500',
        className
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 6: Create `components/ui/label.tsx`**

```tsx
import type { LabelHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={clsx('mb-1 block text-sm font-medium text-neutral-300', className)} {...props} />
  );
}
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors related to `components/ui/*`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add lightweight UI primitives (Card, Badge, Button, Input, Select, Label)"
```

---

## Task 7: KPI Cards

**Files:**
- Create: `components/kpi-cards.tsx`

- [ ] **Step 1: Create `components/kpi-cards.tsx`**

```tsx
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors related to `components/kpi-cards.tsx`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add KPI cards component"
```

---

## Task 8: Movement form (with live preview)

**Files:**
- Create: `components/movement-form.tsx`

- [ ] **Step 1: Create `components/movement-form.tsx`**

```tsx
'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';
import { crearMovimiento } from '@/lib/actions';
import { calcularKgTostado, calcularVerdeConsumido } from '@/lib/calculo';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Button } from './ui/button';

type TipoMovimiento = 'saldo_inicial' | 'ingreso_verde' | 'recepcion_tostado';

const today = () => new Date().toISOString().slice(0, 10);

export function MovementForm({
  mermaPctDefault,
  pesoBolsaDefaultKg,
}: {
  mermaPctDefault: number;
  pesoBolsaDefaultKg: number;
}) {
  const [tipo, setTipo] = useState<TipoMovimiento>('ingreso_verde');
  const [fecha, setFecha] = useState(today());
  const [numeroRemito, setNumeroRemito] = useState('');
  const [kgVerde, setKgVerde] = useState('');
  const [bolsas, setBolsas] = useState('');
  const [pesoBolsaKg, setPesoBolsaKg] = useState(String(pesoBolsaDefaultKg));
  const [mermaPct, setMermaPct] = useState(String(mermaPctDefault));
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const preview = useMemo(() => {
    if (tipo !== 'recepcion_tostado') return null;
    const bolsasNum = Number(bolsas);
    const pesoNum = Number(pesoBolsaKg);
    const mermaNum = Number(mermaPct);
    if (!bolsasNum || !pesoNum || !mermaNum) return null;

    const kgTostado = calcularKgTostado(bolsasNum, pesoNum);
    const kgVerdeConsumido = calcularVerdeConsumido(kgTostado, mermaNum);
    return { kgTostado, kgVerdeConsumido };
  }, [tipo, bolsas, pesoBolsaKg, mermaPct]);

  function limpiarCamposEspecificos() {
    setNumeroRemito('');
    setKgVerde('');
    setBolsas('');
    setNotas('');
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const input: Record<string, unknown> = { tipo, fecha, notas: notas || undefined };

    if (tipo === 'recepcion_tostado') {
      input.numeroRemito = numeroRemito;
      input.bolsas = Number(bolsas);
      input.pesoBolsaKg = Number(pesoBolsaKg);
      input.mermaPct = mermaPct ? Number(mermaPct) : undefined;
    } else {
      input.kgVerde = Number(kgVerde);
      if (tipo === 'ingreso_verde') input.numeroRemito = numeroRemito;
    }

    startTransition(async () => {
      const result = await crearMovimiento(input);
      if (!result.success) {
        setError(result.error);
        return;
      }
      limpiarCamposEspecificos();
    });
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-neutral-100">Cargar movimiento</h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="tipo">Tipo de movimiento</Label>
          <Select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimiento)}>
            <option value="saldo_inicial">Saldo inicial</option>
            <option value="ingreso_verde">Ingreso de café verde</option>
            <option value="recepcion_tostado">Recepción de café tostado</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="fecha">Fecha</Label>
            <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </div>
          {tipo !== 'saldo_inicial' && (
            <div>
              <Label htmlFor="numeroRemito">Número de remito</Label>
              <Input
                id="numeroRemito"
                value={numeroRemito}
                onChange={(e) => setNumeroRemito(e.target.value)}
                required
              />
            </div>
          )}
        </div>

        {(tipo === 'saldo_inicial' || tipo === 'ingreso_verde') && (
          <div>
            <Label htmlFor="kgVerde">Kg de café verde</Label>
            <Input
              id="kgVerde"
              type="number"
              step="0.01"
              min="0"
              value={kgVerde}
              onChange={(e) => setKgVerde(e.target.value)}
              required
            />
          </div>
        )}

        {tipo === 'recepcion_tostado' && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="bolsas">Cantidad de bolsas</Label>
                <Input
                  id="bolsas"
                  type="number"
                  min="0"
                  value={bolsas}
                  onChange={(e) => setBolsas(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="pesoBolsaKg">Peso por bolsa (kg)</Label>
                <Input
                  id="pesoBolsaKg"
                  type="number"
                  step="0.01"
                  min="0"
                  value={pesoBolsaKg}
                  onChange={(e) => setPesoBolsaKg(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="mermaPct">Merma aplicada (%)</Label>
                <Input
                  id="mermaPct"
                  type="number"
                  step="0.01"
                  min="0"
                  max="99"
                  value={mermaPct}
                  onChange={(e) => setMermaPct(e.target.value)}
                  required
                />
              </div>
            </div>

            {preview && (
              <div className="rounded-lg border border-cafe-800 bg-cafe-950/40 px-3 py-2 text-sm text-cafe-300">
                → {preview.kgTostado.toLocaleString('es-AR', { maximumFractionDigits: 2 })} kg tostados
                consumen{' '}
                <strong>
                  {preview.kgVerdeConsumido.toLocaleString('es-AR', { maximumFractionDigits: 2 })} kg
                </strong>{' '}
                de café verde
              </div>
            )}
          </>
        )}

        <div>
          <Label htmlFor="notas">Notas (opcional)</Label>
          <Input id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando…' : 'Guardar movimiento'}
        </Button>
      </form>
    </Card>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors related to `components/movement-form.tsx`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add movement form with live shrinkage preview"
```

---

## Task 9: Ledger table and delete button

**Files:**
- Create: `components/delete-button.tsx`
- Create: `components/ledger-table.tsx`

- [ ] **Step 1: Create `components/delete-button.tsx`**

```tsx
'use client';

import { useTransition } from 'react';
import { eliminarMovimiento } from '@/lib/actions';
import { Button } from './ui/button';

export function DeleteButton({ id }: { id: number }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm('¿Eliminar este movimiento? Esta acción no se puede deshacer.')) return;
    startTransition(async () => {
      const result = await eliminarMovimiento(id);
      if (!result.success) {
        window.alert(result.error);
      }
    });
  }

  return (
    <Button variant="danger" onClick={handleClick} disabled={isPending} className="px-2 py-1 text-xs">
      {isPending ? '…' : 'Borrar'}
    </Button>
  );
}
```

- [ ] **Step 2: Create `components/ledger-table.tsx`**

```tsx
import { calcularArrastre, type Movimiento } from '@/lib/calculo';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { DeleteButton } from './delete-button';

const tipoBadge: Record<Movimiento['tipo'], { label: string; variant: 'inicial' | 'verde' | 'tostado' }> = {
  saldo_inicial: { label: 'Saldo inicial', variant: 'inicial' },
  ingreso_verde: { label: 'Ingreso verde', variant: 'verde' },
  recepcion_tostado: { label: 'Recepción tostado', variant: 'tostado' },
};

function formatKg(valor: number | null) {
  if (valor === null) return '—';
  return valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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
                    : (m.notas ?? '—')}
                </td>
                <td className="px-4 py-3 text-right">
                  {m.tipo === 'recepcion_tostado'
                    ? `-${formatKg(m.kgVerdeConsumido)}`
                    : `+${formatKg(m.kgVerde)}`}
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
                    <Badge variant="alerta" className="ml-2">
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
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors related to `components/ledger-table.tsx` or `components/delete-button.tsx`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add ledger table with chronological running balance"
```

---

## Task 10: Dashboard page

**Files:**
- Modify: `app/page.tsx` (replace placeholder from Task 0)

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors related to `app/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: wire dashboard page with KPIs, form and ledger"
```

---

## Task 11: Configuration page

**Files:**
- Create: `components/config-form.tsx`
- Create: `app/configuracion/page.tsx`

- [ ] **Step 1: Create `components/config-form.tsx`**

```tsx
'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { actualizarConfiguracion } from '@/lib/actions';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';

export function ConfigForm({
  mermaPctDefault,
  pesoBolsaDefaultKg,
}: {
  mermaPctDefault: number;
  pesoBolsaDefaultKg: number;
}) {
  const [mermaPct, setMermaPct] = useState(String(mermaPctDefault));
  const [pesoBolsa, setPesoBolsa] = useState(String(pesoBolsaDefaultKg));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await actualizarConfiguracion({
        mermaPctDefault: Number(mermaPct),
        pesoBolsaDefaultKg: Number(pesoBolsa),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-neutral-100">Configuración</h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">
          Configuración guardada.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="mermaPctDefault">Merma pactada por defecto (%)</Label>
          <Input
            id="mermaPctDefault"
            type="number"
            step="0.01"
            min="0"
            max="99"
            value={mermaPct}
            onChange={(e) => setMermaPct(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="pesoBolsaDefaultKg">Peso de bolsa por defecto (kg)</Label>
          <Input
            id="pesoBolsaDefaultKg"
            type="number"
            step="0.01"
            min="0"
            value={pesoBolsa}
            onChange={(e) => setPesoBolsa(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando…' : 'Guardar configuración'}
        </Button>
      </form>
    </Card>
  );
}
```

- [ ] **Step 2: Create `app/configuracion/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add configuracion page for shrinkage % and default bag weight"
```

---

## Task 12: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all `lib/calculo.test.ts` tests pass.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: build succeeds with no type errors. (DB calls happen at request time due to `force-dynamic`, so a missing/placeholder `.env.local` does not fail the build.)

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: no errors (warnings acceptable).

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final verification pass"
```

---

## Post-implementation (manual step for the user, not the agent)

Applying the schema to the real Turso database requires the user's live
credentials, which the implementing agent does not have. Once implementation is
done, the user must:

1. Create `.env.local` from `.env.example` and fill in the real
   `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` from their Turso project.
2. Run `npm run db:push` to apply the schema to their Turso database.
3. Run `npm run dev` and load `http://localhost:3000` to confirm the dashboard
   renders and a test movement can be saved end-to-end.
