import { describe, it, expect } from 'vitest';
import {
  calcularKgTostado,
  calcularVerdeConsumido,
  calcularArrastre,
  calcularKpis,
  type Movimiento,
} from './calculo';

function mov(overrides: Partial<Movimiento>): Movimiento {
  return {
    id: 0,
    tipo: 'ingreso_verde',
    fecha: '2026-01-01',
    createdAt: '2026-01-01T00:00:00.000Z',
    numeroRemito: null,
    kgVerde: null,
    bolsas: null,
    pesoBolsaKg: null,
    kgTostado: null,
    mermaPctAplicada: null,
    kgVerdeConsumido: null,
    notas: null,
    ...overrides,
  };
}

describe('calcularKgTostado', () => {
  it('multiplica bolsas por peso por bolsa', () => {
    expect(calcularKgTostado(20, 3)).toBe(60);
  });
});

describe('calcularVerdeConsumido', () => {
  it('calcula el verde consumido según la merma pactada (caso del enunciado)', () => {
    expect(calcularVerdeConsumido(60, 17)).toBeCloseTo(72.29, 2);
  });

  it('con 0% de merma consume exactamente el tostado', () => {
    expect(calcularVerdeConsumido(50, 0)).toBe(50);
  });
});

describe('calcularArrastre', () => {
  it('ordena cronológicamente y acumula el saldo fila por fila', () => {
    const movimientos: Movimiento[] = [
      mov({ id: 2, tipo: 'ingreso_verde', fecha: '2026-01-10', kgVerde: 100 }),
      mov({ id: 1, tipo: 'saldo_inicial', fecha: '2026-01-01', kgVerde: 500 }),
      mov({
        id: 3,
        tipo: 'recepcion_tostado',
        fecha: '2026-01-15',
        kgTostado: 60,
        kgVerdeConsumido: 72.29,
      }),
    ];

    const resultado = calcularArrastre(movimientos);

    expect(resultado.map((m) => m.id)).toEqual([1, 2, 3]);
    expect(resultado[0].saldoVerde).toBe(500);
    expect(resultado[1].saldoVerde).toBe(600);
    expect(resultado[2].saldoVerde).toBeCloseTo(527.71, 2);
  });

  it('permite que el saldo quede negativo sin bloquear el cálculo', () => {
    const movimientos: Movimiento[] = [
      mov({ id: 1, tipo: 'saldo_inicial', fecha: '2026-01-01', kgVerde: 10 }),
      mov({
        id: 2,
        tipo: 'recepcion_tostado',
        fecha: '2026-01-02',
        kgTostado: 60,
        kgVerdeConsumido: 72.29,
      }),
    ];

    const resultado = calcularArrastre(movimientos);
    expect(resultado[1].saldoVerde).toBeCloseTo(-62.29, 2);
  });
});

describe('calcularKpis', () => {
  const config = { mermaPctDefault: 17, pesoBolsaDefaultKg: 3 };

  it('resume stock remanente, ingresos, tostado recibido y verde consumido', () => {
    const movimientos: Movimiento[] = [
      mov({ id: 1, tipo: 'saldo_inicial', fecha: '2026-01-01', kgVerde: 500 }),
      mov({ id: 2, tipo: 'ingreso_verde', fecha: '2026-01-05', kgVerde: 100 }),
      mov({
        id: 3,
        tipo: 'recepcion_tostado',
        fecha: '2026-01-10',
        kgTostado: 60,
        kgVerdeConsumido: 72.29,
      }),
    ];

    const kpis = calcularKpis(movimientos, config);

    expect(kpis.totalVerdeIngresado).toBe(100);
    expect(kpis.tostadoRecibido).toBe(60);
    expect(kpis.verdeConsumidoTeorico).toBeCloseTo(72.29, 2);
    expect(kpis.stockVerdeRemanente).toBeCloseTo(527.71, 2);
  });

  it('devuelve ceros cuando no hay movimientos', () => {
    expect(calcularKpis([], config)).toEqual({
      stockVerdeRemanente: 0,
      totalVerdeIngresado: 0,
      tostadoRecibido: 0,
      verdeConsumidoTeorico: 0,
      bolsasEntregadas: 0,
      bolsasTeoricas: 0,
    });
  });

  it('suma bolsasEntregadas sobre varios movimientos recepcion_tostado', () => {
    const movimientos: Movimiento[] = [
      mov({ id: 1, tipo: 'saldo_inicial', fecha: '2026-01-01', kgVerde: 500 }),
      mov({
        id: 2,
        tipo: 'recepcion_tostado',
        fecha: '2026-01-05',
        bolsas: 10,
        kgTostado: 30,
        kgVerdeConsumido: 36.14,
      }),
      mov({
        id: 3,
        tipo: 'recepcion_tostado',
        fecha: '2026-01-10',
        bolsas: 15,
        kgTostado: 45,
        kgVerdeConsumido: 54.22,
      }),
    ];

    expect(calcularKpis(movimientos, config).bolsasEntregadas).toBe(25);
  });

  it('bolsasTeoricas usa la merma % default y NO redondea', () => {
    const movimientos: Movimiento[] = [
      mov({ id: 1, tipo: 'saldo_inicial', fecha: '2026-01-01', kgVerde: 100 }),
    ];

    // (100 * (1 - 17/100)) / 3 = 83 / 3 = 27.6666...
    expect(calcularKpis(movimientos, config).bolsasTeoricas).toBeCloseTo(27.67, 2);
  });

  it('bolsasTeoricas se clampea a 0 cuando el remanente es negativo', () => {
    const movimientos: Movimiento[] = [
      mov({ id: 1, tipo: 'saldo_inicial', fecha: '2026-01-01', kgVerde: 10 }),
      mov({
        id: 2,
        tipo: 'recepcion_tostado',
        fecha: '2026-01-02',
        kgTostado: 60,
        kgVerdeConsumido: 72.29,
      }),
    ];

    expect(calcularKpis(movimientos, config).bolsasTeoricas).toBe(0);
  });

  it('bolsasTeoricas devuelve 0 en vez de Infinity si pesoBolsaDefaultKg es 0', () => {
    const movimientos: Movimiento[] = [
      mov({ id: 1, tipo: 'saldo_inicial', fecha: '2026-01-01', kgVerde: 100 }),
    ];

    const kpis = calcularKpis(movimientos, { mermaPctDefault: 17, pesoBolsaDefaultKg: 0 });
    expect(kpis.bolsasTeoricas).toBe(0);
  });
});
