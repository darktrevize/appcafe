import { desc, eq } from 'drizzle-orm';
import { db } from './client';
import { movimientos, configuracion, eliminacionesLog } from './schema';
import type { Movimiento, EliminacionLog } from '../calculo';

export async function obtenerMovimientos(): Promise<Movimiento[]> {
  return db.select().from(movimientos);
}

export async function obtenerConfiguracion() {
  const [config] = await db.select().from(configuracion).where(eq(configuracion.id, 1));
  return config ?? { id: 1, mermaPctDefault: 17, pesoBolsaDefaultKg: 3 };
}

export async function obtenerEliminaciones(): Promise<EliminacionLog[]> {
  return db.select().from(eliminacionesLog).orderBy(desc(eliminacionesLog.eliminadoEn));
}
