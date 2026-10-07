# Brief para Claude Design — Viajes en grupo (web app iPhone)

> Pegá todo este texto como prompt en Claude Design. Si exportaste imágenes del canvas (Share › Export), adjuntalas como referencia visual.

---

## Prompt

Diseñá un prototipo clickeable de una web app mobile para iPhone (390×844, se instala en la pantalla de inicio) para organizar viajes en grupo. Estilo inspirado en Polarsteps: limpio, fondos claros, tarjetas blancas con foto, un solo color de acento, botón flotante "+". Todo el texto en español rioplatense (vos). Sin status bar falsa; dejá ~56 px de safe area arriba y 34 px abajo.

### Sistema visual

- **Tipografía:** Plus Jakarta Sans (400–800). Títulos 30 px / 800 / tracking −0.02em. Body 15 px. Labels 13 px / 700.
- **Colores:**
  - Fondo app: `#F5F4F0`
  - Tarjetas: `#FFFFFF`, sombra `0 1px 2px rgba(26,28,30,.06)`
  - Texto: `#1A1C1E` · Texto secundario: `#5F6368`
  - Bordes/divisores: `#E6E4DE` / `#EEEDE8`
  - Acento: `#E04A3A` (coral) · Acento suave (fondos seleccionados): acento al 12% de opacidad
  - Saldado: fondo `#E7F1EA`, texto `#24613A`
- **Radios:** tarjetas 18–22 px, botones grandes 18 px, chips y pills 999 px, campos 14 px.
- **Íconos:** de línea (estilo Lucide), trazo 2 px. Sin emoji.
- **Touch targets:** mínimo 44 px.
- **Avatares** (círculos con iniciales, texto blanco): Ale `#2F5D8A` "Al", Ana `#A4502B` "An", Juli `#3A6E4F` "Ju", Fede `#634A83` "Fe".
- **Tab bar** inferior (84 px, blanca, borde superior): Viaje (ícono mapa) / Gastos (ícono recibo). Tab activo en color acento.
- **FAB:** círculo de 60 px, color acento, "+" blanco, a 20 px del borde derecho y 104 px del borde inferior.

### Pantalla 1 — Viaje

- Header: eyebrow "Viaje en grupo" (acento), título "Otoño en Europa", subtítulo "17 oct – 20 nov · 34 noches", botón circular de compartir. Debajo: avatares superpuestos + "Ale, Ana, Juli y Fede" + pill "12 destinos".
- Lista vertical de ciudades en tarjetas: foto 64×64 (radio 14) con badge numerado en color acento en la esquina, nombre (17 px / 700), rango de fechas, y stepper de noches (− número "noches" +). Las fechas se recalculan al cambiar las noches.
- Entre cada ciudad: línea punteada vertical alineada al centro de la foto, y un chip blanco con ícono del medio de transporte (en círculo de acento suave), duración y precio por persona, ej. "✈ 2h 9m · €120" + chevron. Tocar el chip abre el detalle del tramo.
- Un tramo sin cargar se muestra como chip punteado "Agregar tramo".
- Al final: "Vuelta a Uruguay · 20 nov".
- FAB "+" abre un menú con dos opciones: "Agregar ciudad" y "Agregar gasto" (scrim oscuro al 38%).

**Datos (ciudad · código · noches · fechas):**

| # | Ciudad | Noches | Fechas | Tramo a la siguiente |
|---|---|---|---|---|
| 1 | Madrid (MAD) | 0 | 17 oct · llegada desde Uruguay (solo escala) | Avión · 2h 9m · €120 |
| 2 | Bruselas (BRU) | 4 | 17 – 21 oct | Tren · 1h 52m · €45 |
| 3 | Ámsterdam (AMS) | 3 | 21 – 24 oct | Tren · 1h 20m · €22 |
| 4 | Eindhoven (EIN) | 1 | 24 – 25 oct | Avión · 2h 35m · €95 |
| 5 | Vilna (VNO) | 3 | 25 – 28 oct | Bus · 4h 10m · €25 |
| 6 | Riga (RIX) | 3 | 28 – 31 oct | Avión · 1h 50m · €80 |
| 7 | Oslo (OSL) | 3 | 31 oct – 3 nov | Avión · 4h 5m · €140 |
| 8 | Alicante (ALC) | 3 | 3 – 6 nov | (sin cargar: "Agregar tramo") |
| 9 | Valencia (VLC) | 3 | 6 – 9 nov | Tren · 3h 55m · €55 |
| 10 | Sevilla (SVQ) | 3 | 9 – 12 nov | Auto · 2h 10m · €35 |
| 11 | Málaga (AGP) | 2 | 12 – 14 nov | Avión · 1h 25m · €75 |
| 12 | Lisboa (LIS) | 3 | 14 – 17 nov | Avión · 1h 20m · €60 |
| 13 | Madrid (MAD) | 3 | 17 – 20 nov | — (vuelta a Uruguay) |

Madrid aparece dos veces: al inicio con 0 noches (solo conexión al llegar desde Uruguay) y al final con 3 noches antes de volver. El stepper permite 0 noches; con 0 la tarjeta muestra la fecha sola en vez de un rango. Son 12 destinos, 13 paradas y 12 tramos.

Usá fotos reales de cada ciudad en las tarjetas.

### Pantalla 2 — Detalle del tramo (bottom sheet)

- Sheet blanco desde 52 px arriba, radio superior 28 px, handle gris; detrás, la pantalla Viaje con scrim al 45% (tocarlo cierra).
- Header: "Tramo 1 de 12 · escala desde Uruguay" + título "De Madrid a Bruselas" + botón cerrar (X).
- **Medio de transporte:** 5 opciones en grilla (Auto, Tren, Avión, Bus, Otro), ícono + label; seleccionada = fondo acento suave + borde y texto acento. Seleccionado: Avión.
- **Fecha y hora:** 3 campos — Fecha "sáb 17 oct", Salida "13:40", Llegada "15:49". Debajo: "Duración 2h 9m · directo".
- **Precio:** campo "Total del grupo · €120 por persona" con "€ 480,00" + selector de moneda "EUR ▾".
- **Quién pagó:** 4 avatares de 44 px con nombre; seleccionado (Ale) con anillo de acento.
- **Se divide entre:** grilla 2×2 de chips (avatar + nombre + check), todos seleccionados; a la derecha "Partes iguales · €120 c/u" (se recalcula).
- **Pasaje adjunto:** fila con ícono "PDF" (acento suave), "Pasaje_MAD-BRU.pdf", "2 páginas · 184 KB · subido por Ale", menú "…". Debajo, 3 botones para agregar otro: PDF, Captura, Link.
- Footer fijo: botón principal grande (56 px, acento) "Ver pasaje" con ícono de ticket.

### Pantalla 3 — Ver pasaje

- Visor a pantalla completa, fondo `#0F1012`.
- Top bar: volver (‹), título "Madrid → Bruselas", subtítulo "Pasaje_MAD-BRU.pdf · página 1 de 2", compartir.
- El PDF ocupando el ancho: tarjeta de embarque genérica (sin marca real) — "TARJETA DE EMBARQUE", pasajero "ALEJANDRO [APELLIDO]", MAD → BRU grande, grilla con Fecha 17 OCT, Salida 13:40, Llegada 15:49, Vuelo [XX 0000], Asiento 14C, Grupo 2, Puerta —, Reserva [CÓDIGO], separador troquelado y código QR + "Mostrá este código en el control de seguridad".
- Indicador de páginas (2 puntos).
- Abajo: tarjeta oscura con ícono de billetera "Abrí tu Wallet si lo guardaste ahí" / "Ahí funciona sin conexión y se actualiza si cambia la puerta." y botón blanco "Abrir en la web de la aerolínea ↗".

### Pantalla 4 — Gastos

- Header: eyebrow "Otoño en Europa" + título "Gastos".
- Tarjeta total: "Total del viaje" **€1.588**, "€397 por persona · 6 gastos · 4 viajeros"; divisor; fila con avatar de Ale, "Tu balance — Te deben €503" y link "Ver balance ›".
- Lista de gastos agrupada por ciudad (título + fechas), cada fila: ícono de categoría en círculo gris, concepto, "Pagó X · entre 4", monto y "tu parte €Y".
  - **Madrid (17 oct · escala):** Vuelo Madrid → Bruselas · €480 · pagó Ale
  - **Bruselas (17 – 21 oct):** Hotel · 4 noches · €264 · pagó Ana — Tren Bruselas → Ámsterdam · €180 · pagó Juli
  - **Ámsterdam (21 – 24 oct):** Departamento · 3 noches · €420 · pagó Ale — Cena en De Pijp · €156 · pagó Fede — Museo Van Gogh · €88 · pagó Ana
- Sección **Balance** ("Con estos pagos quedan todos a mano."): filas con avatar deudor → avatar acreedor y frase:
  - "**Fede** le debe **€241** a **Ale**"
  - "**Juli** le debe **€217** a **Ale**"
  - "**Ana** le debe **€45** a **Ale**"
  - Cada una con botón outline "✓ Marcar como saldado". Al tocarlo: la fila se atenúa, la frase cambia a "le pagó", aparece pill verde "Saldado" + "Deshacer", y "Te deben" se actualiza.
- FAB "+" → Nuevo gasto. Tab Gastos activo.

### Pantalla 5 — Nuevo gasto

- Fondo blanco. Top bar: cerrar (X) / "Nuevo gasto" / pill de acento "Guardar".
- Monto grande centrado (56 px / 800) con símbolo de moneda y cursor de acento; encima, pill de moneda "EUR ▾" (alterna EUR / NOK / USD). Valor de ejemplo: "64,50".
- Campo "Concepto" con placeholder "Ej. Cena en Bruselas".
- **Pagó:** 4 avatares con nombre, Ale seleccionado (anillo de acento).
- **Se divide entre:** 4 avatares con badge de check en acento, todos seleccionados por defecto; tocar uno lo deselecciona (se atenúa). A la derecha "€ 16,13 c/u" (se recalcula).
- Teclado numérico propio fijo abajo (fondo `#F1F0EC`): grilla 3×4 con 1–9, coma, 0 y borrar; teclas blancas de 52 px.

### Navegación del prototipo

- Viaje → chip de tramo → Detalle del tramo → "Ver pasaje" → Ver pasaje → volver.
- Viaje ⇄ Gastos por tabs.
- FAB en Viaje (menú "Agregar gasto") y FAB en Gastos → Nuevo gasto → Guardar/Cerrar vuelve a Gastos.
