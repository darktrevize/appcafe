export function formatKg(valor: number | null): string {
  if (valor === null) return '—';
  return valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
