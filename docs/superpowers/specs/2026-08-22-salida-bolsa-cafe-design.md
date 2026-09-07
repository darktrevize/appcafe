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
**tiene que** aceptar el mismo valor — si no, borrar un movimiento `salida_bolsa_cafe` fallaría
al intentar loguearlo antes de borrarlo (el insert a `eliminaciones_log` violaría el check del
enum). No se agregan columnas nuevas: el movimiento usa el campo `bolsas` (ya existe, `integer`
nullable), y `numeroRemito`/`notas` (ya nullable, cubren el caso "remito opcional").

Después de este cambio: `npm run db:generate && npm run db:push` (local), y en el paso de
despliegue aplicar contra Turso de producción — mismo flujo que la tabla `eliminaciones_log`.

### `lib/calculo.ts`

- `TipoMovimiento` pasa a derivarse del array compartido:
  `export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];` (importando
  `TIPOS_MOVIMIENTO` desde `./db/schema`) — evita mantener el union type a mano en un tercer
  lugar además de los dos enums de schema.
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
- El bloque de "Cantidad de bolsas" (hoy solo se muestra si `tipo === 'recepcion_tostado'`,
  junto con peso por bolsa y merma) se separa: el campo "Cantidad de bolsas" se muestra si
  `tipo === 'recepcion_tostado' || tipo === 'salida_bolsa_cafe'`; los campos "Peso por bolsa" y
  "Merma aplicada" (y el preview de kg tostado/verde consumido) siguen mostrándose solo para
  `recepcion_tostado`.
- El campo "Número de remito" (hoy `required` para cualquier tipo `!== 'saldo_inicial'`) deja
  de ser `required` cuando `tipo === 'salida_bolsa_cafe'` — sigue visible pero opcional.
- `buildInput()` gana una rama para `salida_bolsa_cafe`: `{ tipo, fecha, bolsas: Number(bolsas),
  numeroRemito: numeroRemito || undefined, notas: notasInput }`.

### `components/kpi-cards.tsx`

Nueva card "Stock Bolsas Tostadas", con el mismo patrón visual condicional que "Stock Verde
Remanente" (badge "Saldo negativo" + texto rojo si `kpis.stockBolsasTostadas < 0`). Con 7 cards
en vez de 6, la grilla pasa de `lg:grid-cols-3` a `lg:grid-cols-4` (filas de 4 y 3, en vez de
3+3+1).

### `components/ledger-table.tsx`

- `tipoBadge` gana una entrada: `salida_bolsa_cafe: { label: 'Salida Bolsa Café', variant:
  'neutral' }` (variante `neutral` ya existe en `Badge`, no hace falta agregar un color nuevo).
- Columna "Detalle": para `salida_bolsa_cafe` se muestra `${m.bolsas} bolsas` (igual de simple
  que el resto, sin el detalle de peso/merma que sí tiene `recepcion_tostado`).
- Columnas "Verde ±" y "Tostado +": siguen su lógica actual sin cambios — para cualquier tipo
  que no sea `recepcion_tostado`, "Tostado +" ya muestra `—`, y `salida_bolsa_cafe` no tiene
  `kgVerde` ni `kgVerdeConsumido`, así que "Verde ±" también cae en la rama `—`/`+undefined`.
  Para evitar mostrar `+undefined` (bug ya latente para cualquier tipo sin `kgVerde`, pero que
  hasta ahora nunca ocurría porque los únicos tipos eran `saldo_inicial`/`ingreso_verde`
  —ambos con `kgVerde`— y `recepcion_tostado` —cubierto por la otra rama—), la condición de
  "Verde ±" pasa a `m.tipo === 'recepcion_tostado' ? ... : m.kgVerde !== null ? \`+${formatKg(m.kgVerde)}\` : '—'`.

### `components/eliminaciones-sidebar.tsx`

- `tipoLabel` gana `salida_bolsa_cafe: 'Salida Bolsa Café'`.
- `resumen()` gana una rama: para `salida_bolsa_cafe` retorna `${log.bolsas ?? '—'} bolsas`.

## Fuera de alcance

- No se agrega un local/destino por movimiento (decisión explícita del usuario).
- No se agrega una columna de "stock bolsas tostadas" corrida en la tabla del ledger (fila por
  fila) — solo la KPI agregada en el dashboard. Se puede agregar después si hace falta.
- No se modifica la relación entre "Bolsas Teóricas (remanente)" (proyección desde el verde
  todavía no tostado) y "Stock Bolsas Tostadas" (bolsas ya tostadas menos ya repartidas) — son
  complementarias, no se cruzan en el cálculo.

## Testing

- `lib/calculo.test.ts`: casos nuevos para `calcularKpis` cubriendo:
  - `bolsasSalidas` suma correctamente sobre varios movimientos `salida_bolsa_cafe`.
  - `stockBolsasTostadas` = `bolsasEntregadas - bolsasSalidas`, positivo.
  - `stockBolsasTostadas` negativo cuando `bolsasSalidas > bolsasEntregadas` (sin clamp,
    verificar que el valor efectivamente es negativo).
  - `calcularArrastre` con un movimiento `salida_bolsa_cafe` en el medio: `saldoVerde` no se ve
    afectado por ese movimiento (sigue el mismo valor que el movimiento anterior en la
    cronología).
