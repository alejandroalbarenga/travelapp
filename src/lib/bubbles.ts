// Burbujas del balance (pantalla Gastos, arriba): una por integrante (decisión 097). El tamaño dice
// cómo está cada uno: el que está a mano tiene siempre el mismo tamaño; el que debe es más grande,
// más cuanto más debe comparado con los otros que deben; al que le deben, más chico, y más chico
// cuanto más le deben. Acomoda los círculos un poco superpuestos y los centra en la caja.

export type Bubble = { x: number; y: number; r: number };

// Radios relativos: a mano 1; el que más debe, 2; al que más le deben, la mitad.
const ZERO_R = 1;
const DEBT_FROM = 1.12;
const DEBT_TO = 2;
const CREDIT_FROM = 0.76;
const CREDIT_TO = 0.5;
/** El que está a mano mide siempre esto (en píxeles de la caja), salvo que no entren todos. */
export const ZERO_PX = 40;

/**
 * Radio relativo de cada uno. El valor es el balance en centavos: negativo debe, positivo le deben.
 * Crece con la raíz, así el área es proporcional a la plata, comparando con el que más debe (o al
 * que más le deben).
 */
export function bubbleRadii(values: number[]): number[] {
  const maxDebt = Math.max(0, ...values.map((v) => -v));
  const maxCredit = Math.max(0, ...values);
  return values.map((v) => {
    if (v < 0) return DEBT_FROM + (DEBT_TO - DEBT_FROM) * Math.sqrt(-v / maxDebt);
    if (v > 0) return CREDIT_FROM - (CREDIT_FROM - CREDIT_TO) * Math.sqrt(v / maxCredit);
    return ZERO_R;
  });
}
/** Cuánto se meten las burbujas una en la otra, como parte del radio de la más chica. */
export const OVERLAP = 0.3;

/** Distancia entre centros de dos burbujas que se tocan con la superposición de arriba. */
export function touchDistance(a: number, b: number): number {
  return a + b - OVERLAP * Math.min(a, b);
}

/** Devuelve un círculo por valor (en el mismo orden), dentro de una caja de width × height. */
export function packBubbles(values: number[], width: number, height: number): Bubble[] {
  if (!values.length) return [];
  const radii = bubbleRadii(values);
  const aspect = width / height;

  // De la más grande a la más chica: la primera al centro, cada una pegada a alguna ya puesta,
  // lo más cerca del centro posible (estirando a lo ancho, como la caja).
  const order = radii.map((_, i) => i).sort((a, b) => radii[b] - radii[a]);
  const placed: (Bubble & { i: number })[] = [];
  for (const i of order) {
    const r = radii[i];
    if (!placed.length) {
      placed.push({ i, x: 0, y: 0, r });
      continue;
    }
    let best: { x: number; y: number; score: number } | null = null;
    for (const p of placed) {
      for (let a = 0; a < 360; a += 10) {
        const angle = (a * Math.PI) / 180;
        const x = p.x + touchDistance(p.r, r) * Math.cos(angle);
        const y = p.y + touchDistance(p.r, r) * Math.sin(angle);
        if (placed.some((q) => Math.hypot(q.x - x, q.y - y) < touchDistance(q.r, r) - 1e-9)) continue;
        const score = (x / aspect) ** 2 + y ** 2;
        if (!best || score < best.score) best = { x, y, score };
      }
    }
    placed.push({ i, x: best!.x, y: best!.y, r });
  }

  // Escalar (el de a mano, siempre ZERO_PX; más chico solo si no entran) y centrar en la caja.
  const minX = Math.min(...placed.map((p) => p.x - p.r));
  const maxX = Math.max(...placed.map((p) => p.x + p.r));
  const minY = Math.min(...placed.map((p) => p.y - p.r));
  const maxY = Math.max(...placed.map((p) => p.y + p.r));
  const scale = Math.min(ZERO_PX / ZERO_R, width / (maxX - minX), height / (maxY - minY));
  const offsetX = width / 2 - ((minX + maxX) / 2) * scale;
  const offsetY = height / 2 - ((minY + maxY) / 2) * scale;

  const result: Bubble[] = new Array(values.length);
  for (const p of placed) result[p.i] = { x: p.x * scale + offsetX, y: p.y * scale + offsetY, r: p.r * scale };
  return result;
}
