# Plan hasta el MVP

**Objetivo:** MVP usable en el iPhone el **viernes 16 de octubre de 2026**. El viaje arranca el 17.
**Hoy:** miércoles 7 de octubre. Quedan 9 días.

Criterio para cada etapa: termina deployada en Vercel y probada en el iPhone, no solo en la compu. Así cualquier problema propio del iPhone (instalación, safe areas, teclado, login) aparece temprano.

El diseño final de Claude Design ya está en `docs/diseño.md`. Sumó alcance (pantalla de inicio, mapa, pantalla de ciudad, calendario, versión web): si no da el tiempo, lo primero que se recorta es la versión web y el calendario.

---

## Etapa 0 · Documentación (mié 7 oct)
- [x] Handoff y diseño final en `docs/`.
- [x] Stack y decisiones acordadas (`docs/decisiones.md`).
- [x] `CLAUDE.md`, `README.md`, `docs/plan.md`, `docs/setup.md`.

## Etapa 1 · Cuentas y esqueleto (jue 8 oct)
- [ ] Ale crea las cuentas y servicios de `docs/setup.md`.
- [x] Proyecto Next.js + TypeScript + Tailwind con los tokens del diseño y la fuente.
- [x] Manifest PWA, ícono, safe areas, control flotante Viaje / Gastos vacío.
- [ ] Deploy en Vercel conectado al repo.
- **Listo cuando:** la app vacía se instala desde Safari en la pantalla de inicio y abre sin barra del navegador.

## Etapa 2 · Datos, login y viaje compartido (vie 9 – sáb 10 oct)
- [x] Esquema de base de datos como migraciones, con Row Level Security.
- [x] Datos semilla del viaje (paradas, tramos y gastos de ejemplo).
- [x] Lógica de fechas, división de gastos, balance y horarios, con pruebas.
- [ ] Login con código de 6 dígitos por email.
- [ ] Link de invitación al viaje; al entrar, elegir qué miembro sos (reclamar).
- [ ] Sheet de integrantes: qué parte del viaje hace cada uno, su balance e "Invitar con un link". *(Hecho todo menos el balance, que llega con Gastos.)*
- [x] Permisos (decisión 034): organizador, puede editar o solo ver; RLS en la base y modo lectura en la interfaz.
- **Listo cuando:** Ale y otra persona entran desde dos teléfonos y ven el mismo viaje.

## Etapa 3 · Inicio, Viaje y ciudades (dom 11 oct)
- [ ] Pantalla de inicio: estadísticas, próximos viajes, viajes pasados y "Nuevo viaje" con fecha de inicio y de fin.
- [x] Mapa del recorrido de fondo, con la lista encima como sheet.
- [x] Lista de paradas con foto (de Wikipedia), fechas calculadas, stepper de noches y anillo de noches planeadas.
- [x] Chips de tramo entre paradas (hora o duración según la preferencia) y "Agregar tramo" para los vacíos.
- [ ] Botón "+" con menú: Agregar ciudad / Agregar tramo / Agregar gasto.
- [x] Agregar ciudad (con ubicación, país y huso automáticos), cambiarla y borrarla. *(Borrar es desde la ciudad, con confirmación; sin deslizar.)*
- [x] Pantalla de ciudad: quién está, notas, alojamiento (dónde se reservó, precio, comprobante) y transporte. *(Falta subir el comprobante: Etapa 4.)*
- [ ] Calendario con días partidos y elección del día de llegada.
- **Listo cuando:** se puede armar el viaje real desde el teléfono y las fechas cuadran.

## Etapa 4 · Tramos y pasajes (lun 12 – mar 13 oct)
- [ ] Bottom sheet de detalle del tramo: medio, horas en hora local (con aviso de cambio de huso), precio, quién pagó, entre quiénes (partes iguales o montos distintos).
- [ ] El precio del tramo crea o actualiza su gasto.
- [ ] Subir PDF o captura, o guardar link; un pasaje por viajero, el tuyo primero.
- [ ] Pantalla Ver pasaje (PDF e imagen a pantalla completa) con el recordatorio de Wallet y el link.
- **Listo cuando:** se abre un pasaje real en menos de 3 toques desde la pantalla Viaje.

## Etapa 5 · Gastos y balance (mié 14 – jue 15 oct)
- [ ] Pantalla Gastos: total, por persona, lista agrupada por ciudad.
- [ ] Nuevo gasto con teclado numérico propio, ciudad, quién pagó y entre quiénes.
- [ ] Montos distintos por persona además de partes iguales.
- [ ] Editar y borrar gastos.
- [ ] Balance simplificado, "Marcar como saldado" y "Deshacer".
- **Listo cuando:** los números del ejemplo de `diseño.md` dan igual (total €1.588; Josué le debe €193,33 y Rodrigo €177,33 a Ale).

## Etapa 6 · Pulido y prueba real (jue 15 – vie 16 oct)
- [ ] Service worker para que la app cargue rápido con mala conexión.
- [ ] Prueba en los teléfonos de los viajeros: instalar, entrar, cargar un gasto cada uno.
- [ ] Borrar los datos de ejemplo y cargar el viaje real: viajeros, tramos y pasajes.
- [ ] Versión web (layout de dos paneles desde 1100 px), si da el tiempo.
- **16 de octubre:** congelar. El 17 no se deploya nada salvo un arreglo urgente.

---

## Para después del MVP
- Importar reservas automáticamente (mails de aerolíneas y trenes) vinculadas al costo.
- Fotos del viaje por ciudad.
- Varias monedas con conversión (ej. NOK → EUR).
- Modo offline real (ver y cargar sin conexión, sincronizar después).
- Generar pases para Wallet (`.pkpass`).

## Preguntas abiertas
- **Categorías de gasto:** el diseño muestra íconos por categoría pero no las lista. Propuesta: Transporte, Alojamiento, Comida, Actividades, Otros.
