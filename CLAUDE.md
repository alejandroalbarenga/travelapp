# CLAUDE.md

Contexto para Claude Code en este repo. Leelo antes de hacer cualquier cosa.

## Regla número uno

**No escribir código de la app hasta que Ale lo pida explícitamente.** Eso incluye: instalar dependencias, generar el proyecto de Next.js o cualquier scaffolding, escribir componentes, migraciones o esquemas de base de datos, y crear cuentas o recursos en la nube. Mientras tanto, solo documentación en `docs/`.

Además, siempre: mostrar el diff y esperar el OK de Ale antes de hacer commit y push.

## Ramas

El nombre de la rama describe lo que se está haciendo, con un prefijo por tipo: `setup/...`, `feature/...`, `fix/...`, `docs/...` (ej. `setup/docs`, `feature/pantalla-viaje`). Nada de nombres genéricos o autogenerados.

## Idioma

- Hablale a Ale en español rioplatense (vos).
- Interfaz de la app (UI: textos, botones, mensajes de error, fechas y montos con formato es-AR): en español rioplatense.
- Documentación y mensajes de commit: en español.
- Código, nombres de tablas y columnas, variables y archivos de código: en inglés y sin acentos.

## El producto

**Vamo y vamo** (decisión 035): web app mobile para organizar y seguir un viaje en grupo, instalable en la pantalla de inicio del iPhone (PWA). Referencia: la simplicidad de Polarsteps. El repo y el proyecto de Vercel se siguen llamando `travelapp`.

- Ciudades en orden con sus noches; las fechas se calculan solas.
- Tramos de transporte entre ciudades con su costo y el pasaje adjunto (PDF, captura o link).
- Gastos compartidos y balance de quién le debe a quién.
- Varios miembros usan el mismo viaje desde sus propios teléfonos.

Proyecto personal de Ale. **MVP usable el 16 de octubre de 2026** (el viaje arranca el 17).

## Documentación

| Archivo | Qué tiene |
|---|---|
| `docs/handoff.md` | Producto, stack propuesto, modelo de datos borrador, alcance (documento original) |
| `docs/diseño.md` | Pantallas, sistema visual y datos de ejemplo (diseño final de Claude Design) |
| `docs/decisiones.md` | Decisiones tomadas. **Si contradice a handoff o diseño, manda decisiones.** |
| `docs/plan.md` | Etapas hasta el MVP y lo que queda para después |
| `docs/setup.md` | Cuentas, servicios y variables de entorno |

`docs/diseño.md` describe el diseño final que Ale armó en Claude Design (proyecto "Viajes en grupo", archivo `Viajes en grupo.dc.html`).

## Stack

- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS** (tokens del sistema visual definidos en el tema).
- **PWA**: `manifest.webmanifest` con `display: standalone`, `apple-touch-icon`, safe areas con `env(safe-area-inset-*)`, service worker mínimo para cachear la app (no hay modo offline real en el MVP).
- **Supabase** (free tier): Postgres, Auth con **código de 6 dígitos por email** (no magic link), Storage privado para los pasajes, Row Level Security.
- **Vercel** (free tier) para el deploy, conectado a GitHub.
- **npm** como gestor de paquetes.
- Fuentes: Plus Jakarta Sans, y Caveat solo para la frase de cada ciudad.
- Logo e ícono: `public/logo.svg` (de Ale). Los íconos de cada tamaño se dibujan desde ese archivo en `src/lib/app-icon.tsx`.
- **Mapa**: OpenStreetMap con Leaflet; ubicación de las ciudades con Nominatim (decisión 030).

## Comandos

- `npm run dev`: servidor local en http://localhost:3000.
- `npm test`: pruebas de la lógica (`src/lib/*.test.ts`, con Vitest).
- `npm run lint` y `npm run build` antes de commitear.
- Next.js 16 cambió APIs respecto de versiones anteriores: ante la duda, leer `node_modules/next/dist/docs/` (ver `AGENTS.md`).

## Convenciones de datos

- **Montos en centavos enteros** (`*_cents`), nunca floats.
- **Una sola moneda por viaje en el MVP** (EUR). Sin conversión: si se paga en otra moneda, se carga en euros convertido a mano.
- **Fechas de paradas no se guardan**: se calculan desde `trips.start_date` + noches acumuladas. Una parada con 0 noches es una escala y muestra una sola fecha.
- **Horarios de tramos** como `timestamptz`; cada parada tiene su zona horaria (IANA) para mostrar la hora local.
- **Miembros sin cuenta**: `trip_members.user_id` puede ser null; al entrar con el link de invitación, el usuario reclama su miembro.
- **División de gastos**: por defecto en partes iguales entre los elegidos, con opción de montos distintos por persona. Se guarda el monto de cada uno en `expense_splits.amount_cents` (la suma da el total).
- **Permisos** (decisión 034): cada integrante es organizador (`admin`, uno por viaje), puede editar (`editor`) o solo ver (`viewer`). Todos ven todo su viaje; solo admin y editor escriben, y solo el admin cambia permisos e integrantes. Quien entra con invitación arranca como solo ver. Nadie ve viajes de los que no es miembro.
- **Pasajes y comprobantes de alojamiento** en un bucket privado, servidos con URLs firmadas.

## Modelo de datos acordado

Reemplaza al borrador de `docs/handoff.md` (ver `docs/decisiones.md`).

- `profiles`: user_id (= `auth.users.id`), chip_display (qué muestra el chip del tramo, ver decisión 021)
- `trips`: id, name, start_date, end_date, currency, invite_code, created_by, created_at
- `trip_members`: id, trip_id, user_id (nullable), display_name, initials, color, role (admin/editor/viewer)
- `stops`: id, trip_id, position, city, country, country_code, code, tagline (frase), notes, nights (≥ 0), timezone, lat, lng, photo_url
- `stop_members`: stop_id, member_id (quién está en cada parada)
- `stays`: id, stop_id, name, address, booked_via (booking/airbnb/direct/other, nullable), total_price_cents, paid_by_member_id, expense_id, notes
- `stay_attachments`: id, stay_id, kind (pdf/image/link), storage_path, url, file_name, size_bytes, uploaded_by_member_id, created_at
- `legs`: id, trip_id, from_stop_id, to_stop_id, mode (car/train/plane/bus/other), departs_at, arrives_at, total_price_cents, paid_by_member_id, expense_id
- `leg_attachments`: id, leg_id, member_id (de quién es el pasaje, nullable), kind (pdf/image/link), storage_path, url, file_name, size_bytes, uploaded_by_member_id, created_at
- `expenses`: id, trip_id, stop_id (opcional), leg_id (opcional), stay_id (opcional), description, category, amount_cents, paid_by_member_id, created_by, created_at
- `expense_splits`: expense_id, member_id, amount_cents
- `settlements`: id, trip_id, from_member_id, to_member_id, amount_cents, settled_at, note
- `activity`: id, trip_id, actor_member_id, actor_name, action, description, from_name, to_name, amount_cents, previous_amount_cents, changes, created_at (historial, solo lectura)

### Base de datos en la práctica

- Migraciones en `supabase/migrations/` (SQL), datos de ejemplo en `supabase/seed.sql`. Se aplican pegándolas en el SQL Editor de Supabase.
- Los viajes se crean con `create_trip()` (deja al creador como organizador) y se borran con `delete_trip()` (migración 0007; un delete directo falla si hay gastos). La invitación usa `get_invite()`, `claim_member()` y `join_trip_as_new()`.
- Los gastos se guardan **siempre** con `save_expense()`: escribe el gasto y su división en una transacción. Un trigger diferido rechaza cualquier división que no sume el total.
- Los tramos se guardan con `save_leg()` (crea, actualiza o borra su gasto) y las noches se cambian con `set_stop_nights()`, que corre los horarios de los tramos siguientes en hora local.
- La pantalla de ciudad guarda con `save_stop()`: quién está, notas y alojamiento con su gasto, todo junto.
- Los sheets usan `src/components/bottom-sheet.tsx` (entra desde abajo, se cierra con el fondo, Escape o arrastrando el handle).
- El panel del navegador de Claude a veces no genera cuadros de animación sin una interacción: los sheets no entran y el contenido en streaming queda en "Cargando…" (llegó, pero React lo muestra en el próximo cuadro). Sacar una captura o redimensionar la ventana lo destraba. En un teléfono no pasa.
- La fecha de un tramo no se elige: es el día de salida de la parada de origen. Si llegada ≤ salida, se toma como llegada al día siguiente.
- Permisos (migración 0004): `can_edit_trip()` y `is_trip_admin()` en las políticas; un solo `admin` por viaje (índice único) que no se puede degradar ni borrar. En la interfaz, `canEdit` oculta los controles y los sheets reciben `readOnly`. En `/demo`, `?como=jo` muestra la app como alguien de solo ver y `?vacio` un viaje recién creado.
- Ciudades bloqueadas (decisión 042, migración 0008): `stops.locked`; triggers rechazan cambiar la ciudad, su gente, alojamiento y comprobante, y correr sus fechas. Las reglas para avisar antes están en `src/lib/stop-lock.ts`.
- Agregar ciudad: `add_stop()` (migración 0005) inserta después de otra, copia quién está y borra el tramo que salía de la anterior. La búsqueda es con Nominatim desde el servidor (`src/lib/places.ts`) y la zona horaria sale de las coordenadas con `@photostructure/tz-lookup`.
- Archivos en el bucket privado `attachments`, con ruta `{trip_id}/...`; la política de Storage mira el primer segmento. Se suben desde el navegador (`src/lib/supabase/attachments.ts`) y se abren con URL firmada en `TicketViewer`, que dibuja los PDF con pdf.js (decisión 040).
- Categorías de gasto (propuesta, ver pregunta abierta en `docs/plan.md`): `transport`, `lodging`, `food`, `activities`, `other`.

Un tramo o un alojamiento con precio crea o actualiza su gasto asociado. Por defecto se divide entre los que están en la parada (`stop_members`): la del alojamiento, o la de destino del tramo. Se puede pasar a montos distintos (decisión 032).

## Lógica clave

- **Balance**: neto por miembro = lo que pagó − lo que le toca ± settlements. Las deudas se simplifican de forma greedy (el que más debe le paga al que más le deben). "Marcar como saldado" y "Registrar una transferencia" crean un settlement (la transferencia con su nota); "Deshacer" lo borra.
- **Historial** (migración 0006): la tabla `activity` la escriben solo los triggers de `expenses` y `settlements` (alta y baja) y `save_expense()` (ediciones, con qué cambió). Nadie la edita ni la borra. En `/demo` se anota en el cliente.
- **Fechas**: cambiar las noches recalcula todas las fechas posteriores, pero no el fin del viaje (`trips.end_date` es fijo). Las noches cargadas se comparan con la duración del viaje (decisión 029).
- **Wallet**: la web no puede leer la Wallet del iPhone. Solo se muestra el recordatorio y el link de la aerolínea.
