"use client";

import { packBubbles } from "@/lib/bubbles";
import type { BubbleView } from "@/lib/expenses-view";

// Burbujas del balance, arriba de Gastos: una por integrante, del tamaño de lo que le deben
// (verde) o debe (naranja), medio transparentes y un poco superpuestas. El que está a mano queda
// chiquita y gris. La tuya, con borde blanco.

const W = 340;
const H = 220;

const FILL = { plus: "rgb(31 169 113 / 0.72)", minus: "rgb(245 137 31 / 0.72)", zero: "rgb(255 255 255 / 0.16)" };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function BalanceBubbles({ bubbles }: { bubbles: BubbleView[] }) {
  const circles = packBubbles(
    bubbles.map((b) => b.cents),
    W,
    H,
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Balance de cada integrante">
      {/* Primero todos los círculos y después los textos, para que ninguna burbuja tape un texto. */}
      {bubbles.map((b, i) => (
        <circle
          key={b.memberId}
          cx={circles[i].x}
          cy={circles[i].y}
          r={b.isMe ? circles[i].r - 1.5 : circles[i].r}
          fill={b.cents > 0 ? FILL.plus : b.cents < 0 ? FILL.minus : FILL.zero}
          stroke={b.isMe ? "rgb(255 255 255 / 0.9)" : "none"}
          strokeWidth={2.5}
        />
      ))}
      {bubbles.map((b, i) => {
        const { x, y, r } = circles[i];
        const small = r < 36;
        const nameSize = clamp(r * 0.2, 10, 15);
        const amountSize = clamp(r * 0.3, 12, 30);
        const labelSize = clamp(r * 0.16, 9, 13);
        return (
          <g key={b.memberId}>
            <title>{`${b.name}: ${b.label} ${b.cents ? b.amount : ""}`}</title>
            <text x={x} textAnchor="middle" fill="#fff" fontFamily="inherit">
              <tspan x={x} y={y - (small ? nameSize * 0.2 : amountSize * 0.55)} fontSize={nameSize} fontWeight={600} opacity={0.9}>
                {b.name}
              </tspan>
              <tspan x={x} dy={small ? nameSize * 1.15 : amountSize * 1.05} fontSize={small ? nameSize : amountSize} fontWeight={800}>
                {b.cents ? (b.cents < 0 ? "-" : "") + b.amount : "€0"}
              </tspan>
              {!small && (
                <tspan x={x} dy={labelSize * 1.5} fontSize={labelSize} fontWeight={600} opacity={0.85}>
                  {b.label}
                </tspan>
              )}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
