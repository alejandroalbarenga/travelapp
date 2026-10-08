// Avatares: círculo con iniciales en blanco sobre un color (docs/diseño.md).
// Los cuatro primeros son los del diseño; el resto, tonos de la misma familia.
export const AVATAR_COLORS = ["#2F5D8A", "#A4502B", "#3A6E4F", "#634A83", "#8C6E3F", "#4E6F86", "#3F7E8C", "#B5654A"];

/** "Agustín" → "Ag", "ana maría" → "An". Como en el diseño: dos letras, la primera en mayúscula. */
export function initialsFor(name: string): string {
  const letters = name.trim().replace(/[^\p{L}]/gu, "");
  if (!letters) return "?";
  return letters[0].toLocaleUpperCase("es") + (letters[1] ?? "").toLocaleLowerCase("es");
}

/** El primer color de la paleta que no usa nadie del viaje; si están todos, va rotando. */
export function pickColor(usedColors: string[]): string {
  const used = new Set(usedColors.map((c) => c.toUpperCase()));
  return AVATAR_COLORS.find((c) => !used.has(c)) ?? AVATAR_COLORS[usedColors.length % AVATAR_COLORS.length];
}
