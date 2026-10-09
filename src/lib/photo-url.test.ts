import { describe, expect, it } from "vitest";
import { largePhoto, pickPhoto } from "./photo-url";

const T = "https://thumb.wikimedia.org/wikipedia/commons/thumb";

describe("pickPhoto", () => {
  it("usa la foto principal si es una foto, en 500 px y sin parámetros", () => {
    const summary = { thumbnail: { source: `${T}/4/41/Lisbon.jpg/330px-Lisbon.jpg?utm_source=es.wikipedia.org` } };
    expect(pickPhoto(summary, null)).toBe(`${T}/4/41/Lisbon.jpg/500px-Lisbon.jpg`);
  });

  it("descarta banderas y busca una foto en el artículo", () => {
    const summary = { thumbnail: { source: `${T}/d/d7/Bandera_de_la_ciudad_de_Madrid.svg/langes-330px-Bandera.svg.png` } };
    const media = {
      items: [
        { type: "image", title: "Archivo:Escudo_de_Madrid.jpg", srcset: [{ src: "//x/500px-Escudo.jpg" }] },
        { type: "image", title: "Archivo:Palacio_real.jpg", srcset: [{ src: `//thumb.wikimedia.org/a/Palacio.jpg/500px-Palacio.jpg?utm=1` }] },
      ],
    };
    expect(pickPhoto(summary, media)).toBe("https://thumb.wikimedia.org/a/Palacio.jpg/500px-Palacio.jpg");
  });

  it("en la lista del artículo no toma collages ni imágenes que no son jpg", () => {
    const media = {
      items: [
        { type: "image", title: "Archivo:Vilnius_montage.jpg", srcset: [{ src: "//x/500px-a.jpg" }] },
        { type: "image", title: "Archivo:Plano.png", srcset: [{ src: "//x/500px-b.png" }] },
        { type: "video", title: "Archivo:Video.jpg", srcset: [{ src: "//x/500px-c.jpg" }] },
      ],
    };
    expect(pickPhoto(null, media)).toBeNull();
  });

  it("si la foto principal es un collage, busca una foto común en el artículo", () => {
    const summary = { thumbnail: { source: `${T}/3/3c/Bruselas_collage.png/330px-Bruselas_collage.png` } };
    const media = { items: [{ type: "image", title: "Archivo:Grand-Place.jpg", srcset: [{ src: "//thumb.wikimedia.org/g/Grand.jpg/500px-Grand.jpg" }] }] };
    expect(pickPhoto(summary, media)).toBe("https://thumb.wikimedia.org/g/Grand.jpg/500px-Grand.jpg");
    expect(pickPhoto({ thumbnail: { source: `${T}/m/Montage_Amsterdam.jpg/330px-Montage_Amsterdam.jpg` } }, null)).toBeNull();
  });
});

describe("largePhoto", () => {
  it("pide la versión de 960 px", () => {
    expect(largePhoto(`${T}/x/a.jpg/500px-a.jpg`)).toBe(`${T}/x/a.jpg/960px-a.jpg`);
  });
});
