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

export function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
