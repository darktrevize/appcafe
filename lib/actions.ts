'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from './db/client';
import { movimientos, configuracion, eliminacionesLog } from './db/schema';
import { obtenerConfiguracion } from './db/queries';
import { calcularKgTostado, calcularVerdeConsumido } from './calculo';
import { crearMovimientoSchema, configuracionSchema, eliminarMovimientoSchema } from './validation';

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

export async function eliminarMovimiento(
  id: number,
  codigo: string,
  nombre: string
): Promise<ActionResult> {
  const parsed = eliminarMovimientoSchema.safeParse({ codigo, nombre });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  if (parsed.data.codigo !== (process.env.DELETE_CODE ?? '')) {
    return { success: false, error: 'Código incorrecto.' };
  }

  try {
    const [movimiento] = await db.select().from(movimientos).where(eq(movimientos.id, id));
    if (!movimiento) {
      return { success: false, error: 'No se pudo eliminar el movimiento.' };
    }

    // eliminadoEn is set explicitly here (UTC, trailing "Z") instead of relying on the
    // column's CURRENT_TIMESTAMP default — same pattern movimientos.createdAt already
    // uses in crearMovimiento above. The "Z" suffix matters: formatFechaHora (Task 6)
    // needs a value Date() can parse as UTC unambiguously to convert to Argentina time.
    await db.insert(eliminacionesLog).values({
      nombre: parsed.data.nombre,
      eliminadoEn: new Date().toISOString(),
      movimientoId: movimiento.id,
      movimientoCreatedAt: movimiento.createdAt,
      tipo: movimiento.tipo,
      fecha: movimiento.fecha,
      numeroRemito: movimiento.numeroRemito,
      kgVerde: movimiento.kgVerde,
      bolsas: movimiento.bolsas,
      pesoBolsaKg: movimiento.pesoBolsaKg,
      kgTostado: movimiento.kgTostado,
      mermaPctAplicada: movimiento.mermaPctAplicada,
      kgVerdeConsumido: movimiento.kgVerdeConsumido,
      notas: movimiento.notas,
    });

    await db.delete(movimientos).where(eq(movimientos.id, id));

    revalidatePath('/');
    revalidatePath('/configuracion');
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
