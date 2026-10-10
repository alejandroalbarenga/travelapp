# Diseño — Vamo

Diseño final, tomado del prototipo de Claude Design (proyecto "Viajes en grupo", archivo `Viajes en grupo.dc.html`, con `TripMap.js` para el mapa). Reemplaza al brief anterior. Si algo de acá contradice a `decisiones.md`, manda `decisiones.md`.

Los datos de ejemplo del prototipo (viaje "Otoño en Europa", 17 oct – 20 nov 2026) están al final.

---

## Sistema visual

### Tipografía

- **Plus Jakarta Sans** (400, 500, 600, 700, 800) para todo.
- **Caveat** (700) solo para la frase de la ciudad (tagline) en la pantalla de ciudad: 28 px, estilo manuscrito.
- Escala usada:
  - Nombre de ciudad en la pantalla de ciudad: 52 / 800 / tracking −0.03em.
  - Monto en "Nuevo gasto": 56 / 800 / −0.03em.
  - Total del viaje: 40 / 800 / −0.02em.
  - Títulos de pantalla: 28–30 / 800 / −0.02em ("Alejandro", "Gastos").
  - Títulos de sección y de sheets: 22–24 / 800 / −0.02em ("Quién está", "Notas", "Nuevo viaje").
  - Subtítulos de sección: 20 / 800 / −0.01em ("Próximos viajes", "Balance").
  - Nombre de ciudad en la lista: 17 / 700.
  - Body: 15 / 600–700. Secundario: 13 / 400–600.
  - Labels de campo: 13 / 700, color secundario. Labels chicos dentro de campos: 11 / 700.

### Colores

Valores exactos en la decisión 026 de `decisiones.md`. Resumen:

| Rol | Valor |
|---|---|
| Primario (navy) | `#00293D`; botones con degradé `#06384F → #00293D` (180°); hover de links `#001B29` |
| Primario suave (fondos seleccionados) | `rgba(0,41,61,.08)` a `.10`; chips de persona activa `#EAF2F8` |
| Acento naranja | `#F5891F`; degradé `#FFA445 → #F5891F` |
| Fondo de pantallas | `#FFFFFF` |
| Superficie gris (segmentados, botón cerrar, teclado) | `#EEF3F8`; más clara `#F6F9FC` |
| Tarjetas | degradé `#FFFFFF → #F6F9FC`, borde `rgba(0,41,61,.07)` |
| Texto | `#1A1C1E` · secundario `#5F6368` · terciario `#8A929B` · apagado `#9AA0A6` / `#B4B9BF` |
| Bordes de campos y botones | `#E2E8EF` · divisores `#EDF1F6` / `#E6ECF2` |
| Línea punteada del recorrido | `#C3CEDA` (móvil) · `#9FB2C4` (web) |
| Bordes punteados de "agregar" | `#C3CEDA` / `#CFD8E2` |
| Handle de sheets | `#D3DBE4` |
| Éxito | `#1F9D55`; saldado: fondo `#E7F1EA`, texto `#24613A`; anillo completo `#1FA971` |
| Error / deuda | `#A8382B`; fondo de "Borrar" al deslizar `#B23A2E` |
| Aviso de huso horario | ícono `#F5891F` sobre `#FFF1E0`; caja `#FFF4E8`, borde `#FFD9B0`, texto `#7A4A12` |

**Colores por medio de transporte** (ícono / fondo del círculo). Se usan en el chip del tramo, en la grilla de medios y en los íconos de gastos de transporte:

| Medio | Color | Fondo |
|---|---|---|
| Avión | `#1E6FD9` | `rgba(30,111,217,.13)` |
| Tren | `#E8770E` | `rgba(232,119,14,.14)` |
| Bus | `#1F9D55` | `rgba(31,157,85,.14)` |
| Auto | `#D93A3A` | `rgba(217,58,58,.12)` |
| Otro | `#7A4FD6` | `rgba(122,79,214,.13)` |

**Avatares** (círculo con iniciales en blanco): `#2F5D8A`, `#A4502B`, `#3A6E4F`, `#634A83`.

**Visor de pasaje** (oscuro): fondo `#0F1012`, tarjeta `#1C1D20`, círculo de ícono `#2A2C30`, texto secundario `#9AA0A6` / `#A8ADB3`, punto de página inactivo `#45484D`.

**Toast:** fondo `#1A1C1E`, texto blanco, botón "Deshacer" `#8EC5DE`.

**Calendario:** barras de ciudad alternando `#DCE3EA` / `#C9D3DD` con texto `#33414D`; ciudad elegida en `#00293D` con texto blanco.

**Scrims:** `rgba(15,16,18,…)` al 38% (menú del +), 45% (detalle del tramo), 40% (sheets), 28% (calendario).

### Sombras y vidrio

- **Tarjeta:** `0 1px 2px rgba(0,41,61,.06), 0 8px 22px rgba(0,41,61,.07), inset 0 1px 0 #fff`.
- **Botón primario:** `0 6px 16px rgba(0,41,61,.22)`.
- **Vidrio** (botones flotantes sobre el mapa, menú del +, barra de la ciudad): fondo `rgba(255,255,255,.62)`, `backdrop-filter: blur(24px) saturate(180%)`, borde `1px solid rgba(255,255,255,.75)`, sombra `0 10px 30px rgba(0,41,61,.18), inset 0 1px 0 rgba(255,255,255,.9)`.
- **Vidrio oscuro** (control Viaje / Gastos): fondo `rgba(0,41,61,.84)` con el mismo blur, borde `rgba(255,255,255,.16)`.

### Radios

- Pills, chips, avatares, botones redondos: 999 px.
- Tarjetas de lista: 24 px. Tarjeta de resumen (inicio, total de gastos): 26 px. Tarjetas grandes (viaje próximo, notas, alojamiento): 30 px.
- Foto de ciudad en la lista: 16 px (móvil), 22 px (web).
- Campos: 16 px. Botón principal grande: 22 px (56 px de alto). Teclas del teclado numérico: 12 px.
- Sheets: 28–32 px arriba.

### Íconos y tamaños

- Íconos de línea estilo Lucide, trazo 2 px, en 12 / 16 / 20 / 28 px. Sin emoji.
- Touch targets de 44 px como mínimo.
- Banderas de país en círculo (imágenes de flagcdn).

---

## Navegación y estructura

- **Inicio** (lista de viajes) → tocar un viaje abre el **Viaje**.
- Dentro de un viaje no hay tab bar: hay un **control flotante "Viaje / Gastos"** abajo a la izquierda (pill de vidrio oscuro, 56 px de alto, a 20 px del borde y 34 px de abajo) y el **botón +** abajo a la derecha (círculo navy de 56 px).
- Arriba, botones flotantes de vidrio: volver al inicio (‹), pill central con el nombre del viaje y el rango de fechas, y en columna a la derecha: calendario, integrantes (con badge naranja con la cantidad) y compartir.
- Toasts abajo, con "Deshacer" cuando corresponde (borrar una ciudad).

### Versión web (≥ 1100 px de ancho)

- Panel izquierdo (58%) con la lista y mapa a la derecha (42%, con 16 px de margen y radio 24).
- Header fijo del panel: volver, nombre del viaje, rango y cantidad de destinos, anillo de noches planeadas, segmentado Viaje / Gastos, avatares de integrantes, calendario, compartir y botón principal ("Agregar ciudad" en Viaje, "Agregar gasto" en Gastos).
- Las ciudades se muestran en una grilla de 2 a 4 columnas (según el ancho) que se recorre en zigzag: una fila de izquierda a derecha, la siguiente de derecha a izquierda, unidas por la línea punteada. Cada ciudad: número arriba, foto 4:3 con pill de noches y de alojamiento, nombre, fechas, país y stepper de noches. El chip del tramo va sobre la línea, entre una ciudad y la siguiente.
- Pasar el mouse por una ciudad la resalta en el mapa.
- "Nuevo viaje" y "Configuración" se abren como modales centrados (480 px) en vez de sheets.
- Debajo de 1100 px se usa el diseño de móvil.

---

## Pantallas

### 00 · Inicio

- Avatar grande (76 px) con bandera de Uruguay en la esquina, "Hola," (navy) + nombre (30 / 800) + ciudad. Botón de configuración (engranaje).
- Tarjeta de estadísticas: países visitados, viajes hechos, noches afuera; abajo, banderas superpuestas y la lista de países.
- **Próximos viajes** + botón "Nuevo viaje". Tarjetas de 212 px con foto, degradé oscuro abajo, pill de vidrio con las fechas, recuadro de cuenta regresiva ("10 días", "Hoy · empieza", "Ya · en curso"), nombre, subtítulo ("12 destinos · 34 noches") y avatares.
- **Viajes pasados:** lista con foto 56 px, nombre, "mes año · N noches" y banderas.

### 01 · Viaje

- **Mapa de fondo** (OpenStreetMap con Leaflet) con el recorrido como línea punteada navy sobre una blanca, y pines numerados navy. Si hay lugar, el pin muestra también el nombre de la ciudad en un chip de vidrio. Tocar un pin abre esa ciudad.
- Encima del mapa, la lista como un **sheet que se arrastra**: arranca a 340 px de arriba y al scrollear sube hasta cubrir la pantalla (el header de vidrio aparece cuando llega arriba).
- Cabecera de la lista: círculo navy con ícono de casa, "Empieza el viaje" y la fecha ("SÁB 17 OCT 2026"), y a la derecha un **anillo de noches planeadas** ("34/34 noches"): naranja si faltan, verde si coincide con la duración del viaje, rojo si se pasa.
- **Tarjeta de ciudad:** foto 64×64 (radio 16) con badge numerado navy; si no hay foto, el código de la ciudad sobre un color de fondo. Nombre (17 / 700), fechas ("17 – 21 oct", o una sola fecha si es de paso; la primera dice "17 oct · escala"), y si hay alojamiento una línea con ícono de cama: "Booking · pagado" (verde) o "Airbnb · reservado". A la derecha, stepper de noches (− número "noches" +). Tocar la tarjeta abre la ciudad.
- **Deslizar la tarjeta a la izquierda** muestra "Borrar" en rojo; al borrar aparece un toast con "Deshacer".
- **Entre ciudades**, sobre la línea punteada:
  - Botón "+" chico para agregar una ciudad ahí.
  - **Chip del tramo:** círculo con el ícono del medio en su color, el texto según la preferencia de cada usuario (ver decisión 021: "13:40 → 15:49" o "2h 9m"), un relojito naranja si cambia el huso horario, y chevron. Sin datos de horario muestra "Completar datos". Abre el detalle del tramo.
  - **Botón de pasaje:** círculo navy con ícono de ticket si hay pasaje adjunto (abre el visor); punteado si no hay (abre el tramo).
  - Tramo sin cargar: chip punteado "Agregar tramo" (o "Agregar vuelta" después de la última ciudad).
- Al final: "Vuelta a Uruguay · 20 nov".
- **Botón +:** menú con tres opciones de vidrio: "Agregar ciudad", "Agregar tramo" (abre el primer tramo sin cargar) y "Agregar gasto".

### 02 · Detalle del tramo (sheet)

- Sheet blanco desde 52 px arriba, radio 28, handle; scrim al 45%.
- Encabezado: "Tramo 1 de 12 · escala desde Uruguay" (o "Vuelta a Uruguay"), título "De Madrid a Bruselas", botón cerrar.
- **Medio de transporte:** grilla de 5 (Auto, Tren, Avión, Bus, Otro). El elegido toma el color de su medio (borde, fondo suave y texto).
- **Fecha y hora:** Fecha (no editable: es el día en que se sale de la ciudad, calculado por las noches), Salida y Llegada (inputs de hora). Debajo, "Duración 2h 9m · directo".
- Si las ciudades tienen distinto huso, una caja naranja: "Bruselas está 1 h adelante de Madrid. Los horarios van en hora local de cada ciudad: llegás 15:49 en Bruselas, que son las 14:49 en Madrid." La duración ya descuenta la diferencia.
- **Precio:** "Total del grupo · €120 por persona" y el monto en euros (sin selector de moneda).
- **Pagó:** chips con avatar y nombre; el elegido en navy con texto blanco.
- Debajo, texto: "Se divide entre Ale, Rodrigo y Josué · €160 c/u". Se divide entre las personas que están en la ciudad de destino. En el prototipo no hay selector acá; la decisión 032 suma el mismo de "Nuevo gasto" (entre quiénes y "Partes iguales / Montos distintos").
- **Pasajes:** "3 de 3 viajeros". Una fila por pasaje: ícono PDF con el avatar de su dueño en la esquina, "Tu pasaje" (el tuyo primero) o "Pasaje de Rodrigo", y "Pasaje_MAD-BRU_Rodrigo.pdf · asiento 14D · 181 KB". Sin pasajes: "Todavía no hay un pasaje adjunto."
- Tres botones punteados para agregar: PDF, Captura, Link.
- Footer fijo: "Ver mi pasaje" (con ícono de ticket) si hay pasaje; si no, "Guardar tramo".

### 03 · Ver pasaje

- Pantalla completa sobre `#0F1012`. Top bar: volver, "Madrid → Bruselas", "Pasaje_MAD-BRU_Ale.pdf · página 1 de 2", compartir.
- El PDF a lo ancho (en el prototipo, una tarjeta de embarque genérica con QR).
- Indicador de páginas (puntos).
- Tarjeta oscura: ícono de billetera, "Abrí tu Wallet si lo guardaste ahí" / "Ahí funciona sin conexión y se actualiza si cambia la puerta." y botón blanco "Abrir en la web de la aerolínea ↗".

### 04 · Gastos

- Header: volver, eyebrow con el nombre del viaje (navy), título "Gastos".
- **Tarjeta total:** "Total del viaje" **€1.588**, "6 gastos · 4 viajeros"; divisor; tu avatar, "Tu balance — Te deben €X" (o "Debés €X" / "Estás a mano") y "Ver balance ›" (scrollea a la sección).
- **Gastos agrupados por ciudad** (nombre + fechas). Cada fila: ícono de categoría en círculo (los de transporte con el color de su medio, el resto gris), concepto, "Pagó X · entre N" (+ "· montos distintos" si aplica), monto y "tu parte €Y" o "no participás".
- **Balance** ("Con estos pagos quedan todos a mano."): filas con avatar deudor → avatar acreedor y "**Josué** le debe **€X** a **Ale**", y botón "✓ Marcar como saldado". Al saldar, la fila se atenúa, dice "le pagó", aparece la pill verde "Saldado" y "Deshacer". Si está todo saldado: "Todo saldado. Quedan todos a mano."
- El + abre "Nuevo gasto".

### 05 · Nuevo gasto

- Pantalla blanca. Top bar: cerrar / "Nuevo gasto" / pill navy "Guardar".
- Monto grande centrado: "€" (28 px gris) + número (56 / 800) + cursor navy titilando. Sin selector de moneda.
- **Concepto** (placeholder "Ej. Cena en Bruselas").
- **Ciudad** (no está en el prototipo, la suma la decisión 033): por defecto la ciudad donde están hoy.
- **Pagó:** 4 avatares de 44 px con nombre; el elegido con anillo navy.
- **Se divide entre:** avatares con check navy; tocar uno lo saca (se atenúa). A la derecha "€ 16,13 c/u". Por defecto, los que están en la ciudad elegida.
- Segmentado **"Partes iguales / Montos distintos"**. En montos distintos: una fila por persona con su monto en €, y abajo "Faltan €X por repartir" / "Te pasaste €X" (rojo) o "Cierra justo con el total" (verde), y el link "Repartir en partes iguales". No deja guardar si no cierra.
- Teclado numérico propio abajo (fondo `#EEF3F8`, teclas blancas de 52 px): 1–9, coma, 0, borrar.

### 06 · Ciudad

Se abre al tocar una ciudad (en la lista o en el mapa). Sube como un sheet sobre el mapa, que se centra en esa ciudad.

- **Foto grande** (320 px) con degradé, bandera y país, nombre (52 / 800) y la frase en Caveat.
- **Barra de vidrio** encima de la foto: rango de fechas con ícono de calendario (abre el calendario para elegir el día de llegada) y stepper de noches grande.
- **Quién está:** chips de cada integrante (activo en azul suave, inactivo atenuado), "3 personas". Debajo: "Se suma Agustín · Se fue Josué respecto a Oslo" o "Los mismos que en Riga". Tiene que quedar al menos una persona.
- **Ubicación en el recorrido** (solo al agregar una ciudad nueva): select "Después de 3. Ámsterdam".
- **Notas:** tarjeta con marco naranja (degradé) y fondo `#FFF8F0`, textarea "Agregá tus notas" que crece al enfocarla.
- **Alojamiento:** tarjeta navy. Nombre ("Agregá tu alojamiento"), "Reservado en": Booking / Airbnb / Hostelworld / Otro (decisión 045), comprobante (un archivo PDF o imagen: "Subir comprobante", o la fila con el archivo y una X para quitarlo). Si se eligió dónde se reservó, aparece **Precio total**, **Pagó** y "Se divide entre … · €132 c/u · €66 por noche" (con el selector de la decisión 032). Arriba a la derecha, el estado: "€264 · pagó Rodrigo", "Reservado en Airbnb", "Sin confirmar" o "Sin reservar".
- **Transporte:** dos filas, "Llegás · vie 17 oct — Desde Madrid" y "Te vas · mar 21 oct — Hacia Ámsterdam", con ícono del medio, horarios, duración y precio por persona. Tocar abre el tramo.
- Arriba: volver (‹; si hubo cambios sin guardar, los descarta con un toast "Cambios descartados") y menú "···" con "Cambiar nombre" y "Borrar ciudad" (rojo).
- Abajo, botón flotante: "Listo", "Guardar cambios" (navy, si hubo cambios) o "Agregar ciudad" (si es nueva).

### 07 · Nuevo viaje (sheet)

- "Nuevo viaje", campo "Nombre del viaje" ("Ej. Verano en Japón"), fechas "Desde" y "Hasta", botón "Crear viaje".
- Validaciones con toast: "Ponele un nombre al viaje", "Elegí las fechas", "La vuelta tiene que ser después de la ida".

### 08 · Calendario

- Sheet desde 52 px arriba, fondo `rgba(251,250,247,.94)` con blur. Cerrar, título (nombre del viaje y rango) y, en modo elegir fecha, "Guardar".
- Meses en vertical, semanas de lunes a domingo, días de 94 px de alto.
- Cada ciudad es una **barra** con su nombre que empieza a mitad del día de llegada y termina a mitad del día de salida: **el día de viaje queda partido entre las dos ciudades**. Las escalas de 0 noches ocupan medio día.
- **Modo ver:** tocar un día abre la ciudad de ese día.
- **Modo elegir llegada** (desde la ciudad): "Elegí el día de llegada", tocás un día, se marca en navy y al guardar cambia las noches de la ciudad anterior. No deja elegir un día antes de llegar a la ciudad anterior.

### 09 · Integrantes (sheet)

- "Integrantes", "4 viajeros · Otoño en Europa".
- Una fila por persona: avatar, nombre ("Ale (vos)"), qué parte del viaje hace ("Organizador · Todo el viaje", "Hasta Oslo", "Desde Alicante", "De X a Y") y su balance ("Le deben €X" verde, "Debe €X" rojo, "A mano").
- Botón "Invitar con un link".

### 10 · Agregar ciudad (sheet)

- "¿Qué ciudad agregás?", "Va después de Oslo y antes de Alicante".
- Buscador "Buscá una ciudad" y sugerencias en chips.
- Botón "Agregar ciudad": la crea con 2 noches y las mismas personas que la anterior, busca foto, país y ubicación, y abre la pantalla de la ciudad.

### 11 · Configuración (sheet)

- "En los tramos, mostrar" / "Lo que aparece en el chip entre ciudad y ciudad."
- Segmentado **"Hora de salida" / "Duración"**, con un ejemplo debajo ("13:40 → 15:49" o "2h 9m").

---

## Datos de ejemplo del prototipo

Viaje **Otoño en Europa**, 17 oct – 20 nov 2026, 34 noches. Integrantes: **Ale** ("Al", `#2F5D8A`), **Rodrigo** ("Ro", `#A4502B`), **Josué** ("Jo", `#3A6E4F`), **Agustín** ("Ag", `#634A83`).

| # | Ciudad | Noches | Quién está | Tramo a la siguiente (salida · duración · total) |
|---|---|---|---|---|
| 1 | Madrid (MAD) · escala | 0 | Ale, Rodrigo, Josué | Avión · 13:40 · 2h 9m · €480 |
| 2 | Bruselas (BRU) | 4 | Ale, Rodrigo, Josué | Tren · 10:15 · 1h 52m · €180 |
| 3 | Ámsterdam (AMS) | 3 | Ale, Rodrigo, Josué | Tren · 11:04 · 1h 20m · €88 |
| 4 | Eindhoven (EIN) | 1 | Ale, Rodrigo, Josué | Avión · 09:30 · 2h 35m · €380 |
| 5 | Vilna (VNO) | 3 | Ale, Rodrigo, Josué | Bus · 08:00 · 4h 10m · €100 |
| 6 | Riga (RIX) | 3 | Ale, Rodrigo, Josué | Avión · 14:20 · 1h 50m · €320 |
| 7 | Oslo (OSL) | 3 | Ale, Rodrigo | Avión · 07:45 · 4h 5m · €560 |
| 8 | Alicante (ALC) | 3 | Ale, Rodrigo, Agustín | sin cargar |
| 9 | Valencia (VLC) | 3 | Ale, Rodrigo, Agustín | Tren · 09:20 · 3h 55m · €220 |
| 10 | Sevilla (SVQ) | 3 | Ale, Rodrigo, Agustín | Auto · 10:00 · 2h 10m · €140 |
| 11 | Málaga (AGP) | 2 | Ale, Rodrigo, Agustín | Avión · 16:30 · 1h 25m · €300 |
| 12 | Lisboa (LIS) | 3 | Ale, Rodrigo, Agustín | Avión · 12:10 · 1h 20m · €240 |
| 13 | Madrid (MAD) | 3 | Ale, Rodrigo, Agustín | sin cargar (vuelta a Uruguay) |

Husos: Lisboa en hora de Lisboa, Vilna y Riga en hora de los Bálticos, el resto en hora de Europa central.

Alojamientos: Bruselas "Hotel cerca de Grand-Place" (Booking, €264, pagó Rodrigo, con comprobante `Reserva_Booking_Bruselas.pdf`); Ámsterdam "Departamento en De Pijp" (Airbnb, €420, pagó Ale).

Gastos: Vuelo Madrid → Bruselas €480 (Ale) · Hotel cerca de Grand-Place €264 (Rodrigo) · Tren Bruselas → Ámsterdam €180 (Josué) · Departamento en De Pijp €420 (Ale) · Cena en De Pijp €156 (Josué) · Museo Van Gogh €88 (Rodrigo). Todos entre Ale, Rodrigo y Josué.

Cada ciudad tiene una frase, por ejemplo Bruselas: "Waffles, papas fritas y cómics en las paredes".
