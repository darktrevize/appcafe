# Salida Bolsa Café — Design

## Contexto

Hoy la app registra tres tipos de movimiento (`movimientos.tipo`): `saldo_inicial`,
`ingreso_verde` (verde enviado al tostadero) y `recepcion_tostado` (tostado recibido del
tostadero). No hay forma de registrar cuándo salen bolsas de café tostado hacia los locales
propios, así que no hay visibilidad de cuántas bolsas quedan efectivamente en stock después
de repartir.

Se pide un cuarto tipo de movimiento, **"Salida Bolsa Café"** (`salida_bolsa_cafe`), que reste
del stock de bolsas tostadas disponibles. El objetivo final es una KPI "Stock Bolsas Tostadas"
= bolsas recibidas del tostadero (`bolsasEntregadas`, ya existente) menos bolsas salidas a
locales (`bolsasSalidas`, nuevo).

## Decisiones ya tomadas

- **Sin destino por local**: el movimiento solo registra la cantidad de bolsas que salen, no a
  qué local específico van.
- **Remito opcional**: a diferencia de `ingreso_verde`/`recepcion_tostado` (remito obligatorio,
  proveedor externo), `salida_bolsa_cafe` es un movimiento interno — remito opcional.
- **KPI nueva**: "Stock Bolsas Tostadas" en el dashboard, con el mismo tratamiento visual que
  "Stock Verde Remanente" si queda en negativo (badge rojo "Saldo negativo", sin clampear a 0).
- **Nombre**: label en la UI "Salida Bolsa Café", valor interno `salida_bolsa_cafe`.

## Cambios

### `lib/db/schema.ts` — enum compartido

`movimientos.tipo` y `eliminacionesLog.tipo` hoy repiten el mismo array
`['saldo_inicial', 'ingreso_verde', 'recepcion_tostado']` en dos lugares (líneas 13 y 38). Como
ya hay que tocar ambos para agregar el cuarto valor, se extrae a una constante compartida en el
mismo archivo, arriba de las dos tablas:

```ts
export const TIPOS_MOVIMIENTO = [
  'saldo_inicial',
  'ingreso_verde',
  'recepcion_tostado',
  'salida_bolsa_cafe',
] as const;
```

Y ambas columnas `tipo` pasan a `text('tipo', { enum: TIPOS_MOVIMIENTO })`. `eliminacionesLog`
**tiene que** aceptar el mismo valor. **Aclaración importante**: `text(..., { enum: [...] })`
de Drizzle para SQLite es solo a nivel TypeScript — no genera un `CHECK` en la base (confirmado
en `drizzle/0000_steady_major_mapleleaf.sql`/`0001_last_screwball.sql`: la columna es
`text NOT NULL` a secas). El problema real si solo se actualiza el enum de `movimientos` es un
**error de compilación de TypeScript** en `eliminarMovimiento` (`lib/actions.ts`, el `tipo:
movimiento.tipo,` dentro del insert a `eliminacionesLog`): `movimiento.tipo` pasaría a ser del
tipo `TipoMovimiento` de 4 valores, pero el insert a `eliminacionesLog` seguiría tipado con el
enum viejo de 3 valores. No se agregan columnas nuevas: el movimiento usa el campo `bolsas` (ya
existe, `integer` nullable), y `numeroRemito`/`notas` (ya nullable, cubren el caso "remito
opcional").

Después de este cambio: `npm run db:generate && npm run db:push` (local), y en el paso de
despliegue aplicar contra Turso de producción — mismo flujo que la tabla `eliminaciones_log`.

### `lib/calculo.ts`

- `TipoMovimiento` pasa a derivarse del array compartido:
  `export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];` — evita mantener el union
  type a mano en un tercer lugar además de los dos enums de schema. Requiere un **import de
  valor** (no `import type`) de `TIPOS_MOVIMIENTO` desde `./db/schema`, porque `typeof
  TIPOS_MOVIMIENTO` necesita el binding real, no solo su tipo:
  `import { TIPOS_MOVIMIENTO } from './db/schema';`. No genera riesgo de import circular
  (`lib/db/schema.ts` solo importa de `drizzle-orm`/`drizzle-orm/sqlite-core`) ni infla el
  bundle del cliente — al usarse solo dentro de un `typeof` en posición de tipo, se elide en la
  compilación (`isolatedModules: true` en `tsconfig.json`).
- `calcularArrastre`: sin cambios de lógica. El `if/else if` ya solo actúa sobre
  `saldo_inicial`/`ingreso_verde`/`recepcion_tostado`; `salida_bolsa_cafe` cae fuera de ambas
  ramas y no afecta `saldoVerde` (correcto — este movimiento no toca café verde). Solo hace
  falta que el tipo compile con el nuevo valor del union.
- `Kpis` gana `bolsasSalidas: number` y `stockBolsasTostadas: number`.
- `calcularKpis`:
  - `bolsasSalidas` = suma de `bolsas ?? 0` sobre movimientos `salida_bolsa_cafe`.
  - `stockBolsasTostadas` = `bolsasEntregadas - bolsasSalidas`. **Sin clamp** — puede quedar
    negativo, igual que `stockVerdeRemanente`.

### `lib/validation.ts`

Nuevo schema, mismo patrón que los otros tres:

```ts
export const salidaBolsaCafeSchema = z.object({
  tipo: z.literal('salida_bolsa_cafe'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  bolsas: z.coerce.number().positive('La cantidad de bolsas debe ser mayor a 0'),
  numeroRemito: z.string().optional(),
  notas: z.string().optional(),
});
```

Se agrega a `crearMovimientoSchema` (el `z.discriminatedUnion('tipo', [...])` gana un cuarto
miembro).

### `lib/actions.ts`

`crearMovimiento` gana una rama más en el `if/else` (después de `recepcion_tostado`, antes del
`else` final que hoy asume `recepcion_tostado` — pasa a ser un `else if (data.tipo ===
'recepcion_tostado')` explícito seguido de un `else` para `salida_bolsa_cafe`):

```ts
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

(El `else` actual que arma `recepcion_tostado` pasa a `else if (data.tipo ===
'recepcion_tostado') { ... }`, y el nuevo `else` final cubre `salida_bolsa_cafe` — con 4 tipos
en el discriminated union, TypeScript exige que el último `else` sea exhaustivo o que se
verifique el tipo explícitamente; usar `else if` explícito para los primeros tres y dejar el
`else` final para el cuarto mantiene el patrón actual del archivo sin introducir un nuevo
mecanismo de control de flujo.)

`eliminarMovimiento` no cambia — ya copia genéricamente todos los campos del movimiento leído
(incluyendo `bolsas`, `numeroRemito`, `notas`) sin lógica específica por tipo, así que un
`salida_bolsa_cafe` se audita igual que cualquier otro tipo una vez que el enum de
`eliminacionesLog` lo acepta.

### `components/movement-form.tsx`

- El tipo local `TipoMovimiento` (línea 13, duplicado del que ya exporta `lib/calculo.ts`) se
  reemplaza por `import type { TipoMovimiento } from '@/lib/calculo';` — se está tocando esta
  línea de todos modos para agregar el cuarto valor, así que se elimina la duplicación en vez
  de mantenerla sincronizada a mano en un tercer lugar.
- Nueva opción en el `<Select>`: `<option value="salida_bolsa_cafe">Salida Bolsa Café</option>`.
- El bloque de "Cantidad de bolsas" (hoy junto con peso por bolsa y merma, dentro de un único
  `sm:grid-cols-3` condicionado a `tipo === 'recepcion_tostado'`) se separa en dos bloques
  independientes:
  - Un bloque nuevo, mostrado cuando `tipo === 'salida_bolsa_cafe'`, con **solo** el campo
    "Cantidad de bolsas" en un `<div>` simple (sin grid de 3 columnas, ya que va solo — igual
    de ancho que el bloque de "Kg de café verde" que usan `saldo_inicial`/`ingreso_verde`).
  - El bloque existente de `recepcion_tostado` (bolsas + peso por bolsa + merma + preview) se
    mantiene sin cambios, condicionado exactamente igual que hoy (`tipo === 'recepcion_tostado'`).
  - Los dos bloques usan el mismo estado `bolsas`/`setBolsas` ya existente — no se duplica.
- El campo "Número de remito" (hoy `required` para cualquier tipo `!== 'saldo_inicial'`) deja
  de ser `required` cuando `tipo === 'salida_bolsa_cafe'` — sigue visible pero opcional. La
  condición del atributo `required` pasa a `tipo !== 'saldo_inicial' && tipo !==
  'salida_bolsa_cafe'`.
- `buildInput()` (líneas 54-86): hoy son tres `if` independientes con `return` temprano —
  `if (recepcion_tostado) { return {...}; }`, `if (ingreso_verde) { return {...}; }` — sin
  `else`/`else if`, seguidos de un `return` final incondicional que asume `saldo_inicial` sin
  chequearlo. Con 4 tipos posibles, ese `return` final ya no puede cubrir dos casos
  (`saldo_inicial` y `salida_bolsa_cafe`) con formas de retorno distintas (uno tiene `kgVerde`,
  el otro `bolsas`). Se agrega un `if (tipo === 'salida_bolsa_cafe')` explícito con su propio
  `return`, ANTES del `return` final:
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
  ```
  dejando el `else` final (sin condición) exclusivamente para `saldo_inicial`, igual que hoy.

### `components/kpi-cards.tsx`

Nueva card "Stock Bolsas Tostadas", **última** de las 7 (después de "Bolsas Teóricas
(remanente)"), con el mismo patrón visual condicional que "Stock Verde Remanente" (badge "Saldo
negativo" + texto rojo si `kpis.stockBolsasTostadas < 0`) — pero es un conteo de bolsas, no kg:
usa `formatBolsasEntero(kpis.stockBolsasTostadas)` (mismo formatter que ya usa "Bolsas
Entregadas"), **sin** el sufijo `" kg"` que sí lleva "Stock Verde Remanente". Con 7 cards en vez
de 6, la grilla pasa de `lg:grid-cols-3` a `lg:grid-cols-4` (filas de 4 y 3, en vez de 3+3+1).

### `components/ledger-table.tsx`

- `tipoBadge` (línea 7) está tipado como `Record<Movimiento['tipo'], { label: string; variant:
  'inicial' | 'verde' | 'tostado' }>` — el union de `variant` hoy solo cubre los 3 colores en
  uso. Hay que ampliarlo a `'inicial' | 'verde' | 'tostado' | 'neutral'` para poder agregar
  `salida_bolsa_cafe: { label: 'Salida Bolsa Café', variant: 'neutral' }` (variante `neutral`
  ya existe en `Badge`, no hace falta un color nuevo — solo ensanchar esta anotación local).
- Columna "Detalle": para `salida_bolsa_cafe` se muestra `${m.bolsas} bolsas` (igual de simple
  que el resto, sin el detalle de peso/merma que sí tiene `recepcion_tostado`).
- Columna "Tostado +": sigue su lógica actual sin cambios — ya muestra `—` para cualquier tipo
  que no sea `recepcion_tostado`, `salida_bolsa_cafe` incluido.
- Columna "Verde ±": `formatKg` ya devuelve `'—'` para `null` y `Movimiento.kgVerde` es
  `number | null` (nunca `undefined`), así que hoy esta columna para `salida_bolsa_cafe`
  renderizaría `+—` (con el signo `+` pegado al guion) — no es un crash, pero es un texto
  confuso. Se limpia cambiando la condición a
  `m.tipo === 'recepcion_tostado' ? \`-${formatKg(m.kgVerdeConsumido)}\` : m.kgVerde !== null ? \`+${formatKg(m.kgVerde)}\` : '—'`
  para que `salida_bolsa_cafe` (sin `kgVerde`) muestre `—` en vez de `+—`.

### `components/eliminaciones-sidebar.tsx`

- `tipoLabel` gana `salida_bolsa_cafe: 'Salida Bolsa Café'` (es un `Record<EliminacionLog['tipo'],
  string>` con un valor por tipo — a diferencia de `tipoBadge` en ledger-table.tsx, no tiene un
  union restringido en el value, así que agregar esta entrada no requiere ensanchar ningún tipo).
- `resumen()` (líneas 11-16) hoy es `if (recepcion_tostado) {...} return \`${kgVerde} kg\`;` —
  el `return` final asume que cualquier otro tipo tiene `kgVerde`, lo cual deja de ser cierto
  para `salida_bolsa_cafe`. Se agrega un `if (tipo === 'salida_bolsa_cafe')` explícito ANTES del
  `return` final: `if (log.tipo === 'salida_bolsa_cafe') return \`${log.bolsas ?? '—'} bolsas\`;`,
  dejando el `return` final (sin condición) para `saldo_inicial`/`ingreso_verde` como hoy.

## Fuera de alcance

- No se agrega un local/destino por movimiento (decisión explícita del usuario).
- No se agrega una columna de "stock bolsas tostadas" corrida en la tabla del ledger (fila por
  fila) — solo la KPI agregada en el dashboard. Se puede agregar después si hace falta.
- No se modifica la relación entre "Bolsas Teóricas (remanente)" (proyección desde el verde
  todavía no tostado) y "Stock Bolsas Tostadas" (bolsas ya tostadas menos ya repartidas) — son
  complementarias, no se cruzan en el cálculo.

## Testing

- `lib/calculo.test.ts`, ajuste a un test existente roto por el cambio: la prueba `'devuelve
  ceros cuando no hay movimientos'` (líneas 107-116) hace `toEqual` contra un objeto literal de
  6 campos; al agregar `bolsasSalidas`/`stockBolsasTostadas` a `Kpis`, el resultado real tendrá
  8 campos y el `toEqual` fallará. El objeto esperado pasa a incluir
  `bolsasSalidas: 0, stockBolsasTostadas: 0`.
- `lib/calculo.test.ts`: casos nuevos para `calcularKpis` cubriendo:
  - `bolsasSalidas` suma correctamente sobre varios movimientos `salida_bolsa_cafe`.
  - `stockBolsasTostadas` = `bolsasEntregadas - bolsasSalidas`, positivo.
  - `stockBolsasTostadas` negativo cuando `bolsasSalidas > bolsasEntregadas` (sin clamp,
    verificar que el valor efectivamente es negativo).
  - `calcularArrastre` con un movimiento `salida_bolsa_cafe` en el medio: `saldoVerde` no se ve
    afectado por ese movimiento (sigue el mismo valor que el movimiento anterior en la
    cronología).
