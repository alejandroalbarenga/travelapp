import { formatEuros } from "./money";

// El texto de las notificaciones de gastos (decisión 065). Lo manda src/lib/push.ts.

export type ExpenseChange = "new" | "edit" | "delete";

export type ExpenseForPush = {
  tripId: string;
  description: string;
  amountCents: number;
  paidByMemberId: string;
  splits: { member_id: string; amount_cents: number }[];
};

/** El texto de la notificación para una persona del gasto. */
export function expenseMessage(change: ExpenseChange, expense: ExpenseForPush, actor: string, memberId: string): { title: string; body: string } {
  const title = `${expense.description} · ${formatEuros(expense.amountCents)}`;
  if (change === "delete") return { title, body: `${actor} lo borró.` };
  const share = expense.splits.find((s) => s.member_id === memberId)?.amount_cents ?? 0;
  const paid = expense.paidByMemberId === memberId;
  const what = change === "new" ? `${actor} lo cargó` : `${actor} lo cambió`;
  const parts = [paid ? "pagaste vos" : "", share ? `${change === "edit" ? "ahora te tocan" : "te tocan"} ${formatEuros(share)}` : ""].filter(Boolean);
  return { title, body: parts.length ? `${what}: ${parts.join(" y ")}.` : `${what}.` };
}
