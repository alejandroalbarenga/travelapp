// Montos en centavos enteros (decisión 004). Una sola moneda por viaje: EUR (decisión 005).

/**
 * Divide un total en partes iguales. Los centavos que sobran se reparten de a uno,
 * empezando por el primero de la lista (decisión 007). La suma siempre da el total.
 */
export function splitEqually(totalCents: number, memberIds: string[]): Record<string, number> {
  if (memberIds.length === 0) return {};
  const base = Math.floor(totalCents / memberIds.length);
  let remainder = totalCents - base * memberIds.length;
  const result: Record<string, number> = {};
  for (const id of memberIds) {
    result[id] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
  }
  return result;
}

/** "€1.588", "€193,33", "-€45". Sin decimales cuando el monto es entero. */
export function formatEuros(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const decimals = abs % 100;
  const wholeText = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}€${wholeText}${decimals ? "," + String(decimals).padStart(2, "0") : ""}`;
}

/** Monto con dos decimales siempre, para campos de texto: "480,00", "1.234,50". */
export function formatAmountInput(cents: number): string {
  const whole = Math.floor(Math.abs(cents) / 100);
  const decimals = Math.abs(cents) % 100;
  return `${String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${String(decimals).padStart(2, "0")}`;
}

/**
 * Lee lo que escribió el usuario y lo pasa a centavos. Acepta "64,50", "1.234,56" y "12.5".
 * Si tiene coma, los puntos son separadores de miles. Devuelve 0 si no es un número.
 */
export function parseAmount(text: string): number {
  let s = text.trim();
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const value = Number.parseFloat(s);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100);
}
