// Balance del viaje: neto por miembro = lo que pagó − lo que le toca ± settlements.

export type BalanceExpense = {
  paidBy: string;
  amountCents: number;
  splits: { memberId: string; amountCents: number }[];
};

export type Settlement = { from: string; to: string; amountCents: number };

export type Transfer = { from: string; to: string; amountCents: number };

/**
 * Neto de cada miembro en centavos. Positivo: le deben. Negativo: debe.
 * Un settlement de A a B cuenta como si A hubiera pagado esa plata por B.
 */
export function netBalances(
  memberIds: string[],
  expenses: BalanceExpense[],
  settlements: Settlement[] = [],
): Record<string, number> {
  const net: Record<string, number> = Object.fromEntries(memberIds.map((id) => [id, 0]));
  const add = (id: string, cents: number) => {
    net[id] = (net[id] ?? 0) + cents;
  };
  for (const e of expenses) {
    add(e.paidBy, e.amountCents);
    for (const s of e.splits) add(s.memberId, -s.amountCents);
  }
  for (const s of settlements) {
    add(s.from, s.amountCents);
    add(s.to, -s.amountCents);
  }
  return net;
}

/**
 * Simplifica las deudas de forma greedy: el que más debe le paga al que más le deben,
 * hasta que quedan todos en cero.
 */
export function simplifyDebts(net: Record<string, number>): Transfer[] {
  const debtors = Object.entries(net)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id, left: -v }))
    .sort((a, b) => b.left - a.left);
  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id, left: v }))
    .sort((a, b) => b.left - a.left);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].left, creditors[j].left);
    transfers.push({ from: debtors[i].id, to: creditors[j].id, amountCents: amount });
    debtors[i].left -= amount;
    creditors[j].left -= amount;
    if (debtors[i].left === 0) i++;
    if (creditors[j].left === 0) j++;
  }
  return transfers;
}
