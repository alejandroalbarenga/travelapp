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

### 008 · Todos los miembros editan todo (reemplazada por la 034)
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
**Decisión:** cada parada guarda qué miembros están ahí (`stop_members`), en la sección "Quién está" de la pantalla de la ciudad. La primera parada arranca con todos; una parada nueva copia los de la parada anterior. Se puede sacar o sumar a cualquiera, pero tiene que quedar al menos una persona. Por defecto se dividen entre los que están: el alojamiento y los gastos de esa parada entre los de la parada, y un tramo entre los de la parada **de destino**. La pantalla de la ciudad muestra quién se suma o se va respecto a la anterior ("Se suma Agustín · Se fue Josué respecto a Oslo").
**Por qué:** no todos hacen el viaje completo; alguien puede sumarse o irse a mitad de camino. Los que hacen un tramo son los que llegan a la ciudad de destino.

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
**Decisión:** en la vista de calendario, cada ciudad es una barra que empieza a mitad del día de llegada y termina a mitad del día de salida, así que el día en que se viaja queda partido entre las dos. Una escala de 0 noches ocupa medio día. Tocar un día abre la ciudad de ese día. El mismo calendario sirve para elegir el día de llegada a una ciudad: al guardar, cambian las noches de la ciudad anterior (no deja elegir un día antes de llegar a esa ciudad anterior).
**Por qué:** ese día pertenece a las dos ciudades; mostrarlo en una sola confunde. Elegir la llegada en el calendario es más natural que contar noches cuando ya tenés las fechas.

### 021 · Qué muestra el chip del tramo
**Fecha:** 2026-10-07
**Decisión:** cada usuario elige qué muestra el chip del tramo entre paradas, en Configuración ("En los tramos, mostrar"). Hay dos opciones:
- **Hora de salida** (`time`, la opción por defecto): salida y llegada, ej. "13:40 → 15:49". Si falta la llegada, solo la salida.
- **Duración** (`duration`): ej. "2h 9m", ya descontando la diferencia de huso.

Si falta el dato elegido se muestra el otro, y si no hay ninguno, "Completar datos". El chip ya no muestra el precio. La preferencia se guarda en `profiles.chip_display` (`'time' | 'duration'`).
**Por qué:** salió en el diseño; es una preferencia personal, no del viaje.

### 022 · Zona horaria
**Fecha:** 2026-10-07
**Decisión:** la zona horaria de cada parada se completa sola a partir de la ciudad (al agregarla se busca su ubicación); los horarios de los tramos se cargan y se muestran en la hora local de salida y de llegada. La duración descuenta la diferencia de huso. Cuando las dos ciudades tienen distinto huso, el chip del tramo muestra un relojito naranja y el detalle del tramo explica la diferencia: "Bruselas está 1 h adelante de Madrid. Los horarios van en hora local de cada ciudad: llegás 15:49 en Bruselas, que son las 14:49 en Madrid." La fecha del tramo no se elige: es el día en que se sale de la ciudad de origen, calculado por las noches. Complementa la 009.
**Por qué:** que nadie tenga que saber ni elegir un identificador como `Europe/Riga`, y que el cambio de hora no sorprenda a nadie.

### 023 · Un pasaje por viajero
**Fecha:** 2026-10-07
**Decisión:** cada adjunto de un tramo puede indicar de quién es (`leg_attachments.member_id`). En el detalle del tramo, la sección "Pasajes" lista primero el tuyo ("Tu pasaje") y después los de los demás ("Pasaje de Rodrigo"), cada uno con el avatar de su dueño, y cuenta cuántos viajeros del tramo tienen pasaje ("3 de 3 viajeros"). El botón principal es "Ver mi pasaje" y en la lista del viaje el botón de ticket abre directamente el tuyo. Un adjunto sin dueño es del grupo. Amplía la 010.
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
**Decisión:** el acento coral (`#E04A3A`) y el fondo crema (`#F5F4F0`) se reemplazan por un navy como color principal y un naranja como acento secundario, sobre fondo blanco. Valores exactos del diseño final:

- **Primario:** `#00293D`. Botones y badges con degradé `#06384F → #00293D` (180°). Hover de links: `#001B29`.
- **Primario suave:** `rgba(0,41,61,.08)` a `rgba(0,41,61,.10)` para fondos seleccionados; `#EAF2F8` para chips de persona activa.
- **Acento naranja:** `#F5891F`, degradé `#FFA445 → #F5891F`. Se usa en el badge de integrantes, el marco de las notas, el anillo de noches incompletas y los avisos de huso.
- **Fondos:** pantallas `#FFFFFF`; superficie gris `#EEF3F8` (segmentados, botón cerrar, teclado numérico); `#F6F9FC` más clara; tarjetas con degradé `#FFFFFF → #F6F9FC` y borde `rgba(0,41,61,.07)`.
- **Texto:** `#1A1C1E` · secundario `#5F6368` · terciario `#8A929B` · apagado `#9AA0A6` y `#B4B9BF`.
- **Bordes:** campos y botones `#E2E8EF`; divisores `#EDF1F6` y `#E6ECF2`; línea punteada del recorrido `#C3CEDA` (móvil) y `#9FB2C4` (web); bordes punteados `#CFD8E2`; handle de sheets `#D3DBE4`.
- **Éxito:** `#1F9D55`; "Saldado" fondo `#E7F1EA` y texto `#24613A`; anillo de noches completo `#1FA971`.
- **Error y deuda:** `#A8382B`; fondo de "Borrar" al deslizar `#B23A2E`.
- **Aviso de huso:** ícono `#F5891F` sobre `#FFF1E0`; caja `#FFF4E8`, borde `#FFD9B0`, texto `#7A4A12`.
- **Medios de transporte** (color / fondo): avión `#1E6FD9` / `rgba(30,111,217,.13)`, tren `#E8770E` / `rgba(232,119,14,.14)`, bus `#1F9D55` / `rgba(31,157,85,.14)`, auto `#D93A3A` / `rgba(217,58,58,.12)`, otro `#7A4FD6` / `rgba(122,79,214,.13)`.
- **Avatares:** `#2F5D8A`, `#A4502B`, `#3A6E4F`, `#634A83` (sin cambios).
- **Visor de pasaje:** fondo `#0F1012`, tarjeta `#1C1D20`, círculo `#2A2C30`, texto secundario `#9AA0A6` y `#A8ADB3`, punto inactivo `#45484D`.
- **Toast:** `#1A1C1E`, "Deshacer" `#8EC5DE`.
- **Calendario:** barras `#DCE3EA` y `#C9D3DD` alternadas con texto `#33414D`; ciudad elegida `#00293D`.
- **Sombras:** tarjeta `0 1px 2px rgba(0,41,61,.06), 0 8px 22px rgba(0,41,61,.07), inset 0 1px 0 #fff`; vidrio `rgba(255,255,255,.62)` con `blur(24px) saturate(180%)`, borde `rgba(255,255,255,.75)` y sombra `0 10px 30px rgba(0,41,61,.18)`.

El detalle de uso está en `diseño.md`.
**Por qué:** ajuste de Ale mientras diseñaba.

### 027 · Versión web
**Fecha:** 2026-10-07
**Decisión:** además del iPhone, la app tiene que poder usarse desde el navegador de una computadora. Desde 1100 px de ancho cambia el layout: la lista va en un panel a la izquierda (58%) con un header fijo (segmentado Viaje / Gastos y botón "Agregar ciudad" o "Agregar gasto"), las ciudades se muestran en una grilla de 2 a 4 columnas recorrida en zigzag, el mapa queda fijo a la derecha (42%) y "Nuevo viaje" y "Configuración" se abren como modales centrados. Debajo de 1100 px se usa el diseño de móvil.
**Por qué:** para cargar cosas más cómodo (pasajes, reservas) desde la compu.

### 028 · Pantalla de inicio con varios viajes
**Fecha:** 2026-10-07
**Decisión:** la app abre en una pantalla de inicio con tu nombre, tus estadísticas (países visitados, viajes hechos y noches afuera, con las banderas), los próximos viajes con cuenta regresiva y los viajes pasados. Desde ahí se crea un viaje nuevo y se entra a cada viaje. Saca de "Para después del MVP" el punto de varios viajes por usuario.
**Por qué:** decisión de Ale al ver el diseño.

### 029 · Fecha de fin del viaje
**Fecha:** 2026-10-07
**Decisión:** el viaje guarda su fecha de fin (`trips.end_date`), que se pide al crearlo junto con la de inicio. Cambiar las noches ya no mueve el fin del viaje: la pantalla del viaje compara las noches cargadas con la duración del viaje en un anillo ("34/34 noches"), naranja si faltan, verde si coinciden y rojo si se pasan. La vuelta ("Vuelta a Uruguay · 20 nov") usa la fecha de fin. Si se cambia el día de llegada a la primera ciudad, se corren juntos el inicio y el fin. Las fechas de las paradas se siguen calculando como antes.
**Por qué:** decisión de Ale al ver el diseño; el viaje tiene fechas fijas (los pasajes de ida y vuelta) y lo que se va armando son las noches de cada ciudad.

### 030 · Mapa del recorrido
**Fecha:** 2026-10-07
**Decisión:** la pantalla del viaje tiene de fondo un mapa con el recorrido (línea punteada y pines numerados). El mapa es de OpenStreetMap con Leaflet. Al agregar una ciudad se busca su ubicación con Nominatim (el buscador de OpenStreetMap), que devuelve coordenadas y país; se guardan en `stops.lat`, `stops.lng`, `stops.country` y `stops.country_code` (para la bandera). La zona horaria de la 022 sale de esas coordenadas.
**Por qué:** decisión de Ale al ver el diseño. OpenStreetMap y Nominatim son gratis y no piden cuenta ni clave. Nominatim admite una consulta por segundo, que sobra porque solo se consulta al agregar o renombrar una ciudad.

### 031 · Dónde se reservó el alojamiento
**Fecha:** 2026-10-07
**Decisión:** el alojamiento guarda dónde se reservó (`stays.booked_via`: `booking`, `airbnb`, `direct`, `other`, o vacío). En la pantalla se muestra como "Reservado en: Booking / Airbnb / Directo / Otro" (Directo cambió por Hostelworld, ver 045). El precio y quién pagó aparecen recién cuando se eligió dónde se reservó, y la lista del viaje muestra "Booking · pagado" o "Airbnb · reservado". Amplía la 018.
**Por qué:** decisión de Ale al ver el diseño.

### 032 · Montos distintos también en tramos y alojamientos
**Fecha:** 2026-10-07
**Decisión:** se mantiene la 025 aunque el diseño final no lo muestre. El detalle del tramo y el alojamiento suman el mismo selector que "Nuevo gasto": entre quiénes se divide y "Partes iguales / Montos distintos". Por defecto, partes iguales entre los de la parada (ver 017).
**Por qué:** decisión de Ale; puede pasar que no todos paguen lo mismo por un pasaje o una habitación.

### 033 · Ciudad del gasto
**Fecha:** 2026-10-07
**Decisión:** "Nuevo gasto" suma un selector de ciudad (`expenses.stop_id`). Por defecto, la ciudad donde están hoy según las fechas del viaje; si el viaje no está en curso, la última ciudad usada. Al cambiar la ciudad, "Se divide entre" pasa a los que están en esa ciudad. Los gastos de tramos y alojamientos toman la ciudad solos (la de origen del tramo y la del alojamiento).
**Por qué:** decisión de Ale; la pantalla Gastos agrupa por ciudad y en el diseño no había forma de elegirla.

### 034 · Permisos por integrante: editar o solo ver
**Fecha:** 2026-10-08
**Decisión:** reemplaza a la 008. Cada integrante de un viaje tiene un rol (`trip_members.role`):
- **Organizador** (`admin`): el que creó el viaje. Hay uno solo por viaje. Edita todo y es el único que cambia los permisos de los demás, agrega o saca integrantes y borra el viaje.
- **Puede editar** (`editor`): edita todo lo del viaje (ciudades, noches, tramos, alojamientos, pasajes, gastos y saldos), salvo los permisos y los integrantes.
- **Solo ver** (`viewer`): ve todo el viaje, incluido el balance y los pasajes, pero no carga ni cambia nada. Si pagó algo, lo carga otro por él.

Quien entra con el link de invitación (reclamando un integrante o sumándose como nuevo) arranca como **Solo ver**; el organizador le da permiso de editar a quien quiera. Los integrantes sin cuenta que crea el organizador también arrancan como Solo ver. Los permisos se cambian en el sheet de Integrantes. La base lo controla con Row Level Security (no alcanza con esconder botones): un Solo ver no puede escribir aunque lo intente. En la interfaz, a un Solo ver no se le muestran los controles de edición (steppers, "+", botones de guardar) y los sheets se abren en modo lectura.
**Por qué:** decisión de Ale; puede haber alguien en el grupo que no quiera que toque cosas.

### 035 · Nombre de la app: Vamo y vamo
**Fecha:** 2026-10-08
**Decisión:** la app se llama **Vamo y vamo**. Es el nombre que aparece en el ícono de la pantalla de inicio, en la pestaña del navegador, en el login y en el remitente de los mails. El repo, el proyecto de Vercel y la URL siguen como `travelapp` por ahora.
**Por qué:** decisión de Ale.

### 036 · Monto con el teclado del teléfono
**Fecha:** 2026-10-08
**Decisión:** el monto de "Nuevo gasto" y de "Registrar transferencia" es un campo que abre el teclado numérico del teléfono (`inputMode="decimal"`, con coma), en lugar del teclado propio del diseño. Acepta coma o punto, hasta 6 dígitos enteros y 2 decimales.
**Por qué:** decisión de Ale; el teclado del celular es el que la gente ya conoce.

### 037 · Burbujas del balance y fecha de cada gasto
**Fecha:** 2026-10-08
**Decisión:** arriba de Gastos hay una tarjeta "Cómo está cada uno" con una burbuja por integrante: el tamaño es proporcional a lo que le deben (verde) o debe (naranja); el que está a mano queda chica y gris, y la tuya tiene borde blanco. Cada gasto de la lista muestra su fecha: la de salida para un pasaje, la de llegada para un alojamiento y, para el resto, el día en que se cargó.
**Por qué:** decisión de Ale (referencia: la app de gastos que usan hoy).

### 038 · Transferencias entre integrantes
**Fecha:** 2026-10-08
**Decisión:** en el balance, "Registrar una transferencia" carga un pago a mano ("le transferí €50 a Josué"): monto, quién pagó, a quién y una nota opcional (Bizum, efectivo). Se guarda como un `settlement` con `note` (migración 0006), igual que "Marcar como saldado": baja la deuda y se lista como "Pagado el 8 oct · Bizum", con "Deshacer". Solo los que pueden editar lo cargan.
**Por qué:** decisión de Ale; a veces se paga una parte o se transfiere antes de hacer las cuentas.

### 039 · Historial de movimientos
**Fecha:** 2026-10-08
**Decisión:** abajo del todo de Gastos, "Movimientos" lista todo lo que se cargó, editó o borró (gastos, tramos y alojamientos con precio, pagos y "Deshacer"), con quién lo hizo, cuándo y qué cambió ("cambió el monto de €142 a €156"). Se ven los últimos 5 y "Ver todos". Lo escribe la base (tabla `activity`, migración 0006) con triggers y `save_expense()`; nadie lo puede editar ni borrar. Los borrados se marcan en rojo.
**Por qué:** decisión de Ale; que no se pierda nada si alguien borra algo o hace cosas raras.

### 040 · Cómo se suben y se ven los pasajes
**Fecha:** 2026-10-08
**Decisión:**
- El archivo va directo del teléfono al bucket privado `attachments` (ruta `{trip_id}/legs/{leg_id}/{id}.pdf`), sin pasar por el servidor; después se anota la fila. Tope de 20 MB por archivo. Se abren con URLs firmadas de una hora (011).
- En el detalle del tramo, "Agregar el pasaje de" elige de quién es (vos por defecto, otro viajero o "Todo el grupo") y después PDF, Captura o Link. Solo se puede adjuntar a un tramo ya guardado.
- Un link no es un pasaje: va en el botón "Abrir en la web de la aerolínea" del visor y en la lista del tramo como "Link de la reserva".
- El visor dibuja el PDF con pdf.js (en el iPhone un PDF embebido a veces muestra solo la primera página), con "página 1 de 2" y los puntos. Compartir manda el archivo (Archivos, WhatsApp).
- El botón de ticket de la lista abre tu pasaje, o el del grupo si no tenés uno propio.
- El alojamiento tiene un comprobante (PDF o captura), con el mismo visor sin la tarjeta de Wallet.
**Por qué:** completa la Etapa 4.

### 041 · Inicio, nuevo viaje y borrar viaje
**Fecha:** 2026-10-08
**Decisión:**
- El inicio muestra "Hola, {nombre}", **Próximos viajes** (los en curso y los que vienen, del más cercano) como tarjetas con la foto de su primera ciudad, las fechas, la cuenta regresiva ("10 días", "Mañana", "Hoy · empieza", "Ya · en curso"), "12 destinos · 34 noches" y los avatares, y abajo **Viajes pasados**. Las estadísticas (países, noches afuera) quedan para después.
- "Nuevo viaje" pide nombre, desde y hasta (con los mensajes del diseño) y abre el viaje vacío, que invita a "Agregar la primera ciudad". El que lo crea queda como organizador, con el nombre y el color que ya usa en otros viajes.
- El organizador puede borrar el viaje entero desde Integrantes ("Borrar este viaje", con confirmación). Lo hace `delete_trip()` (migración 0007), que borra primero gastos y saldos; la app borra antes los archivos del bucket.
- Quien se suma con la invitación como integrante nuevo queda en todas las ciudades del viaje (antes no quedaba en ninguna); si no hace todo el viaje, se ajusta en "Quién está".
**Por qué:** Ale quiere armar viajes de prueba desde cero, además del real.

### 042 · Deslizar una ciudad: borrar o bloquear
**Fecha:** 2026-10-08
**Decisión:**
- Deslizar la tarjeta de una ciudad a la izquierda muestra **Borrar**: desaparece al toque, con un aviso "Borraste Roma · Deshacer", y se borra de verdad a los 5 segundos.
- Deslizar a la derecha muestra **Bloquear** (o **Desbloquear**). Una ciudad bloqueada es una ciudad cerrada: ya está todo reservado y pago. No se cambian sus noches, quién está, notas, alojamiento ni comprobante, y no se puede borrar. La tarjeta muestra un candado y "Bloqueada", y su ficha se abre en modo lectura con el aviso y el botón "Desbloquear".
- Tampoco se pueden correr sus fechas: no se cambian las noches de las ciudades anteriores, ni se agrega o borra una ciudad con noches antes de ella.
- Los tramos siguen editables (decisión de Ale) y los gastos sueltos se cargan igual.
- Bloquean y desbloquean los que pueden editar. La base lo hace cumplir con triggers (migración 0008).
- Una ciudad de la que ya se fueron (su fecha de salida pasó) no deja cambiar sus noches. El resto se puede tocar, salvo que esté bloqueada.
**Por qué:** pedido de Ale, para marcar lo que ya está listo y que nadie lo cambie sin querer.

### 043 · Ajustes de los editores
**Fecha:** 2026-10-08
**Decisión:**
- El botón que confirma un editor es siempre el azul primario, aunque no haya cambios (ej. "Listo" en la ciudad).
- "Agregar ciudad" se abre con alto fijo: el título y el buscador quedan arriba y los resultados no lo hacen crecer.
- En una ciudad de paso (0 noches) sin alojamiento, la tarjeta de alojamiento va plegada ("De paso, sin noche acá · Agregar").
**Por qué:** pedidos de Ale al probar en el celular.

### 044 · El organizador suma integrantes sin invitarlos
**Fecha:** 2026-10-08
**Decisión:** en Integrantes, el organizador tiene "Agregar integrante": con el nombre alcanza. Queda en el viaje como "todavía no entró", arranca como Solo ver, en todas las ciudades no bloqueadas, y se le pueden cargar gastos. Cuando esa persona entra con el link de invitación, elige su nombre de la lista y lo reclama (`claim_member()`, que ya existía). No hay dos integrantes con el mismo nombre.
**Por qué:** pedido de Ale: armar el viaje con todos antes de que cada uno entre.

### 045 · Hostelworld en lugar de Directo
**Fecha:** 2026-10-08
**Decisión:** las opciones de "Reservado en" son Booking, Airbnb, Hostelworld y Otro. En la base se suma `hostelworld` a `booking_source` (migración 0008); `direct` queda para lo que ya estaba cargado y solo se muestra si estaba elegido.
**Por qué:** decisión de Ale; Hostelworld es más común que reservar directo en este viaje.

### 046 · Cómo quedó el calendario
**Fecha:** 2026-10-08
**Decisión:** implementa la 020.
- Se abre con el botón de calendario del viaje. Cada ciudad es una barra, en dos grises alternados. El día de viaje se reparte en partes iguales entre las ciudades que lo tocan: la que se deja, las escalas y la que se llega. El primer y el último día arrancan y terminan con medio día "de casa". Tocar una barra abre esa ciudad.
- Desde la ficha de cualquier ciudad, tocar las fechas abre el calendario con esa ciudad en azul. Si se puede cambiar su llegada (las fechas aparecen subrayadas), abre para elegirla. La ciudad se marca en navy, no deja elegir un día antes de llegar a la anterior y, al guardar, cambian las noches de la anterior. Respeta los bloqueos (042).
- La llegada a la primera ciudad no se elige por ahora: es el inicio del viaje, y cambiarla correría el viaje entero con sus horarios.
**Por qué:** completa la Etapa 3.

### 047 · Service worker y sin conexión
**Fecha:** 2026-10-08
**Decisión:** `public/sw.js`, escrito a mano, sin librerías. Solo se registra en producción.
- **Archivos de la app:** se guardan para siempre.
- **Páginas:** primero la red; si tarda más de 4 segundos o no hay señal, la última versión guardada. Así el viaje abre en el avión.
- **Pasajes y comprobantes ya abiertos:** quedan guardados sin el token de la URL firmada, así se ven sin conexión.
- **Mapa y fotos:** se muestran guardados y se actualizan por atrás.
- **El resto** (base, login, acciones) va siempre a la red.
- Con `experimental.useOffline`, las navegaciones y acciones que fallan por falta de señal esperan y se reintentan solas. Arriba aparece "Sin conexión · lo que cargues se manda al volver".
- Al salir de la cuenta se borran las páginas y los pasajes guardados en el teléfono.
- `proxy.ts` deja pasar `/sw.js` sin sesión: un service worker no se puede registrar detrás de una redirección.
**Por qué:** en aeropuertos y trenes la señal es mala. No es un modo offline real (sigue en "Para después").

### 048 · Cómo quedó la versión web
**Fecha:** 2026-10-08
**Decisión:** desde 1100 px de ancho (`useIsWeb`), el viaje usa `web-trip.tsx`, copiado del diseño ("01 Viaje (web)" en `Viajes en grupo.dc.html`).
- **Panel izquierdo (58 %).** Header de 128 px: volver, nombre, "rango · N destinos", "34/34 noches planeadas", segmentado Viaje / Gastos, avatares, calendario, compartir y el botón principal ("Agregar ciudad" o "Agregar gasto").
- **Las ciudades** van en una grilla de 2 a 4 columnas (de 230 px como mínimo, con 56 px entre columnas y 72 entre filas) que se recorre en zigzag.
  - Arriba de cada foto corre la línea punteada con el número de la ciudad y el chip del tramo que sale.
  - Entre tarjetas la línea cruza el hueco, y al final de la fila baja por el costado a la siguiente.
  - La tarjeta es la foto 4:3 sin recuadro, con las noches arriba a la derecha y el alojamiento abajo a la izquierda. Abajo van el nombre, las fechas, el país y el stepper.
- **Los sheets** (ciudad, tramo, gastos, calendario, integrantes…) suben dentro del panel izquierdo, debajo del header, y el mapa queda a la vista. Al abrir una ciudad, el mapa se acerca a ella.
- **Solo "Nuevo viaje"** (fuera del viaje) es una ventana centrada.
- **Mapa a la derecha (42 %)**, con 16 px de margen y radio 24. Pasar el mouse por una ciudad pone su pin naranja.
- **Bloquear y borrar** (042) aparecen al pasar el mouse por la foto, porque en la compu no se desliza. Esto no está en el diseño.
- **El móvil no cambia.**
**Por qué:** Ale la pidió para cargar cosas más cómodo desde la compu (decisión 022).

### 049 · Ajustes de diseño en el celular
**Fecha:** 2026-10-08
**Decisión:** cambia el diseño original en tres cosas.
- **Sin la barra Viaje / Gastos de abajo.** Gastos se abre con una bolita flotante arriba a la derecha (billetera), la primera de la columna, y su flecha de volver lleva al viaje.
- **El + redondo pasa a ser un chip "Agregar"** abajo al medio. Al tocarlo pregunta qué agregar: en el viaje, ciudad, tramo o gasto; en Gastos, gasto o transferencia.
- **Las tarjetas son blancas lisas**, sin el degradé a `#F6F9FC`.
- En la web, Viaje y Gastos también van separados: el header tiene un botón "Gastos" (billetera) y, en Gastos, la flecha vuelve al viaje.
**Por qué:** decisión de Ale al probarla.

### 050 · Más limpio: blanco, negro y rosado, sin degradés
**Fecha:** 2026-10-08
**Decisión:** reemplaza la paleta de la 026.
- **Nada de degradés** en la app: botones, tarjetas y el inicio quedan lisos. La única excepción es la foto de la ficha de la ciudad, que se funde en el blanco.
- **Fondos y tarjetas blancos.** Las sombras son grises suaves, sin tinte.
- **Color principal: negro `#222222`.** Textos, números de las ciudades, el chip "Agregar", el mapa y las tarjetas oscuras. En el código sigue llamándose `navy` (`--color-navy`) para no tocar cada componente.
- **Rosado `#FF385C`** (`bg-pink`) en pocos lugares: los botones que confirman (Guardar, Crear viaje, Agregar ciudad, Entrar…) y el número de integrantes.
- **Grises neutros** en vez de los azulados: superficie `#F2F2F2`, bordes `#DDDDDD` y líneas `#EBEBEB`.
- **El inicio, como Airbnb:** la foto del viaje limpia y el texto abajo, sin caja.
- **Las notas** van en un campo blanco con borde, sin el halo naranja.
- **Menos cajas:** la lista de ciudades, los gastos, el balance, los movimientos, los integrantes y el transporte de la ciudad van sin recuadro ni sombra, con líneas finas entre filas. Quedan en caja solo los bloques: el alojamiento, las burbujas del balance y los adjuntos.
- El naranja queda solo para avisos (huso horario, noches que faltan) y para el día de hoy en el calendario.
**Por qué:** decisión de Ale, para que la app se vea más profesional y limpia (referencia: Airbnb).

### 051 · La ficha de la ciudad como un itinerario
**Fecha:** 2026-10-08
**Decisión:** reemplaza el armado de la pantalla 06 (referencia: el detalle de un viaje en Airbnb).
- **Arriba:** la ciudad y su país. Debajo, la planificación: las fechas (abren el calendario) y las noches.
- **El alojamiento es una tarjeta:** un ícono según dónde se reservó (hotel para Booking, casa para Airbnb, cama para Hostelworld), nombre, "Booking · €264 · pagó Rodrigo" y las fechas. Abajo van las bolitas de quién está y "Editar" (o "Ver reserva" si hay comprobante).
- **El formulario del alojamiento** se abre desde la tarjeta: nombre, horas de check-in y checkout, dónde se reservó, comprobante, precio, quién pagó y la división. Quién está se edita tocando las bolitas.
- **Una línea de tiempo por día:**
  - el día que llegás: el transporte que te trae y "Check-in · Después de las 14:00";
  - después, "N noches en la ciudad";
  - el día que te vas: "Checkout · Antes de las 11:00" y el transporte a la ciudad siguiente.
  - Tocar un transporte abre el tramo.
  - En una ciudad de paso hay un solo día, con los dos transportes.
- **Dos modos.** Vista (ciudad bloqueada o solo ver) es una lectura limpia: sin controles, con las notas como texto. Edición es todo lo de arriba, más las notas y "Borrar la ciudad".
- **Datos:** `stays.check_in_time` y `stays.check_out_time` (migración 0009), que se guardan junto con la ciudad.
**Por qué:** decisión de Ale; la ficha tiene que leerse como un itinerario, no como un formulario.

### 052 · Sin el número de cada ciudad en la lista
**Fecha:** 2026-10-08
**Decisión:** en el celular, la tarjeta de la ciudad ya no lleva el círculo con su número (el orden lo da la lista). En la web, los números sobre la línea se quedan, igual que los pines del mapa.
**Por qué:** decisión de Ale, para que la lista quede más limpia.
- En la web, una ciudad bloqueada (o para quien solo ve) muestra "4 noches" al costado en vez del más y el menos.

### 054 · Tu parte del viaje
**Fecha:** 2026-10-08
**Decisión:** quien se suma más tarde o se va antes ve el viaje entero, pero con su parte en primer plano. Su parte va de la primera a la última ciudad donde está (`stop_members`).
- **Lista del viaje (celular):**
  - Lo de antes de que llegue queda plegado arriba ("Antes de que llegues · Madrid → Oslo · 7 ciudades") y lo de después, abajo ("Después de que te vas").
  - Los dos se abren con "Ver".
  - El tramo que lo trae a su primera ciudad se ve igual, y el encabezado dice "Empezás en Alicante" con su fecha.
- **Inicio:** la tarjeta muestra sus fechas, su cuenta regresiva ("hasta que llegás vos"), "Te sumás en Alicante" o "Hasta Riga", y la foto de su primera ciudad.
- **Permisos:** no cambian. Dependen del rol (034), no de dónde se suma.
- **Mapa:** su recorrido va fuerte (desde la ciudad de la que viene) y el resto tenue, con los pines de las otras ciudades atenuados. Arranca encuadrado en su parte.
- **Gastos:** los de las ciudades donde no estuvo van plegados al final ("Gastos del resto del viaje"). El total y el balance no cambian.
- **Web:** el mismo pliegue antes y después de la grilla.
**Por qué:** decisión de Ale; alguien que se suma en Alicante no necesita ver primero tres semanas de viaje que no hizo.

### 055 · El tramo en modo vista
**Fecha:** 2026-10-08
**Decisión:** como la ciudad (051), un tramo ya cargado se abre en modo vista, una lectura como de pasaje:
- el medio, el día y la duración;
- la salida y la llegada con hora y ciudad (con "+1" si se llega al día siguiente) y el aviso de huso;
- quiénes viajan, el precio, quién pagó y tu parte;
- los pasajes, y abajo "Ver mi pasaje".
"Editar" (arriba, para los que pueden editar) pasa al formulario de siempre. Un tramo nuevo se abre directo en edición, y quien solo ve, siempre en vista.
**Por qué:** decisión de Ale; una vez cargado, al tramo se entra para saber a qué hora salís y llegás, no para cambiarlo.

### 056 · Buscar por país al agregar una ciudad
**Fecha:** 2026-10-09
**Decisión:** si en "Agregar ciudad" se escribe un país ("Italia"), además de lo que encuentra Nominatim se listan sus ciudades principales (hasta diez, con la capital). Salen de `src/lib/country-cities.json`, una lista de 202 países sacada una vez de Wikidata y retocada a mano (sin áreas metropolitanas ni provincias; Países Bajos y Suiza aparte, porque ahí las ciudades figuran como municipios). Al principio se consultaba Wikidata en cada búsqueda, pero a veces tardaba más de 10 segundos y desde Vercel no andaba.
También: con el teclado abierto en el iPhone, los sheets se acomodan a la parte de la pantalla que se ve (`visualViewport`, comparada con el alto del layout, porque en el iPhone `innerHeight` también se achica). Y el buscador de ciudades ya no enfoca el campo solo en el teléfono: hacerlo mientras el sheet sube hacía que el iPhone corriera la página y el sheet se fuera de la pantalla. En la compu se enfoca cuando terminó de entrar.
**Por qué:** pedido de Ale; si no te acordás el nombre de la ciudad, buscar por país te la muestra.

### 057 · El alojamiento se completa desde la reserva
**Fecha:** 2026-10-09
**Decisión:**
- Una ciudad sin alojamiento (que se puede editar y tiene noches) se abre con el formulario del alojamiento ya abierto.
- Arriba del formulario va "Subí la reserva". Si es un PDF, se lee en el teléfono con pdf.js (sin mandarlo a ningún servicio) y se completa lo que esté vacío: el nombre (la línea con la letra más grande que no sea la marca ni un título), dónde se reservó (Booking, Airbnb o Hostelworld) y los horarios de check-in (el primero que aparece) y checkout (el último). Las reglas están en `src/lib/booking-pdf.ts`.
- Si el alojamiento todavía no está guardado, la reserva se sube al guardar (`saveStop` devuelve el id del alojamiento).
- Una captura no se lee: se adjunta y listo.
**Por qué:** pedido de Ale; la reserva ya tiene todo, no hace falta tipearlo. Son reglas simples y gratis: si con reservas reales fallan seguido, se puede pasar a leerlas con un modelo de IA (cuesta y necesita una clave).

### 058 · La frase de cada ciudad sale sola
**Fecha:** 2026-10-09
**Decisión:** si una ciudad no tiene frase guardada (`stops.tagline`), se muestra la descripción corta de su artículo de Wikipedia en español, con mayúscula al principio: "Capital de Italia", "Ciudad de Italia, situada en la región de Toscana". Se busca al mostrar el viaje, como la foto (`withCityPhotos`), y queda en caché semanas. Nadie la escribe a mano. Si el nombre es ambiguo o Wikipedia no tiene descripción, no hay frase.
**Por qué:** pedido de Ale; las ciudades nuevas quedaban sin frase. Se eligió Wikipedia porque es gratis y sin clave, aunque es más informativa que las frases del diseño; una frase con más onda necesitaría un modelo de IA.

### 059 · Sin zoom al escribir en el iPhone
**Fecha:** 2026-10-09
**Decisión:** todos los campos donde se escribe tienen letra de 16 px o más: con menos, Safari hace zoom al tocarlos. Los campos de fecha y hora pierden el estilo propio de iOS y el ancho mínimo, así no se salen de la grilla (por ejemplo "Desde" y "Hasta" en "Nuevo viaje"). Un campo nuevo tiene que respetar los 16 px.
**Por qué:** pedido de Ale; al crear un viaje la pantalla se agrandaba al escribir y los campos se salían.

### 060 · El teclado pasa por arriba de los sheets
**Fecha:** 2026-10-09
**Decisión:** con el teclado abierto en el iPhone, el sheet no cambia de tamaño: el teclado le pasa por arriba y tapa la parte de abajo. Si Safari corre la página para mostrar el campo, el sheet se corre lo mismo (`visualViewport.offsetTop`) y queda en su lugar, sin que se vea lo de atrás. Reemplaza lo de la 056, que achicaba el sheet a la parte visible.
**Por qué:** pedido de Ale; achicado quedaba chico y se veía lo que había atrás.

### 061 · Pantalla de carga
**Fecha:** 2026-10-09
**Decisión:** mientras carga una pantalla (inicio, viaje, invitación) se ve el logo flotando con la "o" que rebota, la línea punteada del recorrido con un avión rosado que la cruza y una frase que cambia cada dos segundos ("Armando la valija…", "Buscando los pasajes…", "Haciendo las cuentas…", "Ya casi salimos…"). Está hecha con CSS para que se vea antes de que cargue el JavaScript, y se queda quieta si el teléfono tiene "reducir movimiento". El diseño original no tenía pantalla de carga.
**Por qué:** pedido de Ale; antes decía solo "Cargando…".

### 062 · El logo dice "Vamo"
**Fecha:** 2026-10-09
**Decisión:** el logo pasa de "Vo" a "Vamo", escrito a mano como el anterior: Caveat Bold en blanco sobre el mismo navy (`#032F45`), con margen para que el iPhone y Android redondeen las esquinas sin cortar las letras. Las letras están convertidas en trazos en `public/logo.svg` (los íconos se dibujan desde ese archivo en `src/lib/app-icon.tsx`), con la "o" aparte para que rebote en la pantalla de carga.
**Por qué:** pedido de Ale.

### 063 · Los nombres de las ciudades en el mapa
**Fecha:** 2026-10-09
**Decisión:** al lado del número de cada pin va el nombre de la ciudad, en una pastilla blanca. Cada vez que el mapa se mueve o cambia el zoom se calcula cuáles entran sin pisar otro pin u otro nombre (a la derecha, o a la izquierda si no entra): primero la ciudad resaltada, después las de tu parte del viaje y después en el orden del recorrido. De lejos se ven algunos; al acercar, todos.
**Por qué:** pedido de Ale; con solo los números había que adivinar qué ciudad era cada punto.

### 064 · La tarjeta del alojamiento se convierte en el formulario
**Fecha:** 2026-10-09
**Decisión:** el alojamiento es una sola tarjeta con dos modos, como la ciudad (051):
- **Vista:** el ícono según dónde se reservó, el nombre, dónde se reservó con el precio y quién pagó, las fechas, la hora de entrada y de salida, y quiénes están, con "Ver reserva" y "Editar". Tocar las bolitas también pasa a editar.
- **Edición:** la misma tarjeta pasa a ser el formulario, con un solo botón "Subir la reserva · PDF o imagen", el nombre, check-in y checkout, "Reservado en", "Cuánto salió" (siempre a la vista; sin "Reservado en" cuenta como "Otro"), quién pagó, la división y "Quiénes están", que antes no se encontraba. "Listo" vuelve a la vista.
Del PDF de la reserva ahora también sale el precio total, si está en euros. Una imagen se adjunta pero no se lee.
**Por qué:** pedido de Ale; la tarjeta y el formulario separados confundían y no se veía dónde cambiar quiénes están.

### 065 · El campo donde escribís queda arriba del teclado
**Fecha:** 2026-10-09
**Decisión:** el sheet sigue sin achicarse con el teclado (060), pero al tocar un campo la lista del sheet se scrollea sola hasta que el campo quede arriba del teclado. Para que los últimos campos también puedan subir, mientras el teclado está abierto las listas del sheet suman abajo un espacio del alto del teclado.
**Por qué:** pedido de Ale; el teclado tapaba el campo que se estaba editando.

### 066 · El ícono pasa a rosado
**Fecha:** 2026-10-09
**Decisión:** el fondo del logo y del ícono de la app pasa del navy `#032F45` al rosado `#FF385C` de la paleta de la 050, con "Vamo" en blanco. Cambia en `public/logo.svg` (de ahí salen todos los íconos) y en la pantalla de carga. En el iPhone, para ver el ícono nuevo hay que borrar la app de la pantalla de inicio y volver a agregarla.
**Por qué:** pedido de Ale; el navy ya no está en la paleta de la app.

### 067 · La captura de la reserva también se lee
**Fecha:** 2026-10-09
**Decisión:** si la reserva que se sube es una imagen (captura o foto), se lee en el teléfono con OCR (Tesseract, `src/lib/read-booking-image.ts`) y se completa lo que esté vacío con las mismas reglas que el PDF (057): el nombre (el renglón más alto), dónde se reservó, los horarios y el precio. La imagen no sale del teléfono; la primera vez se bajan Tesseract y el español y el inglés (unos megas, de la CDN jsDelivr) y tarda unos segundos. Con el PDF sigue saliendo mejor. Reemplaza lo de la 057 y la 064 de que una imagen se adjunta sin leerse.
**Por qué:** pedido de Ale; muchas reservas están como captura del mail o de la app. Gratis, en vez de leerlas con un modelo de IA.

### 068 · Pantallas completas en vez de sheets
**Fecha:** 2026-10-09
**Decisión:**
- En el celular ya no hay sheets: la ciudad, el tramo, el gasto, la transferencia, el calendario, los integrantes, agregar ciudad y nuevo viaje son pantallas completas que entran desde la derecha, sin fondo oscuro ni handle. Arriba a la izquierda tienen la flecha de volver (en la web sigue la cruz). Se vuelve con la flecha, deslizando desde el borde izquierdo hacia la derecha, con el "atrás" del teléfono o del navegador (cada pantalla abierta es una entrada del historial, con la misma URL) o con Escape. La foto de la ciudad llega hasta arriba, debajo de la barra de estado. El único panel que se arrastra es el del viaje sobre el mapa. En la web no cambia nada.
- "Agregar ciudad" desde el chip "Agregar" propone ponerla después de la última ciudad (antes era antes de la última).
- El logo de la pantalla de carga va sin sombra.
**Por qué:** pedido de Ale; los sheets ya ocupaban casi toda la pantalla y con el teclado se rompían.

### 069 · El tramo se completa desde el pasaje
**Fecha:** 2026-10-09
**Decisión:** arriba del formulario del tramo va "Subir el pasaje · PDF o imagen" (mientras el tramo no tenga pasajes). Se lee en el teléfono, igual que la reserva del alojamiento (057, 067), y se completa lo que esté vacío: el medio de transporte (por las palabras del pasaje: vuelo, embarque, Ryanair, Renfe, tren, FlixBus, autobús…), la hora de salida y de llegada (sin contar la hora de embarque; también si vienen en tabla) y el precio en euros. Las reglas están en `src/lib/ticket-pdf.ts`. Si el tramo todavía no está guardado, el pasaje se sube al guardar (`save_leg` devuelve el id del tramo) y queda como pasaje tuyo. Los pasajes que se agregan abajo también completan lo vacío.
**Por qué:** pedido de Ale; el pasaje ya tiene todo, no hace falta tipearlo.

### 070 · Las fechas de "Nuevo viaje" con el mismo aspecto que los otros campos
**Fecha:** 2026-10-09
**Decisión:** "Desde" y "Hasta" muestran la fecha escrita ("sáb 17 oct", con el año si no es el actual) con un ícono de calendario, y "Elegir" si están vacías. Encima va el campo de fecha nativo transparente, que abre el selector del teléfono (en la compu, el calendario).
**Por qué:** pedido de Ale; en el iPhone el campo de fecha nativo quedaba desalineado.

### 071 · Tus estadísticas en el inicio
**Fecha:** 2026-10-09
**Decisión:** arriba de "Próximos viajes" va una tarjeta con tus **países visitados**, **viajes hechos** y **noches afuera**, y abajo las banderas superpuestas (hasta seis) con la lista de países. Cuenta solo lo que ya pasó: los países de las ciudades de tu parte del viaje donde dormiste al menos una noche (las escalas no cuentan), los viajes terminados y las noches desde que empezó tu parte hasta hoy. Mientras no empezó ningún viaje, la tarjeta no aparece. La regla está en `travelStats()` (`src/lib/home.ts`).
**Por qué:** estaba en el diseño y había quedado para después (041).

### 072 · La ficha de la ciudad sin foto
**Fecha:** 2026-10-10
**Decisión:** la pantalla de la ciudad ya no abre con la foto grande: arriba van volver y cambiar la ciudad, y abajo el país con su bandera, el nombre y la frase sobre blanco. La foto sigue en la lista de ciudades del viaje.
**Por qué:** pedido de Ale, para ver cómo queda más limpia.

### 073 · La foto de cada viaje en el inicio
**Fecha:** 2026-10-10
**Decisión:** la tarjeta de cada viaje usa la foto de la ciudad donde estás hoy (si el viaje está en curso) o, si no, la de la ciudad de tu parte del viaje donde pasás más noches. Antes era siempre la primera ciudad. Un viaje sin ciudades sigue sin foto. La regla está en `coverStopIndex()` (`src/lib/home.ts`).
**Por qué:** pedido de Ale; todas las tarjetas mostraban la ciudad de salida.

### 074 · El gasto se completa desde la foto del ticket
**Fecha:** 2026-10-10
**Decisión:** en "Nuevo gasto" (y en el gasto personal) va "Escanear el ticket": la foto (o PDF) se lee en el teléfono con OCR, como la reserva (067), y completa lo vacío: el monto (el más alto de los renglones con "total", sin subtotal ni IVA; si no hay, el más alto del ticket), el concepto (el nombre del comercio, el renglón más grande de arriba) y una categoría probable (restaurante o súper → Comida, museo o entrada → Actividades, taxi o metro → Transporte). Las reglas están en `src/lib/receipt.ts`. La foto no se guarda.
**Por qué:** pedido de Ale.

### 075 · Gastos más fáciles de leer
**Fecha:** 2026-10-10
**Decisión:** la pantalla de Gastos se reordena: arriba **lo tuyo** (cuánto te tocó gastar, cuánto pusiste y "Te deben €X" / "Debés €X" en verde o rojo); después **Para quedar a mano**, contado desde vos ("Josué te debe €193,33", "Le debés €50 a Ale"; las tuyas primero) con un botón chico "Saldado"; **Cómo está cada uno** en una grilla de tarjetas con palabras en vez de las burbujas (037); los **gastos** por ciudad con una sola línea de concepto y abajo la fecha y quién pagó ("Pagaste vos"); y al final **Ya saldado** y los movimientos. El total del grupo pasa a ser el subtítulo de "Gastos".
**Por qué:** pedido de Ale; costaba leerla. Las burbujas con signos (−€177) no dejaban claro quién le debía a quién.

### 076 · Gastos personales con presupuesto
**Fecha:** 2026-10-10
**Decisión:** en Gastos hay dos pestañas, **Del grupo** y **Míos**. En "Míos" cada uno carga sus gastos personales del viaje (monto o foto del ticket, concepto, categoría y día) y les pone un presupuesto por categoría, que se va descontando ("Te quedan €80 de €200", en rojo si te pasaste). Arranca con Ropa, Comida, Regalos, Salidas y Otros, y se pueden crear más. Solo los ve quien los carga (ni el organizador) y no entran en el balance del grupo. Tablas `personal_categories` y `personal_expenses` (migración 0010), con RLS por usuario y miembro del viaje.
**Por qué:** pedido de Ale, para llevar lo que gasta cada uno aparte de las cuentas del grupo.

### 077 · En la web también son pantallas nuevas
**Fecha:** 2026-10-10
**Decisión:** en la web (desde 1100 px), agregar ciudad, la ciudad, el tramo, los gastos, el calendario, los integrantes, etc. dejan de subir como panel desde abajo: son una pantalla nueva que entra desde la derecha y ocupa todo el panel izquierdo (con su header), con el mapa a la vista. "Nuevo viaje", afuera del viaje, ocupa toda la ventana con el contenido centrado. Tienen la flecha de volver (ya no la cruz), funcionan con el "atrás" del navegador y con Escape, igual que en el celular (068). En el header del viaje, las bolitas de los integrantes ya no se pisan y dicen cuántos son.
**Por qué:** pedido de Ale; en la web los paneles se veían rotos.

### 078 · La app se llama Vamo
**Fecha:** 2026-10-10
**Decisión:** el nombre pasa de "Vamo y vamo" a **Vamo**, como dice el logo (062): en el ícono de la pantalla de inicio, la pestaña del navegador, el login y el mail del código. Reemplaza el nombre de la 035. El repo y el proyecto de Vercel siguen siendo `travelapp`.
**Por qué:** pedido de Ale.

### 079 · El header del viaje en la web crece con su contenido
**Fecha:** 2026-10-10
**Decisión:** el header del panel izquierdo ya no tiene alto fijo (128 px): crece con lo que tiene y la lista o los gastos empiezan abajo. Con otra fuente o con el zoom del navegador, los botones quedan siempre adentro de la línea.
**Por qué:** pedido de Ale; los botones se salían por abajo del header.

### 080 · Guardar abajo en todas las pantallas
**Fecha:** 2026-10-10
**Decisión:** en "Nuevo gasto", el gasto personal y "Registrar transferencia", el botón de guardar ("Guardar gasto", "Guardar transferencia") pasa de arriba a la derecha a la barra de abajo, grande y rosado, como en la ciudad y el tramo. Arriba queda la flecha de volver y el título.
**Por qué:** pedido de Ale, para que todas las pantallas sean iguales.
