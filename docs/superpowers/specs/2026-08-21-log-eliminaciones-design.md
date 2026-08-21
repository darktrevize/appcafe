# Log de eliminaciones con código de autorización — Design

## Contexto

Hoy `eliminarMovimiento` (`lib/actions.ts:67-76`) borra un movimiento del ledger sin
ningún control: `components/delete-button.tsx` solo pide un `window.confirm()` del
navegador y listo — no queda registro de quién borró qué ni cuándo, y cualquiera con
acceso a la app puede borrar sin dejar rastro.

Se pide: exigir un código de autorización + el nombre de quien borra, y dejar un log
de todas las eliminaciones, visible permanentemente en una columna a la izquierda,
en todas las páginas de la app.

## Cambios

### `lib/db/schema.ts`

Tabla nueva `eliminaciones_log`:

```ts
export const eliminacionesLog = sqliteTable('eliminaciones_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  eliminadoEn: text('eliminado_en').notNull().default(sql`CURRENT_TIMESTAMP`),
  movimientoId: integer('movimiento_id').notNull(),
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

Es una **copia** de los datos del movimiento en el momento del borrado, no una FK a
`movimientos` — el movimiento original va a dejar de existir, así que el log tiene que
sobrevivirlo con su propia copia de los campos relevantes.

Después de este cambio hay que correr `npm run db:generate && npm run db:push` (local) y,
en el paso de despliegue, aplicar la misma migración contra el Turso de producción.

### `lib/db/queries.ts`

Nueva función `obtenerEliminaciones(): Promise<EliminacionLog[]>` — trae todo el log
ordenado por `eliminadoEn` descendente (más reciente primero).

### `lib/actions.ts`

`eliminarMovimiento` cambia de firma: `eliminarMovimiento(id: number, codigo: string, nombre: string): Promise<ActionResult>`.

Flujo:
1. Si `codigo !== process.env.DELETE_CODE` → devuelve `{ success: false, error: 'Código incorrecto.' }` sin tocar la base.
2. Si `nombre` está vacío (trim) → devuelve `{ success: false, error: 'Ingresá tu nombre.' }`.
3. Lee el movimiento por `id` (si no existe, error genérico igual que hoy).
4. Inserta en `eliminacionesLog` una fila con `nombre`, `movimientoId: id`, y los campos
   copiados del movimiento leído.
5. Borra el movimiento.
6. `revalidatePath('/')` y `revalidatePath('/configuracion')` — mismo patrón que ya usa
   `actualizarConfiguracion` (`lib/actions.ts:90-91`) para que la sidebar del log se
   actualice se esté donde se esté parado.

No se envuelve explícitamente en una transacción manual: `@libsql/client` con Drizzle no
tiene transacciones interactivas simples en este setup (no se usan en ningún otro lado del
código existente); el riesgo de una falla a mitad de camino entre el insert del log y el
delete del movimiento se acepta como low-risk dado el volumen de uso de esta app.

### `lib/validation.ts`

Nuevo `eliminarMovimientoSchema` (zod) para validar `codigo` y `nombre` desde el cliente
antes de llamar al server action, siguiendo el mismo patrón que `crearMovimientoSchema`:

```ts
export const eliminarMovimientoSchema = z.object({
  codigo: z.string().min(1, 'Ingresá el código'),
  nombre: z.string().min(1, 'Ingresá tu nombre'),
});
```

(La validación real y autoritativa del código sigue pasando en el server action —
esto es solo para no pegarle al server con campos vacíos.)

### `components/delete-movement-modal.tsx` (nuevo)

Reemplaza el `window.confirm` de `components/delete-button.tsx`. Overlay simple (`fixed
inset-0`, fondo semitransparente) con una `Card` centrada conteniendo:
- `Input` para "Nombre"
- `Input` (`type="password"`) para "Código"
- Botones Cancelar / Confirmar (`Button variant="danger"`)
- Error inline si el server action devuelve `success: false` (código incorrecto, etc.)

No se agrega ninguna librería de diálogos nueva — es un componente liviano hecho a mano,
consistente con que el resto de la UI ya usa primitivos propios (`Card`, `Button`, `Input`).

`components/delete-button.tsx` pasa a abrir este modal en vez de `window.confirm` /
`window.alert`.

### `lib/format.ts`

Nuevo `formatFechaHora(iso: string): string` — formatea `eliminadoEn` como fecha y hora
legible en `es-AR` (ej. `21/08/2026 14:32`).

### Reestructuración de rutas para la sidebar

Se crea un route group `app/(app)/`:
- `app/(app)/layout.tsx` (nuevo) — obtiene el log (`obtenerEliminaciones()`) y renderiza
  un layout de dos columnas: `<aside>` fija a la izquierda con el log
  (`components/eliminaciones-sidebar.tsx`, nuevo) + el contenido (`children`) a la derecha.
- `app/page.tsx` → se mueve a `app/(app)/page.tsx` (sin cambios de contenido).
- `app/configuracion/page.tsx` → se mueve a `app/(app)/configuracion/page.tsx` (sin
  cambios de contenido).
- `app/login/page.tsx` **no** se mueve — queda fuera del grupo, sin sidebar.
- Los route groups no afectan las URLs: `/` y `/configuracion` siguen igual.
- `app/layout.tsx` (root) se mantiene como está (html/body/max-width wrapper); el nuevo
  layout del grupo se anida adentro.

`components/eliminaciones-sidebar.tsx` (nuevo, Server Component): recibe el array de
`EliminacionLog` y lo lista (nombre, `formatFechaHora(eliminadoEn)`, un resumen corto del
movimiento borrado — tipo + fecha + kg/bolsas según corresponda). Sin paginación por ahora
(fuera de alcance, ver abajo).

### `.env.example`

Se agrega `DELETE_CODE=1234` documentado, siguiendo el mismo patrón que `APP_PASSWORD`.
Hay que cargar `DELETE_CODE` en Vercel (Production y Preview) como env var nueva.

## Fuera de alcance

- No se loguean los intentos fallidos (código incorrecto) — solo eliminaciones exitosas,
  que es lo que se pidió.
- No hay paginación ni límite en la sidebar del log — si crece mucho en el futuro es una
  mejora aparte.
- No se agrega transacción DB explícita (ver nota arriba).
- El código de borrado es un único valor global (no por usuario) — coincide con el
  esquema de auth actual de la app (un solo `APP_PASSWORD` compartido, sin usuarios).

## Testing

- No hay tests de UI en el proyecto (solo `lib/calculo.test.ts` para lógica pura). Este
  feature es mayormente de I/O (DB, formularios) sin lógica de cálculo nueva, así que no
  se agregan tests automatizados — se verifica manualmente en preview (login → crear un
  movimiento de prueba → borrarlo con código incorrecto y correcto → confirmar que
  aparece en la sidebar en ambas páginas).
