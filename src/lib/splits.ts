import { formatAmountInput, parseAmount, splitEqually } from "./money";

// División de un gasto entre personas: partes iguales o montos distintos (decisiones 007, 025 y 032).

export type SplitMode = "equal" | "custom";

export type SplitState = {
  memberIds: string[]; // quiénes participan, en el orden de los integrantes del viaje
  mode: SplitMode;
  custom: Record<string, string>; // lo que escribió el usuario en montos distintos
};

export type SplitResult = {
  splits: { member_id: string; amount_cents: number }[];
  /** Lo que falta repartir (negativo si se pasó). En partes iguales siempre es 0. */
  remainingCents: number;
};

export function computeSplits(totalCents: number, state: SplitState): SplitResult {
  if (state.mode === "equal") {
    const parts = splitEqually(totalCents, state.memberIds);
    return { splits: state.memberIds.map((id) => ({ member_id: id, amount_cents: parts[id] })), remainingCents: 0 };
  }
  const splits = state.memberIds.map((id) => ({ member_id: id, amount_cents: parseAmount(state.custom[id] ?? "") }));
  const assigned = splits.reduce((sum, s) => sum + s.amount_cents, 0);
  return { splits, remainingCents: totalCents - assigned };
}

/** Montos de partes iguales como texto, para arrancar "montos distintos" o "Repartir en partes iguales". */
export function equalCustom(totalCents: number, memberIds: string[]): Record<string, string> {
  const parts = splitEqually(totalCents, memberIds);
  return Object.fromEntries(memberIds.map((id) => [id, formatAmountInput(parts[id])]));
}

/** Estado inicial a partir de una división guardada: si no son partes iguales, es "montos distintos". */
export function splitStateFrom(
  totalCents: number,
  saved: { member_id: string; amount_cents: number }[],
  memberOrder: string[],
): SplitState {
  const memberIds = memberOrder.filter((id) => saved.some((s) => s.member_id === id));
  const equal = splitEqually(totalCents, memberIds);
  const isEqual = saved.every((s) => equal[s.member_id] === s.amount_cents);
  return {
    memberIds,
    mode: isEqual ? "equal" : "custom",
    custom: isEqual ? {} : Object.fromEntries(saved.map((s) => [s.member_id, formatAmountInput(s.amount_cents)])),
  };
}
