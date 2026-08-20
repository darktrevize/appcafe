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
  get(_target, prop) {
    const real = getInstance();
    return Reflect.get(real, prop, real);
  },
});
