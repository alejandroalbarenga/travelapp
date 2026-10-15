import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Ícono de Vamo: el logo (public/logo.svg, "Vamo" en blanco sobre rosado #FF385C, decisión 066)
// dibujado en cada tamaño. Ocupa todo el cuadrado; iOS y Android le redondean las esquinas.

let logo: Promise<string> | null = null;
function logoDataUrl() {
  logo ??= readFile(join(process.cwd(), "public/logo.svg")).then((b) => `data:image/svg+xml;base64,${b.toString("base64")}`);
  return logo;
}

export async function appIcon(size: number) {
  const src = await logoDataUrl();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse solo admite <img> */}
        <img src={src} width={size} height={size} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}
