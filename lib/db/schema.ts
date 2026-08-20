import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const configuracion = sqliteTable('configuracion', {
  id: integer('id').primaryKey(),
  mermaPctDefault: real('merma_pct_default').notNull().default(17),
  pesoBolsaDefaultKg: real('peso_bolsa_default_kg').notNull().default(3),
});

export const movimientos = sqliteTable('movimientos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tipo: text('tipo', {
    enum: ['saldo_inicial', 'ingreso_verde', 'recepcion_tostado'],
  }).notNull(),
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
  notas: text('notas'),
});
