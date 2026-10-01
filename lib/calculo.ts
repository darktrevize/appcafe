import { TIPOS_MOVIMIENTO } from './db/schema';

export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export interface Movimiento {
  id: number;
  tipo: TipoMovimiento;
  fecha: string;
  createdAt: string;
  numeroRemito: string | null;
  kgVerde: number | null;
  bolsas: number | null;
  pesoBolsaKg: number | null;
  kgTostado: number | null;
  mermaPctAplicada: number | null;
  kgVerdeConsumido: number | null;
  sucursal: string | null;
  notas: string | null;
}

export interface MovimientoConSaldo extends Movimiento {
  saldoVerde: number;
}

export interface EliminacionLog {
  id: number;
  nombre: string;
  eliminadoEn: string;
  movimientoId: number;
  movimientoCreatedAt: string;
  tipo: TipoMovimiento;
  fecha: string;
  numeroRemito: string | null;
  kgVerde: number | null;
  bolsas: number | null;
  pesoBolsaKg: number | null;
  kgTostado: number | null;
  mermaPctAplicada: number | null;
  kgVerdeConsumido: number | null;
  sucursal: string | null;
  notas: string | null;
}

export interface Kpis {
  stockVerdeRemanente: number;
  totalVerdeIngresado: number;
  tostadoRecibido: number;
  verdeConsumidoTeorico: number;
  bolsasEntregadas: number;
  bolsasTeoricas: number;
  bolsasSalidas: number;
  stockBolsasTostadas: number;
}

export interface KpisConfig {
  mermaPctDefault: number;
  pesoBolsaDefaultKg: number;
}

export function calcularKgTostado(bolsas: number, pesoBolsaKg: number): number {
  return bolsas * pesoBolsaKg;
}

export function calcularVerdeConsumido(kgTostado: number, mermaPct: number): number {
  return kgTostado / (1 - mermaPct / 100);
}

export function calcularArrastre(movimientos: Movimiento[]): MovimientoConSaldo[] {
  const ordenados = [...movimientos].sort((a, b) => {
    const porFecha = a.fecha.localeCompare(b.fecha);
    if (porFecha !== 0) return porFecha;
    return a.createdAt.localeCompare(b.createdAt);
  });

  let saldo = 0;
  return ordenados.map((m) => {
    if (m.tipo === 'saldo_inicial' || m.tipo === 'ingreso_verde') {
      saldo += m.kgVerde ?? 0;
    } else if (m.tipo === 'recepcion_tostado') {
      saldo -= m.kgVerdeConsumido ?? 0;
    }
    return { ...m, saldoVerde: saldo };
  });
}

export function calcularKpis(movimientos: Movimiento[], config: KpisConfig): Kpis {
  const conSaldo = calcularArrastre(movimientos);
  const stockVerdeRemanente = conSaldo.length > 0 ? conSaldo[conSaldo.length - 1].saldoVerde : 0;

  const totalVerdeIngresado = movimientos
    .filter((m) => m.tipo === 'ingreso_verde')
    .reduce((acc, m) => acc + (m.kgVerde ?? 0), 0);

  const tostadoRecibido = movimientos
    .filter((m) => m.tipo === 'recepcion_tostado')
    .reduce((acc, m) => acc + (m.kgTostado ?? 0), 0);

  const verdeConsumidoTeorico = movimientos
    .filter((m) => m.tipo === 'recepcion_tostado')
    .reduce((acc, m) => acc + (m.kgVerdeConsumido ?? 0), 0);

  const bolsasEntregadas = movimientos
    .filter((m) => m.tipo === 'recepcion_tostado')
    .reduce((acc, m) => acc + (m.bolsas ?? 0), 0);

  // Verde remanente -> tostado esperado es la relación inversa de calcularVerdeConsumido
  // (que va de tostado -> verde necesario). El remanente se clampea a 0 porque un saldo
  // negativo (ya señalizado en la UI) no debe traducirse en bolsas negativas, y se guarda
  // contra pesoBolsaDefaultKg <= 0 para no devolver Infinity/NaN.
  const bolsasTeoricas =
    config.pesoBolsaDefaultKg <= 0
      ? 0
      : (Math.max(stockVerdeRemanente, 0) * (1 - config.mermaPctDefault / 100)) /
        config.pesoBolsaDefaultKg;

  const bolsasSalidas = movimientos
    .filter((m) => m.tipo === 'salida_bolsa_cafe')
    .reduce((acc, m) => acc + (m.bolsas ?? 0), 0);

  // Sin clamp — puede quedar negativo, igual que stockVerdeRemanente, si se registran más
  // bolsas de salida que las efectivamente recibidas del tostadero.
  const stockBolsasTostadas = bolsasEntregadas - bolsasSalidas;

  return {
    stockVerdeRemanente,
    totalVerdeIngresado,
    tostadoRecibido,
    verdeConsumidoTeorico,
    bolsasEntregadas,
    bolsasTeoricas,
    bolsasSalidas,
    stockBolsasTostadas,
  };
}
