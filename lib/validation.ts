import { z } from 'zod';
import { SUCURSALES } from './sucursales';

export const saldoInicialSchema = z.object({
  tipo: z.literal('saldo_inicial'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  kgVerde: z.coerce.number().positive('El kg de verde debe ser mayor a 0'),
  numeroRemito: z.string().optional(),
  notas: z.string().optional(),
});

export const ingresoVerdeSchema = z.object({
  tipo: z.literal('ingreso_verde'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  kgVerde: z.coerce.number().positive('El kg de verde debe ser mayor a 0'),
  numeroRemito: z.string().min(1, 'El número de remito es obligatorio'),
  notas: z.string().optional(),
});

export const recepcionTostadoSchema = z.object({
  tipo: z.literal('recepcion_tostado'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  bolsas: z.coerce.number().positive('La cantidad de bolsas debe ser mayor a 0'),
  pesoBolsaKg: z.coerce.number().positive('El peso por bolsa debe ser mayor a 0'),
  mermaPct: z.coerce.number().positive('La merma debe ser mayor a 0').max(99).optional(),
  numeroRemito: z.string().min(1, 'El número de remito es obligatorio'),
  notas: z.string().optional(),
});

export const salidaBolsaCafeSchema = z.object({
  tipo: z.literal('salida_bolsa_cafe'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  bolsas: z.coerce
    .number()
    .int('La cantidad de bolsas debe ser un número entero')
    .positive('La cantidad de bolsas debe ser mayor a 0'),
  sucursal: z.enum(SUCURSALES, { errorMap: () => ({ message: 'Elegí la franquicia' }) }),
  numeroRemito: z.string().optional(),
  notas: z.string().optional(),
});

export const crearMovimientoSchema = z.discriminatedUnion('tipo', [
  saldoInicialSchema,
  ingresoVerdeSchema,
  recepcionTostadoSchema,
  salidaBolsaCafeSchema,
]);

export type CrearMovimientoInput = z.infer<typeof crearMovimientoSchema>;

export const configuracionSchema = z.object({
  mermaPctDefault: z.coerce.number().positive('La merma debe ser mayor a 0').max(99),
  pesoBolsaDefaultKg: z.coerce.number().positive('El peso de bolsa debe ser mayor a 0'),
});

export type ConfiguracionInput = z.infer<typeof configuracionSchema>;

export const eliminarMovimientoSchema = z.object({
  codigo: z.string().min(1, 'Ingresá el código'),
  nombre: z.string().min(1, 'Ingresá tu nombre'),
});

export type EliminarMovimientoInput = z.infer<typeof eliminarMovimientoSchema>;
