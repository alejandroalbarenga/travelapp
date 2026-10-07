# Plan hasta el MVP

**Objetivo:** MVP usable en el iPhone el **viernes 16 de octubre de 2026**. El viaje arranca el 17.
**Hoy:** miércoles 7 de octubre. Quedan 9 días.

Criterio para cada etapa: termina deployada en Vercel y probada en el iPhone, no solo en la compu. Así cualquier problema propio del iPhone (instalación, safe areas, teclado, login) aparece temprano.

Si los diseños finales de Claude Design llegan a mitad de camino, se aplican sobre lo ya construido; no frenan las etapas. Hasta entonces se usa `docs/diseño.md`.

---

## Etapa 0 · Documentación (mié 7 oct)
- [x] Handoff y brief de diseño en `docs/`.
- [x] Stack y decisiones acordadas (`docs/decisiones.md`).
- [x] `CLAUDE.md`, `README.md`, `docs/plan.md`, `docs/setup.md`.

## Etapa 1 · Cuentas y esqueleto (jue 8 oct)
- [ ] Ale crea las cuentas y servicios de `docs/setup.md`.
- [ ] Proyecto Next.js + TypeScript + Tailwind con los tokens del diseño y la fuente.
- [ ] Manifest PWA, ícono, safe areas, tab bar vacía (Viaje / Gastos).
- [ ] Deploy en Vercel conectado al repo.
- **Listo cuando:** la app vacía se instala desde Safari en la pantalla de inicio y abre sin barra del navegador.

## Etapa 2 · Datos, login y viaje compartido (vie 9 – sáb 10 oct)
- [ ] Esquema de base de datos como migraciones, con Row Level Security.
- [ ] Datos semilla del viaje (paradas, tramos y gastos de ejemplo).
- [ ] Login con código de 6 dígitos por email.
- [ ] Link de invitación al viaje; al entrar, elegir qué miembro sos (reclamar).
- **Listo cuando:** Ale y otra persona entran desde dos teléfonos y ven el mismo viaje.

## Etapa 3 · Pantalla Viaje (dom 11 oct)
- [ ] Header con nombre, fechas, noches, avatares y cantidad de destinos.
- [ ] Lista de paradas con foto (de Wikipedia), fechas calculadas y stepper de noches.
- [ ] Chips de tramo entre paradas y "Agregar tramo" para los vacíos.
- [ ] FAB "+" con menú: Agregar ciudad / Agregar gasto.
- [ ] Agregar, editar, reordenar y borrar ciudades.
- **Listo cuando:** se puede armar el viaje real desde el teléfono y las fechas cuadran.

## Etapa 4 · Tramos y pasajes (lun 12 – mar 13 oct)
- [ ] Bottom sheet de detalle del tramo: medio, fecha y horas, precio, quién pagó, entre quiénes.
- [ ] El precio del tramo crea o actualiza su gasto.
- [ ] Subir PDF o captura, o guardar link; varios por tramo.
- [ ] Pantalla Ver pasaje (PDF e imagen a pantalla completa) con el recordatorio de Wallet y el link.
- **Listo cuando:** se abre un pasaje real en menos de 3 toques desde la pantalla Viaje.

## Etapa 5 · Gastos y balance (mié 14 – jue 15 oct)
- [ ] Pantalla Gastos: total, por persona, lista agrupada por ciudad.
- [ ] Nuevo gasto con teclado numérico propio, quién pagó y entre quiénes.
- [ ] Montos distintos por persona además de partes iguales.
- [ ] Editar y borrar gastos.
- [ ] Balance simplificado, "Marcar como saldado" y "Deshacer".
- **Listo cuando:** los números del ejemplo de `diseño.md` dan igual (Fede €241, Juli €217, Ana €45 a Ale).

## Etapa 6 · Pulido y prueba real (jue 15 – vie 16 oct)
- [ ] Service worker para que la app cargue rápido con mala conexión.
- [ ] Prueba en los teléfonos de los viajeros: instalar, entrar, cargar un gasto cada uno.
- [ ] Borrar los datos de ejemplo y cargar el viaje real: viajeros, tramos y pasajes.
- [ ] Ajustes con los diseños finales, si ya están.
- **16 de octubre:** congelar. El 17 no se deploya nada salvo un arreglo urgente.

---

## Para después del MVP
- Importar reservas automáticamente (mails de aerolíneas y trenes) vinculadas al costo.
- Fotos del viaje por ciudad.
- Varias monedas con conversión (ej. NOK → EUR).
- Modo offline real (ver y cargar sin conexión, sincronizar después).
- Generar pases para Wallet (`.pkpass`).
- Varios viajes por usuario con pantalla para elegir viaje.

## Preguntas abiertas
- **Categorías de gasto:** el diseño muestra íconos por categoría pero no las lista. Propuesta: Transporte, Alojamiento, Comida, Actividades, Otros.
