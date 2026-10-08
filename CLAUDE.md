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

Web app mobile para organizar y seguir un viaje en grupo, instalable en la pantalla de inicio del iPhone (PWA). Referencia: la simplicidad de Polarsteps.

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
- **Mapa**: OpenStreetMap con Leaflet; ubicación de las ciudades con Nominatim (decisión 030).

## Convenciones de datos

- **Montos en centavos enteros** (`*_cents`), nunca floats.
- **Una sola moneda por viaje en el MVP** (EUR). Sin conversión: si se paga en otra moneda, se carga en euros convertido a mano.
- **Fechas de paradas no se guardan**: se calculan desde `trips.start_date` + noches acumuladas. Una parada con 0 noches es una escala y muestra una sola fecha.
- **Horarios de tramos** como `timestamptz`; cada parada tiene su zona horaria (IANA) para mostrar la hora local.
- **Miembros sin cuenta**: `trip_members.user_id` puede ser null; al entrar con el link de invitación, el usuario reclama su miembro.
- **División de gastos**: por defecto en partes iguales entre los elegidos, con opción de montos distintos por persona. Se guarda el monto de cada uno en `expense_splits.amount_cents` (la suma da el total).
- **Permisos**: todos los miembros de un viaje pueden ver y editar todo lo de ese viaje. Nadie ve viajes de los que no es miembro.
- **Pasajes y comprobantes de alojamiento** en un bucket privado, servidos con URLs firmadas.

## Modelo de datos acordado

Reemplaza al borrador de `docs/handoff.md` (ver `docs/decisiones.md`).

- `profiles`: user_id (= `auth.users.id`), chip_display (qué muestra el chip del tramo, ver decisión 021)
- `trips`: id, name, start_date, end_date, currency, invite_code, created_by, created_at
- `trip_members`: id, trip_id, user_id (nullable), display_name, initials, color
- `stops`: id, trip_id, position, city, country, country_code, code, tagline (frase), notes, nights (≥ 0), timezone, lat, lng, photo_url
- `stop_members`: stop_id, member_id (quién está en cada parada)
- `stays`: id, stop_id, name, address, booked_via (booking/airbnb/direct/other, nullable), total_price_cents, paid_by_member_id, expense_id, notes
- `stay_attachments`: id, stay_id, kind (pdf/image/link), storage_path, url, file_name, size_bytes, uploaded_by_member_id, created_at
- `legs`: id, trip_id, from_stop_id, to_stop_id, mode (car/train/plane/bus/other), departs_at, arrives_at, total_price_cents, paid_by_member_id, expense_id
- `leg_attachments`: id, leg_id, member_id (de quién es el pasaje, nullable), kind (pdf/image/link), storage_path, url, file_name, size_bytes, uploaded_by_member_id, created_at
- `expenses`: id, trip_id, stop_id (opcional), leg_id (opcional), stay_id (opcional), description, category, amount_cents, paid_by_member_id, created_by, created_at
- `expense_splits`: expense_id, member_id, amount_cents
- `settlements`: id, trip_id, from_member_id, to_member_id, amount_cents, settled_at

Un tramo o un alojamiento con precio crea o actualiza su gasto asociado. Por defecto se divide entre los que están en la parada (`stop_members`): la del alojamiento, o la de destino del tramo. Se puede pasar a montos distintos (decisión 032).

## Lógica clave

- **Balance**: neto por miembro = lo que pagó − lo que le toca ± settlements. Las deudas se simplifican de forma greedy (el que más debe le paga al que más le deben). "Marcar como saldado" crea un settlement; "Deshacer" lo borra.
- **Fechas**: cambiar las noches recalcula todas las fechas posteriores, pero no el fin del viaje (`trips.end_date` es fijo). Las noches cargadas se comparan con la duración del viaje (decisión 029).
- **Wallet**: la web no puede leer la Wallet del iPhone. Solo se muestra el recordatorio y el link de la aerolínea.
