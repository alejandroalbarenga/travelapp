import { describe, expect, it } from "vitest";
import { parseTime, typeTime } from "./time-input";

describe("typeTime", () => {
  it("pone los dos puntos solos", () => {
    expect(["1", "11", "111", "1110", "11105"].map(typeTime)).toEqual(["1", "11", "11:1", "11:10", "11:10"]);
  });
  it("una hora de 3 a 9 lleva el 0 adelante", () => {
    expect(typeTime("930")).toBe("09:30");
    expect(typeTime("9:5")).toBe("09:5");
  });
  it("respeta los dos puntos que escribís", () => {
    expect(typeTime("1:30")).toBe("1:30");
    expect(typeTime("21:4x5")).toBe("21:45");
  });
});

describe("parseTime", () => {
  it("horas de 24 h", () => {
    expect(["11:10", "23:59", "0:05", "7", "1:30", "18"].map(parseTime)).toEqual(["11:10", "23:59", "00:05", "07:00", "01:30", "18:00"]);
  });
  it("vacío o inválido", () => {
    expect(parseTime("")).toBe("");
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("11:6")).toBeNull();
    expect(parseTime("12:75")).toBeNull();
  });
});
