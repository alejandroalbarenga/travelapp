# Registro de decisiones

Cada decisión con qué se decidió, por qué y cuándo. Si algo de acá contradice a `handoff.md` o `diseño.md`, manda lo de acá. Para cambiar una decisión, agregá una entrada nueva que la reemplace (no borres la vieja).

---

### 001 · Stack base: Next.js + TypeScript + Supabase + Vercel
**Fecha:** 2026-10-07
**Decisión:** Next.js (App Router) con TypeScript, Supabase (Postgres, Auth, Storage) y deploy en Vercel, todo en free tier.
**Por qué:** web app instalable sin cuenta de Apple Developer, datos compartidos en la nube, hosting gratis y una combinación muy conocida y bien documentada.

### 002 · Tailwind CSS para los estilos
**Fecha:** 2026-10-07
**Decisión:** usar Tailwind CSS, con los colores, radios y tipografía de `diseño.md` definidos como tokens del tema.
**Por qué:** Ale no tenía preferencia. El diseño tiene un sistema visual chico y preciso que encaja bien en tokens de Tailwind, se itera rápido sobre el diseño que todavía va a cambiar, y es lo que mejor y más rápido escribe Claude Code. La alternativa (CSS Modules) es más verbosa y no aporta nada para este proyecto.

### 003 · Login con código de 6 dígitos por email, no magic link
**Fecha:** 2026-10-07
**Decisión:** Supabase Auth con OTP por email: el usuario pone su mail, recibe un código y lo escribe en la app.
**Por qué:** en el iPhone, el link del mail se abre en Safari y no en la app instalada en la pantalla de inicio (tienen sesiones separadas), así que con magic link quedarías logueado en el lugar equivocado. Con el código todo pasa dentro de la app.

### 004 · Montos en centavos enteros
**Fecha:** 2026-10-07
**Decisión:** todos los montos se guardan como enteros en centavos (`amount_cents`, `total_price_cents`).
**Por qué:** evita errores de redondeo de los decimales en los balances.

### 005 · Una sola moneda, sin conversión
**Fecha:** 2026-10-07
**Decisión:** en el MVP cada viaje tiene una moneda (EUR) y todos los gastos se cargan en esa moneda. Si se pagó en NOK u otra, se convierte por fuera y se carga en euros. El selector EUR/NOK/USD del diseño no va en el MVP.
**Por qué:** decisión de Ale; mantiene el balance simple. Las columnas de moneda quedan en `trips` para poder agregar conversión después.

### 006 · Miembros sin cuenta que después se reclaman
**Fecha:** 2026-10-07
**Decisión:** se pueden crear miembros solo con nombre (`trip_members.user_id` en null). Al entrar con el link de invitación, la persona elige cuál de esos miembros es y queda vinculada.
**Por qué:** decisión de Ale; permite armar el viaje y cargar gastos de todos antes de que los demás se registren.

### 007 · División de gastos con montos por persona
**Fecha:** 2026-10-07
**Decisión:** por defecto se divide en partes iguales entre los elegidos; se puede pasar a montos distintos por persona (ej. 100 / 100 / 50). En `expense_splits` se guarda el monto de cada uno, no una proporción, y la suma tiene que dar el total. En partes iguales, los centavos que sobran se reparten de a uno.
**Por qué:** Ale lo necesita para casos donde no todos consumen lo mismo. Guardar montos (y no porcentajes) hace exacto el cálculo del balance.

### 008 · Todos los miembros editan todo
**Fecha:** 2026-10-07
**Decisión:** cualquier miembro de un viaje puede crear, editar y borrar paradas, tramos, gastos y settlements de ese viaje. Row Level Security solo controla que no veas viajes de los que no sos miembro.
**Por qué:** decisión de Ale; es un grupo de amigos y simplifica los permisos.

### 009 · Zona horaria por parada
**Fecha:** 2026-10-07
**Decisión:** cada parada guarda su zona horaria (ej. `Europe/Riga`). Los horarios de los tramos se guardan como `timestamptz` y se muestran en la hora local de la ciudad de salida y de llegada.
**Por qué:** el viaje cruza tres husos (Lisboa, Europa central, Bálticos). Un tren que sale 10:00 en Riga tiene que verse 10:00.

### 010 · Varios adjuntos por tramo
**Fecha:** 2026-10-07
**Decisión:** los adjuntos van en una tabla aparte (`leg_attachments`), no como columnas del tramo.
**Por qué:** el diseño permite "agregar otro" pasaje (PDF, captura o link); por ejemplo, un pasaje por persona.

### 011 · Pasajes en bucket privado
**Fecha:** 2026-10-07
**Decisión:** los archivos de pasajes van a un bucket privado de Supabase Storage y se abren con URLs firmadas que vencen.
**Por qué:** son documentos personales con nombre y código de reserva.

### 012 · Nombres en inglés en el código, español en la interfaz
**Fecha:** 2026-10-07
**Decisión:** tablas, columnas, variables y archivos de código en inglés sin acentos. Interfaz, documentación y commits en español.
**Por qué:** el borrador tenía nombres con acentos (`pagó_member_id`), que traen problemas en SQL y en el código. Mezclar idiomas dentro del código también confunde.

### 013 · Cache de la app, sin offline real
**Fecha:** 2026-10-07
**Decisión:** en el MVP, un service worker mínimo que guarda la app en caché para que cargue rápido con mala conexión. Los datos sí necesitan conexión.
**Por qué:** alcanza para el objetivo del MVP ("que cargue rápido"); el modo offline real implica sincronización y conflictos, y queda para después.

### 014 · npm como gestor de paquetes
**Fecha:** 2026-10-07
**Decisión:** npm.
**Por qué:** viene con Node, no hay que instalar nada más, y Vercel lo soporta directo.

### 015 · SMTP propio para los mails de login
**Fecha:** 2026-10-07
**Decisión:** configurar un SMTP propio en Supabase (Gmail con contraseña de aplicación, o Resend si hay dominio propio).
**Por qué:** el mail que trae Supabase por defecto solo manda a los miembros del equipo del proyecto y tiene un límite de pocos mails por hora, así que tus amigos no recibirían el código.

### 016 · Fotos de las ciudades desde Wikipedia
**Fecha:** 2026-10-07
**Decisión:** al agregar una ciudad, la app busca automáticamente la foto principal de su artículo en Wikipedia y guarda esa URL en `stops.photo_url`. Si no encuentra, se muestra una imagen por defecto. Más adelante se podrá cambiar la foto a mano.
**Por qué:** Wikipedia es gratis, no pide cuenta ni clave, y tiene foto para todas las ciudades del viaje. Unsplash da fotos más lindas pero pide registrarse y una clave; se puede sumar después.

### 017 · Quién está en cada ciudad
**Fecha:** 2026-10-07
**Decisión:** cada parada guarda qué miembros están ahí (`stop_members`). Al crear una parada se marcan todos; se puede sacar a alguien. Los gastos de esa parada (y su alojamiento) se dividen por defecto entre los que están.
**Por qué:** no todos hacen el viaje completo; alguien puede sumarse o irse a mitad de camino.

### 018 · Alojamiento por parada
**Fecha:** 2026-10-07
**Decisión:** cada parada puede tener uno o más alojamientos (`stays`) con nombre, dirección, precio, quién pagó y comprobantes adjuntos (`stay_attachments`, en el mismo bucket privado que los pasajes). Si tiene precio, crea o actualiza su gasto asociado, igual que un tramo.
**Por qué:** salió en el diseño; el alojamiento es uno de los gastos más grandes y la reserva hay que tenerla a mano.

### 019 · Notas, país y frase en cada parada
**Fecha:** 2026-10-07
**Decisión:** las paradas suman `country`, `tagline` (una frase corta que se muestra en la tarjeta) y `notes` (texto libre).
**Por qué:** salió en el diseño; da contexto a cada ciudad y un lugar para anotar cosas sueltas.

### 020 · Calendario con días partidos
**Fecha:** 2026-10-07
**Decisión:** en la vista de calendario, el día en que se viaja de una ciudad a otra se muestra partido entre las dos.
**Por qué:** ese día pertenece a las dos ciudades; mostrarlo en una sola confunde.

### 021 · Qué muestra el chip del tramo
**Fecha:** 2026-10-07
**Decisión:** cada usuario elige qué muestra el chip del tramo entre paradas, y la preferencia se guarda en `profiles.chip_display`.
**Por qué:** salió en el diseño; es una preferencia personal, no del viaje.

### 022 · Zona horaria
**Fecha:** 2026-10-07
**Decisión:** la zona horaria de cada parada se completa sola a partir de la ciudad; los horarios de los tramos se muestran en la hora local de salida y de llegada. Complementa la 009.
**Por qué:** que nadie tenga que saber ni elegir un identificador como `Europe/Riga`.

### 023 · Un pasaje por viajero
**Fecha:** 2026-10-07
**Decisión:** cada adjunto de un tramo puede indicar de quién es (`leg_attachments.member_id`). Al abrir "Ver pasaje" se muestra primero el tuyo. Un adjunto sin dueño es del grupo. Amplía la 010.
**Por qué:** cada persona tiene su propio pasaje con su nombre y código.

### 024 · Sin selector de moneda
**Fecha:** 2026-10-07
**Decisión:** el diseño saca el selector "EUR ▾" de los montos. Todo se muestra y se carga en la moneda del viaje. Confirma la 005.
**Por qué:** con una sola moneda por viaje, el selector no hacía nada y confundía.

### 025 · Montos distintos por persona
**Fecha:** 2026-10-07
**Decisión:** el diseño suma la opción de dividir con montos distintos por persona, tanto en gastos como en tramos y alojamientos. Se guarda igual que en la 007.
**Por qué:** la 007 ya lo contemplaba en los datos; faltaba en la interfaz.

### 026 · Colores nuevos
**Fecha:** 2026-10-07
**Decisión:** el sistema visual cambia de colores; los valores nuevos salen de los diseños finales de Claude Design y reemplazan a los de `diseño.md`.
**Por qué:** ajuste de Ale mientras diseñaba.

### 027 · Versión web
**Fecha:** 2026-10-07
**Decisión:** además del iPhone, la app tiene que poder usarse desde el navegador de una computadora.
**Por qué:** para cargar cosas más cómodo (pasajes, reservas) desde la compu.
