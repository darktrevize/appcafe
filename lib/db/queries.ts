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
