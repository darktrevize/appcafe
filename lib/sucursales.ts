export const SUCURSALES = [
  'Charcas',
  'Quintana',
  'Borges',
  'Maipu',
  'Aeroparque',
  'Valle',
  'Montañeses',
  'Devoto',
  'Unicenter',
  'Aguero',
  'Madero',
  'Callao',
  'Lomas',
  'Lex Tower',
  'Canning',
  'Lanus',
  'Vicente Lopez',
  'Ezeiza',
  'Corrientes',
  'Rosario',
  'Monte Grande',
  'Costa Rica',
  'Barolo',
] as const;

export type Sucursal = (typeof SUCURSALES)[number];

// Egreso Café siempre se registra por bolsa tostada de 3 kg.
export const PESO_BOLSA_EGRESO_KG = 3;
