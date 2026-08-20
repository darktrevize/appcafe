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

    const kpis = calcularKpis(movimientos);

    expect(kpis.totalVerdeIngresado).toBe(100);
    expect(kpis.tostadoRecibido).toBe(60);
    expect(kpis.verdeConsumidoTeorico).toBeCloseTo(72.29, 2);
    expect(kpis.stockVerdeRemanente).toBeCloseTo(527.71, 2);
  });

  it('devuelve ceros cuando no hay movimientos', () => {
    expect(calcularKpis([])).toEqual({
      stockVerdeRemanente: 0,
      totalVerdeIngresado: 0,
      tostadoRecibido: 0,
      verdeConsumidoTeorico: 0,
    });
  });
});
