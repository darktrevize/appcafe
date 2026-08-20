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
