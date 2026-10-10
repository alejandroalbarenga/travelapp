import { describe, expect, it } from "vitest";
import { packBubbles, touchDistance, type Bubble } from "./bubbles";

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

  it("más plata, burbuja más grande; el que está a mano igual se ve", () => {
    const [ale, rodrigo, josue, agustin] = packBubbles([37066, -17733, -19333, 0], W, H);
    expect(ale.r).toBeGreaterThan(josue.r);
    expect(josue.r).toBeGreaterThan(rodrigo.r);
    expect(rodrigo.r).toBeGreaterThan(agustin.r);
    expect(agustin.r).toBeGreaterThan(15);
  });

  it("todos a mano: mismas burbujas", () => {
    const bubbles = packBubbles([0, 0, 0], W, H);
    expect(new Set(bubbles.map((b) => b.r.toFixed(2))).size).toBe(1);
    expect(overlap(bubbles)).toBe(false);
  });

  it("uno solo, en el centro", () => {
    const [b] = packBubbles([500], W, H);
    expect(b.x).toBeCloseTo(W / 2);
    expect(b.y).toBeCloseTo(H / 2);
    expect(b.r).toBeCloseTo(H / 2);
  });

  it("muchos integrantes", () => {
    const bubbles = packBubbles([9000, -3000, -2000, -1500, -1000, -800, -700, 0], W, H);
    expect(bubbles.every(inside)).toBe(true);
    expect(overlap(bubbles)).toBe(false);
  });
});
