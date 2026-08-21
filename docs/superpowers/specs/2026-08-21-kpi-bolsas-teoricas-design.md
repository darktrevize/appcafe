# KPIs de bolsas entregadas y bolsas teóricas — Design

## Contexto

El dashboard (`app/page.tsx`) muestra 4 KPI cards (`components/kpi-cards.tsx`) calculadas
por `calcularKpis` en `lib/calculo.ts`: stock verde remanente, total verde ingresado,
tostado recibido, y verde consumido teórico. Falta visibilidad sobre:

1. Cuántas bolsas de café tostado se recibieron en total del tostadero.
2. Cuántas bolsas se podrían obtener, en teoría, del café verde que todavía no se envió
   a tostar (el stock verde remanente).

## Cambios

### `lib/calculo.ts`

- `Kpis` gana dos campos:
  - `bolsasEntregadas: number`
  - `bolsasTeoricas: number`
- `calcularKpis` pasa a recibir un segundo argumento `config: { mermaPctDefault: number; pesoBolsaDefaultKg: number }`:
  - `bolsasEntregadas` = suma de `bolsas ?? 0` sobre todos los movimientos `recepcion_tostado`.
  - `bolsasTeoricas` = `(Math.max(stockVerdeRemanente, 0) * (1 - mermaPctDefault / 100)) / pesoBolsaDefaultKg`.
    - Se aplica la merma % default porque el remanente es café **verde** todavía no tostado;
      se usa el mismo criterio que ya aplica `calcularVerdeConsumido` para movimientos reales.
    - El remanente se clampea a 0 antes del cálculo: un saldo negativo (ya señalizado en la
      UI con el badge "Saldo negativo") no debe traducirse en una cantidad negativa de bolsas.
    - **Sin redondeo** — se mantiene el decimal (ej. `340.5`), a pedido explícito del usuario.

### `app/page.tsx`

- `calcularKpis(movimientos, config)` — se pasa la config ya obtenida (`obtenerConfiguracion()`)
  como segundo argumento.

### `lib/format.ts`

- Nuevo `formatBolsasTeoricas(valor: number): string` — locale `es-AR`, 1 decimal fijo
  (`minimumFractionDigits: 1, maximumFractionDigits: 1`), ej. `340,5`.
- Nuevo `formatBolsasEntero(valor: number): string` — locale `es-AR`, 0 decimales, para
  `bolsasEntregadas` (siempre entero, viene de sumar una columna `integer`).

### `components/kpi-cards.tsx`

- Dos cards nuevas:
  - "Bolsas Entregadas" → `formatBolsasEntero(kpis.bolsasEntregadas)`
  - "Bolsas Teóricas (remanente)" → `formatBolsasTeoricas(kpis.bolsasTeoricas)`
- Grid pasa de `lg:grid-cols-4` a `lg:grid-cols-3` (6 cards → 2 filas parejas de 3).

## Fuera de alcance

- No hay cambios de schema/DB — todo se deriva de columnas ya existentes (`bolsas`,
  `kgVerde`, `kgVerdeConsumido`) y de la config ya persistida (`mermaPctDefault`,
  `pesoBolsaDefaultKg`).
- No se agregan tests nuevos de UI; `lib/calculo.test.ts` ya cubre la lógica de cálculo
  puro y se le suman casos para `bolsasEntregadas`/`bolsasTeoricas`.

## Testing

- `lib/calculo.test.ts`: casos nuevos para `calcularKpis` cubriendo:
  - suma de `bolsasEntregadas` sobre varios movimientos `recepcion_tostado`.
  - `bolsasTeoricas` con remanente positivo (valor decimal esperado, sin redondear).
  - `bolsasTeoricas` clampeado a 0 cuando el remanente es negativo.
