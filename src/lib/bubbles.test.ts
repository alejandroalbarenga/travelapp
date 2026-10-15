import { describe, expect, it } from "vitest";
import { bubbleRadii, packBubbles, touchDistance, ZERO_PX, type Bubble } from "./bubbles";

const W = 340;
const H = 230;

function inside(b: Bubble) {
  return b.x - b.r >= -0.01 && b.x + b.r <= W + 0.01 && b.y - b.r >= -0.01 && b.y + b.r <= H + 0.01;
}

// Se pueden superponer un poco, pero nunca más de lo previsto (así se leen los textos).
function overlap(bubbles: Bubble[]) {
  return bubbles.some((a, i) => bubbles.some((b, j) => i < j && Math.hypot(a.x - b.x, a.y - b.y) < touchDistance(a.r, b.r) - 0.01));
}

function touching(bubbles: Bubble[]) {
  return bubbles.some((a, i) => bubbles.some((b, j) => i < j && Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r));
}

describe("packBubbles", () => {
  it("el balance del ejemplo: no se pisan y entran en la caja", () => {
    const bubbles = packBubbles([37066, -17733, -19333, 0], W, H);
    expect(bubbles).toHaveLength(4);
    expect(bubbles.every(inside)).toBe(true);
    expect(overlap(bubbles)).toBe(false);
    expect(touching(bubbles)).toBe(true);
  });

  it("el que debe es más grande, a mano el del medio, al que le deben más chico", () => {
    // Ale: le deben 370; Rodrigo y Josué deben; Agustín a mano.
    const [ale, rodrigo, josue, agustin] = packBubbles([37066, -17733, -19333, 0], W, H);
    expect(josue.r).toBeGreaterThan(rodrigo.r);
    expect(rodrigo.r).toBeGreaterThan(agustin.r);
    expect(agustin.r).toBeGreaterThan(ale.r);
  });

  it("debe 100 más grande que debe 50, y los dos más grandes que el de cero", () => {
    const [cien, cincuenta, cero] = bubbleRadii([-10000, -5000, 0]);
    expect(cien).toBeGreaterThan(cincuenta);
    expect(cincuenta).toBeGreaterThan(cero);
  });

  it("al que le deben, mucho más chico que el de cero; más chico cuanto más le deben", () => {
    const [cero, poco, mucho] = bubbleRadii([0, 1000, 8000]);
    expect(poco).toBeLessThan(cero * 0.8);
    expect(mucho).toBeLessThan(poco);
  });

  it("el de a mano siempre del mismo tamaño", () => {
    const a = packBubbles([0, -5000, 3000], W, H)[0];
    const b = packBubbles([0, -90000, 10, 200], W, H)[0];
    expect(a.r).toBeCloseTo(ZERO_PX);
    expect(b.r).toBeCloseTo(ZERO_PX);
  });

  it("todos a mano: mismas burbujas", () => {
    const bubbles = packBubbles([0, 0, 0], W, H);
    expect(new Set(bubbles.map((b) => b.r.toFixed(2))).size).toBe(1);
    expect(overlap(bubbles)).toBe(false);
  });

  it("uno solo, en el centro", () => {
    const [b] = packBubbles([-500], W, H);
    expect(b.x).toBeCloseTo(W / 2);
    expect(b.y).toBeCloseTo(H / 2);
  });

  it("muchos integrantes", () => {
    const bubbles = packBubbles([9000, -3000, -2000, -1500, -1000, -800, -700, 0], W, H);
    expect(bubbles.every(inside)).toBe(true);
    expect(overlap(bubbles)).toBe(false);
  });
});
