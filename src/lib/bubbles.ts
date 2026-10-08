// Burbujas del balance (pantalla Gastos, arriba): una por integrante, más grande cuanto más
// le deben o más debe. Acomoda los círculos un poco superpuestos y los escala a la caja.

export type Bubble = { x: number; y: number; r: number };

const MIN_R = 0.38; // el que está a mano también se ve
/** Cuánto se meten las burbujas una en la otra, como parte del radio de la más chica. */
export const OVERLAP = 0.3;

/** Distancia entre centros de dos burbujas que se tocan con la superposición de arriba. */
export function touchDistance(a: number, b: number): number {
  return a + b - OVERLAP * Math.min(a, b);
}

/**
 * Devuelve un círculo por valor (en el mismo orden), dentro de una caja de width × height.
 * El radio crece con la raíz del valor absoluto, así el área es proporcional a la plata.
 */
export function packBubbles(values: number[], width: number, height: number): Bubble[] {
  if (!values.length) return [];
  const max = Math.max(...values.map(Math.abs));
  const radii = values.map((v) => (max ? MIN_R + (1 - MIN_R) * Math.sqrt(Math.abs(v) / max) : MIN_R));
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

  // Escalar y centrar en la caja.
  const minX = Math.min(...placed.map((p) => p.x - p.r));
  const maxX = Math.max(...placed.map((p) => p.x + p.r));
  const minY = Math.min(...placed.map((p) => p.y - p.r));
  const maxY = Math.max(...placed.map((p) => p.y + p.r));
  const scale = Math.min(width / (maxX - minX), height / (maxY - minY));
  const offsetX = width / 2 - ((minX + maxX) / 2) * scale;
  const offsetY = height / 2 - ((minY + maxY) / 2) * scale;

  const result: Bubble[] = new Array(values.length);
  for (const p of placed) result[p.i] = { x: p.x * scale + offsetX, y: p.y * scale + offsetY, r: p.r * scale };
  return result;
}
