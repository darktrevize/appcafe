export function formatKg(valor: number | null): string {
  if (valor === null) return '—';
  return valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatBolsasEntero(valor: number): string {
  return valor.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatBolsasTeoricas(valor: number): string {
  return valor.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
