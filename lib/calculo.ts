export type TipoMovimiento = 'saldo_inicial' | 'ingreso_verde' | 'recepcion_tostado';

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
  notas: string | null;
}

export interface MovimientoConSaldo extends Movimiento {
  saldoVerde: number;
}

export interface Kpis {
  stockVerdeRemanente: number;
  totalVerdeIngresado: number;
  tostadoRecibido: number;
  verdeConsumidoTeorico: number;
  bolsasEntregadas: number;
  bolsasTeoricas: number;
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

  return {
    stockVerdeRemanente,
    totalVerdeIngresado,
    tostadoRecibido,
    verdeConsumidoTeorico,
    bolsasEntregadas,
    bolsasTeoricas,
  };
}
