import { describe, expect, it } from "vitest";
import { AVATAR_COLORS, initialsFor, pickColor } from "./members";

describe("initialsFor", () => {
  it("dos letras, la primera en mayúscula", () => {
    expect(initialsFor("Agustín")).toBe("Ag");
    expect(initialsFor("ale")).toBe("Al");
    expect(initialsFor("  Ñandú ")).toBe("Ña");
  });

  it("ignora espacios y signos", () => {
    expect(initialsFor("J. P.")).toBe("Jp");
    expect(initialsFor("…")).toBe("?");
  });
});

describe("pickColor", () => {
  it("elige el primero libre", () => {
    expect(pickColor(["#2F5D8A", "#a4502b"])).toBe("#3A6E4F");
  });

  it("si están todos usados, rota", () => {
    expect(AVATAR_COLORS).toContain(pickColor([...AVATAR_COLORS, ...AVATAR_COLORS]));
  });
});
