# Handoff a Claude Code — App de viajes en grupo

> Cómo usarlo: descargá este archivo y el brief de diseño (`brief-claude-design-viajes-en-grupo.md`), abrí Claude Code en la carpeta donde guardás tus proyectos y pegá la sección **"Prompt inicial"**, completando el link del repo y dónde quedaron los dos archivos.

---

## Prompt inicial (pegar en Claude Code)

Vamos a construir una web app mobile para viajes en grupo, instalable en la pantalla de inicio del iPhone (PWA). **En esta etapa NO quiero código de la app**: el diseño todavía va a cambiar. Solo quiero dejar el repo preparado.

Repo: [LINK DEL REPO]
Documentos de contexto: [RUTA A handoff-claude-code-viajes-en-grupo.md] y [RUTA A brief-claude-design-viajes-en-grupo.md]

Hacé esto, en orden:

1. Cloná el repo acá y creá una rama `setup/docs`.
2. Copiá los documentos al repo como `docs/handoff.md` (producto, stack, modelo de datos, alcance) y `docs/diseño.md` (pantallas, estilo visual, datos de ejemplo). Leelos completos.
3. Haceme las preguntas que necesites y confirmá conmigo el stack propuesto, o sugerí cambios explicando por qué. No decidas solo.
4. Con lo que acordemos, creá:
   - `CLAUDE.md`: contexto del producto, stack, convenciones, idioma (español), y la regla "no escribir código de la app hasta que Ale lo pida explícitamente".
   - `README.md` corto: qué es el proyecto y dónde está la documentación.
   - `docs/plan.md`: plan por etapas hasta un MVP usable el **16 de octubre** (viajo el 17), con lo que queda para después.
   - `docs/setup.md`: checklist de cuentas, servicios y variables de entorno que voy a necesitar (Supabase, Vercel, etc.), con los pasos para crearlos. No los crees vos.
   - `docs/decisiones.md`: registro de decisiones (qué se decidió, por qué, fecha).
5. Mostrame el diff y esperá mi OK antes de hacer commit y push.

Qué NO hacer en esta etapa: no instalar dependencias, no generar el proyecto de Next.js ni ningún scaffolding, no crear cuentas ni recursos en la nube, no escribir componentes ni esquemas de base de datos en código. Los diseños finales los estoy armando en Claude Design; te los paso cuando estén. Hablame en español.

---

## Producto

- **Qué es:** una app para organizar y seguir un viaje en grupo. Ciudades en orden con noches, tramos de transporte entre ciudades con su pasaje adjunto, y gastos compartidos con balance de quién le debe a quién.
- **Referencia:** la simplicidad de Polarsteps. Wanderlog se descartó por demasiado complejo.
- **Diferenciales:** división de gastos por persona, tramos de transporte con su costo, y acceso rápido al pasaje (PDF, captura o link) con recordatorio de Wallet.
- **Usuarios:** primero yo en mi viaje; después amigos, que lo usan desde sus propios teléfonos sobre el mismo viaje.
- **Tipo de proyecto:** personal, por fuera del trabajo.
- **Plataforma:** web app anclada a la pantalla de inicio. Nada de app nativa por ahora (no hay cuenta de Apple Developer).
- **Datos:** en una base compartida en la nube, con hosting gratuito. Nada guardado solo en el teléfono.

## Stack propuesto (a confirmar)

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS.
- **PWA:** `manifest.webmanifest` con `display: standalone`, `apple-touch-icon` y `apple-mobile-web-app-capable`; safe areas con `env(safe-area-inset-*)`.
- **Backend:** Supabase (free tier):
  - Postgres para los datos.
  - Auth con magic link por email.
  - Storage para los pasajes (PDF e imágenes).
  - Row Level Security: cada miembro solo ve los viajes de los que es parte.
- **Deploy:** Vercel (free tier), conectado al repo de GitHub.
- **Fuente:** Plus Jakarta Sans (Google Fonts).

## Modelo de datos (borrador)

- `trips`: id, nombre, fecha_inicio, moneda_base, creado_por
- `trip_members`: trip_id, user_id, nombre_visible, iniciales, color
- `stops`: id, trip_id, orden, ciudad, código (ej. MAD), noches (≥ 0), foto_url
  - Las fechas **no se guardan**: se calculan desde `fecha_inicio` + noches acumuladas.
  - Una ciudad puede repetirse (Madrid al inicio con 0 noches y al final con 3).
  - Una parada con 0 noches es una escala y muestra la fecha sola en vez de un rango.
- `legs`: id, trip_id, from_stop_id, to_stop_id, medio (auto/tren/avión/bus/otro), sale_at, llega_at, precio_total, moneda, pagó_member_id, adjunto_url, adjunto_tipo (pdf/imagen/link), link_url
- `expenses`: id, trip_id, stop_id (opcional), leg_id (opcional), concepto, categoría, monto, moneda, pagó_member_id, creado_at
  - Un tramo con precio genera o actualiza su gasto asociado.
- `expense_splits`: expense_id, member_id, parte
  - Por defecto todos los miembros, en partes iguales.
- `settlements`: id, trip_id, de_member_id, a_member_id, monto, saldado_at

## Lógica clave

- **Balance:** para cada miembro, neto = lo que pagó − lo que le toca. Las deudas se simplifican de forma greedy (el que más debe le paga al que más le deben) para generar frases del tipo "Ana le debe €45 a Ale". "Marcar como saldado" crea un `settlement` y el balance se recalcula.
- **Fechas:** al cambiar las noches con el stepper se recalculan todas las fechas posteriores y la fecha de fin del viaje.
- **Wallet:** desde la web no se puede leer la Wallet del iPhone. Solo se muestra el recordatorio "Abrí tu Wallet si lo guardaste ahí" y el link de la aerolínea. Generar `.pkpass` queda para más adelante.

## Alcance

**MVP (antes del 17 oct):**
1. Login y viaje compartido con miembros.
2. Pantalla Viaje: lista de paradas con stepper de noches, chips de tramo y botón "+".
3. Detalle del tramo (bottom sheet) con adjunto del pasaje y pantalla para ver el pasaje.
4. Gastos: total, lista y balance con "Marcar como saldado".
5. Nuevo gasto con teclado numérico, quién pagó y entre quiénes se divide.
6. Instalable en el iPhone y usable con conexión mala (al menos que cargue rápido).

**Después:**
- Importar reservas automáticamente (mails de aerolíneas y trenes) vinculadas al costo.
- Fotos del viaje por ciudad.
- Conversión entre monedas (ej. NOK → EUR).
- Modo offline real.
- Generar pases para Wallet.

## Datos semilla: mi viaje

Viajeros de ejemplo: Ale, Ana, Juli, Fede (después se reemplazan por los reales). Llegada desde Uruguay el 17 oct y vuelta el 20 nov: 34 noches.

| # | Ciudad | Noches | Fechas |
|---|---|---|---|
| 1 | Madrid | 0 | 17 oct (llegada desde Uruguay, escala) |
| 2 | Bruselas | 4 | 17 – 21 oct |
| 3 | Ámsterdam | 3 | 21 – 24 oct |
| 4 | Eindhoven | 1 | 24 – 25 oct |
| 5 | Vilna | 3 | 25 – 28 oct |
| 6 | Riga | 3 | 28 – 31 oct |
| 7 | Oslo | 3 | 31 oct – 3 nov |
| 8 | Alicante | 3 | 3 – 6 nov |
| 9 | Valencia | 3 | 6 – 9 nov |
| 10 | Sevilla | 3 | 9 – 12 nov |
| 11 | Málaga | 2 | 12 – 14 nov |
| 12 | Lisboa | 3 | 14 – 17 nov |
| 13 | Madrid | 3 | 17 – 20 nov (vuelta a Uruguay) |

Los tramos, precios y gastos de ejemplo están en `docs/diseño.md`. Son inventados: hay que reemplazarlos por los reales.
