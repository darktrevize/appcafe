# Gestión de Stock y Cuenta Corriente de Tostado de Café — Diseño

**Fecha:** 2026-08-19
**Estado:** Aprobado por el usuario

## 1. Contexto y problema de negocio

El usuario compra café verde y lo envía a un tostadero externo, que trabaja con una
merma pactada estándar del 17% (rendimiento 83%). El tostadero entrega el café
tostado en bolsas de peso configurable (por defecto 3 kg). El usuario necesita una
app web que funcione como cuenta corriente: registra envíos de verde y recepciones
de tostado, y la app calcula en todo momento el saldo remanente de café verde
disponible en el tostadero.

**Fórmula central:**
```
kg_verde_consumido = kg_tostado_recibido / (1 - merma_pct / 100)
```
Ejemplo: 20 bolsas × 3 kg = 60 kg tostados → 60 / 0.83 = 72.29 kg de verde consumido.

## 2. Decisiones confirmadas con el usuario

- **Sin autenticación.** App de uso personal, sin login ni multi-usuario.
- **Un solo tostadero.** Una única cuenta corriente global (no hay selector de
  proveedor/tostadero).
- **Merma configurable.** Valor por defecto 17%, editable desde una pantalla de
  configuración. Cada recepción de tostado guarda el % efectivamente aplicado
  (`mermaPctAplicada`) para no alterar el histórico si el valor default cambia
  después.
- **Turso ya disponible.** El usuario ya cuenta con una base Turso; el proyecto se
  configura para conectarse vía variables de entorno (`TURSO_DATABASE_URL`,
  `TURSO_AUTH_TOKEN`), sin fallback a SQLite local.
- **Saldo inicial como movimiento.** Se carga una única vez como una fila más de la
  tabla de movimientos (tipo `saldo_inicial`), participa del arrastre cronológico
  igual que cualquier otro remito, y puede editarse/borrarse como cualquier fila.
- **Saldo negativo: permitir y avisar.** Si una recepción de tostado deja el saldo
  de verde en negativo, el movimiento se guarda igual (refleja la realidad) pero se
  marca visualmente (badge/color de alerta) tanto en la fila como en el KPI de
  stock remanente.

## 3. Alcance

Incluye: alta de movimientos (saldo inicial, ingreso de verde, recepción de
tostado), listado tipo libro mayor con arrastre, KPIs de resumen, eliminación de
movimientos, pantalla de configuración (merma % y peso de bolsa default).

Fuera de alcance (YAGNI, no pedido): autenticación, múltiples tostaderos/proveedores,
edición de movimientos existentes (solo alta y baja), exportación a Excel/PDF,
notificaciones, historial de auditoría/versionado de movimientos.

## 4. Arquitectura del proyecto

```
app/
├── page.tsx                     # Server Component: dashboard principal
├── layout.tsx                   # Layout raíz + dark mode
├── globals.css
└── configuracion/page.tsx       # Editar % merma y peso de bolsa por defecto
components/
├── kpi-cards.tsx
├── movement-form.tsx            # Client Component: alta con preview en vivo
├── ledger-table.tsx             # Tabla cuenta corriente (Server Component)
├── delete-button.tsx            # Client Component: confirm + server action
├── config-form.tsx              # Client Component: edición de configuración
└── ui/                          # primitivos livianos (Card, Badge, Button, Input, Select)
lib/
├── db/
│   ├── client.ts                # cliente @libsql/client + drizzle
│   └── schema.ts                # esquema Drizzle
├── calculo.ts                   # funciones puras de cálculo (testeadas)
└── actions.ts                   # Server Actions
drizzle/                         # migraciones generadas por drizzle-kit
drizzle.config.ts
.env.local                       # no versionado: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
```

`lib/calculo.ts` se mantiene sin dependencias de DB ni de React para poder
testearlo de forma aislada y reutilizarlo tanto en el preview en vivo del
formulario (cliente) como en las Server Actions (servidor), evitando duplicar la
lógica de negocio.

## 5. Modelo de datos (Drizzle ORM sobre Turso/LibSQL)

### Tabla `configuracion` (fila única, singleton, `id` fijo en 1)
| Campo | Tipo | Notas |
|---|---|---|
| `id` | integer PK | siempre `1` |
| `mermaPctDefault` | real | default `17` |
| `pesoBolsaDefaultKg` | real | default `3` |

### Tabla `movimientos` (libro mayor / cuenta corriente)
| Campo | Tipo | Notas |
|---|---|---|
| `id` | integer PK autoincrement | |
| `tipo` | text enum | `'saldo_inicial' \| 'ingreso_verde' \| 'recepcion_tostado'` |
| `fecha` | text (ISO date) | fecha del remito, editable por el usuario |
| `createdAt` | text (ISO datetime) | timestamp de carga, usado como desempate de orden |
| `numeroRemito` | text nullable | opcional, sobre todo para `saldo_inicial` |
| `kgVerde` | real nullable | usado en `ingreso_verde` y `saldo_inicial` |
| `bolsas` | integer nullable | usado en `recepcion_tostado` |
| `pesoBolsaKg` | real nullable | usado en `recepcion_tostado` |
| `kgTostado` | real nullable | `bolsas * pesoBolsaKg`, guardado en el alta |
| `mermaPctAplicada` | real nullable | snapshot del % usado en `recepcion_tostado` |
| `kgVerdeConsumido` | real nullable | resultado calculado, guardado en el alta |
| `notas` | text nullable | libre |

**Por qué el saldo remanente no se guarda como campo:** se deriva siempre de la
suma de movimientos (`SUM(kgVerde de ingreso_verde y saldo_inicial) - SUM(kgVerdeConsumido de recepcion_tostado)`).
Para la tabla, se calcula el arrastre fila por fila ordenando por
`fecha, createdAt` ascendente. Esto evita que un saldo "cacheado" quede
desincronizado si se borra un movimiento intermedio.

## 6. Lógica de cálculo (`lib/calculo.ts`)

Funciones puras, sin efectos secundarios:

- `calcularKgTostado(bolsas: number, pesoBolsaKg: number): number` → `bolsas * pesoBolsaKg`
- `calcularVerdeConsumido(kgTostado: number, mermaPct: number): number` → `kgTostado / (1 - mermaPct / 100)`
- `calcularArrastre(movimientos: Movimiento[]): MovimientoConSaldo[]` → ordena
  cronológicamente y acumula `saldoVerde` fila por fila
- `calcularKpis(movimientos: Movimiento[]): Kpis` → stock remanente, total verde
  ingresado, tostado recibido, verde consumido teórico

## 7. Server Actions (`lib/actions.ts`)

- `crearMovimiento(input)`: valida con Zod (schema discriminado por `tipo`),
  recalcula `kgTostado`/`kgVerdeConsumido` en el servidor (nunca confía en el
  cálculo del cliente), inserta y hace `revalidatePath('/')`.
- `eliminarMovimiento(id)`: borra la fila y hace `revalidatePath('/')`.
- `actualizarConfiguracion(input)`: upsert de `mermaPctDefault` y
  `pesoBolsaDefaultKg`.

Patrón de retorno uniforme: `{ success: true } | { success: false, error: string }`,
consumido por los formularios cliente para mostrar errores inline (sin librería de
toasts).

## 8. UI / Componentes

- **KPI Cards** (4, Server Component): Stock Verde Remanente (destacado, badge rojo
  si `< 0`), Total Verde Ingresado, Tostado Recibido, Verde Consumido Teórico.
- **MovementForm** (Client Component): selector de tipo de movimiento con campos
  condicionales; en "Recepción de Tostado" hay preview en vivo (`useMemo`) que
  muestra el kg de verde que se va a consumir mientras se tipea, usando la merma
  default (editable puntualmente si ese remito tuvo condiciones distintas).
- **LedgerTable** (Server Component): columnas Fecha | Tipo (badge de color) |
  Remito | Detalle | Verde ± | Tostado + | Saldo Verde corrido | Acciones. Orden
  de visualización: más reciente arriba; el saldo corrido se calcula en orden
  cronológico real y luego se invierte para mostrar.
- **ConfigForm**: edición de merma % y peso de bolsa default.
- Dark mode vía Tailwind (`class` strategy), paleta neutra con acento
  ámbar/marrón café.

## 9. Manejo de errores

- Validación Zod tanto en cliente (feedback inmediato) como en servidor (defensa
  en profundidad).
- Errores de Server Actions se capturan y devuelven como string legible, mostrado
  en un banner inline sobre el formulario.
- Confirmación nativa (`window.confirm`) antes de ejecutar `eliminarMovimiento`.

## 10. Testing

- Vitest sobre `lib/calculo.ts`: caso del enunciado (60kg tostado / 17% merma =
  72.29kg verde), cálculo de arrastre con múltiples movimientos intercalados,
  caso de saldo negativo.
- No se agrega testing de UI/E2E en este alcance.

## 11. Stack de dependencias

`next`, `react`, `typescript`, `tailwindcss`, `drizzle-orm`, `@libsql/client`,
`zod` (runtime); `drizzle-kit`, `vitest` (dev). Sin librerías de componentes UI
externas — primitivos livianos hechos a mano para mantener el bundle simple.
