import { describe, expect, it } from "vitest";
import { placeCode, toPlace } from "./places";

describe("placeCode", () => {
  it("tres letras sin acentos", () => {
    expect(placeCode("Ámsterdam")).toBe("AMS");
    expect(placeCode("Málaga")).toBe("MAL");
    expect(placeCode("Ñuñoa")).toBe("NUN");
    expect(placeCode("San José")).toBe("SAN");
  });
});

describe("toPlace", () => {
  it("arma el lugar con país, región y zona horaria", () => {
    const place = toPlace({
      name: "Roma",
      lat: "41.8933203",
      lon: "12.4829321",
      addresstype: "city",
      address: { country: "Italia", country_code: "IT", state: "Lacio" },
    });
    expect(place).toMatchObject({ name: "Roma", region: "Lacio", country: "Italia", countryCode: "it", timezone: "Europe/Rome", code: "ROM" });
  });

  it("zona horaria de Vilna y de Montevideo", () => {
    expect(toPlace({ name: "Vilna", lat: "54.69", lon: "25.28" })?.timezone).toBe("Europe/Vilnius");
    expect(toPlace({ name: "Montevideo", lat: "-34.9", lon: "-56.16" })?.timezone).toBe("America/Montevideo");
  });

  it("descarta resultados sin coordenadas", () => {
    expect(toPlace({ name: "X", lat: "abc", lon: "1" })).toBeNull();
  });
});
