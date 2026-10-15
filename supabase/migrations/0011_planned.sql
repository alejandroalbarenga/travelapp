-- Planificado: lo que se estima que va a salir el viaje (decisión 084).
-- Un estimado no es un gasto: no entra en el balance ni en el total gastado. Puede ser el precio
-- estimado de un tramo (leg_id) o del alojamiento de una ciudad (stay_stop_id; no hace falta que el
-- alojamiento exista todavía), uno por cada uno, o algo suelto (entradas, comidas, excursiones).
-- Se reparte en partes iguales entre member_ids.
-- Cuando se paga, el tramo o el alojamiento pasa a tener su precio real (con su gasto) y el estimado
-- se borra.

create table public.planned_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  leg_id uuid unique references public.legs (id) on delete cascade,
  stay_stop_id uuid unique references public.stops (id) on delete cascade,
  stop_id uuid references public.stops (id) on delete set null,
  description text not null default '',
  category text not null default 'other' check (category in ('transport', 'lodging', 'food', 'activities', 'other')),
  amount_cents integer not null check (amount_cents > 0),
  member_ids uuid[] not null default '{}',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (leg_id is null or stay_stop_id is null)
);

create index on public.planned_items (trip_id);

alter table public.planned_items enable row level security;

-- Lo ven todos los del viaje; lo cambian los que pueden editar (decisión 034).
create policy "members read planned" on public.planned_items
  for select to authenticated using (public.is_trip_member(trip_id));
create policy "editors write planned" on public.planned_items
  for all to authenticated using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id));
