"use client";

import { packBubbles } from "@/lib/bubbles";
import type { BubbleView } from "@/lib/expenses-view";

// Burbujas del balance, arriba de Gastos: una por integrante, con su color, medio transparentes
// y un poco superpuestas. El tamaño va según lo que le deben o debe; el que debe lleva el menos.

const W = 340;
const H = 220;


const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function BalanceBubbles({ bubbles }: { bubbles: BubbleView[] }) {
  const circles = packBubbles(
    bubbles.map((b) => b.cents),
    W,
    H,
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto max-h-[280px] w-full" role="img" aria-label="Balance de cada integrante">
      {/* Primero todos los círculos y después los textos, para que ninguna burbuja tape un texto. */}
      {bubbles.map((b, i) => (
        <circle
          key={b.memberId}
          cx={circles[i].x}
          cy={circles[i].y}
          r={circles[i].r}
          fill={b.color}
          fillOpacity={0.6}
        />
      ))}
      {bubbles.map((b, i) => {
        const { x, y, r } = circles[i];
        const small = r < 36;
        const nameSize = clamp(r * 0.2, 10, 15);
        const amountSize = clamp(r * 0.3, 12, 30);
        return (
          <g key={b.memberId}>
            <title>{`${b.name}: ${b.label} ${b.cents ? b.amount : ""}`}</title>
            <text x={x} textAnchor="middle" fill="#fff" fontFamily="inherit">
              <tspan x={x} y={y - (small ? nameSize * 0.2 : amountSize * 0.2)} fontSize={nameSize} fontWeight={600} opacity={0.9}>
                {b.name}
              </tspan>
              <tspan x={x} dy={small ? nameSize * 1.15 : amountSize * 1.05} fontSize={small ? nameSize : amountSize} fontWeight={800}>
                {b.cents ? (b.cents < 0 ? "-" : "") + b.amount : "€0"}
              </tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}
