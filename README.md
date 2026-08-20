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
