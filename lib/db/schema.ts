import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const TIPOS_MOVIMIENTO = [
  'saldo_inicial',
  'ingreso_verde',
  'recepcion_tostado',
  'salida_bolsa_cafe',
] as const;

export const configuracion = sqliteTable('configuracion', {
  id: integer('id').primaryKey(),
  mermaPctDefault: real('merma_pct_default').notNull().default(17),
  pesoBolsaDefaultKg: real('peso_bolsa_default_kg').notNull().default(3),
});

export const movimientos = sqliteTable('movimientos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tipo: text('tipo', { enum: TIPOS_MOVIMIENTO }).notNull(),
  fecha: text('fecha').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  numeroRemito: text('numero_remito'),
  kgVerde: real('kg_verde'),
  bolsas: integer('bolsas'),
  pesoBolsaKg: real('peso_bolsa_kg'),
  kgTostado: real('kg_tostado'),
  mermaPctAplicada: real('merma_pct_aplicada'),
  kgVerdeConsumido: real('kg_verde_consumido'),
  sucursal: text('sucursal'),
  notas: text('notas'),
});

export const eliminacionesLog = sqliteTable('eliminaciones_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  eliminadoEn: text('eliminado_en')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  movimientoId: integer('movimiento_id').notNull(),
  movimientoCreatedAt: text('movimiento_created_at').notNull(),
  tipo: text('tipo', { enum: TIPOS_MOVIMIENTO }).notNull(),
  fecha: text('fecha').notNull(),
  numeroRemito: text('numero_remito'),
  kgVerde: real('kg_verde'),
  bolsas: integer('bolsas'),
  pesoBolsaKg: real('peso_bolsa_kg'),
  kgTostado: real('kg_tostado'),
  mermaPctAplicada: real('merma_pct_aplicada'),
  kgVerdeConsumido: real('kg_verde_consumido'),
  sucursal: text('sucursal'),
  notas: text('notas'),
});
