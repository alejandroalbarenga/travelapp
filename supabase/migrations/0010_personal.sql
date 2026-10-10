-- Gastos personales con presupuesto por categoría (decisión 076).
-- Son de cada usuario dentro de un viaje: nadie más los ve, ni el organizador. No entran en el
-- balance del grupo. Las categorías por defecto (Ropa, Comida, Regalos, Salidas, Otros) no se
-- guardan hasta que les ponés un presupuesto; las que creás vos, sí.

create table public.personal_categories (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  budget_cents integer check (budget_cents is null or budget_cents >= 0),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (trip_id, user_id, name)
);

create table public.personal_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- El nombre de la categoría: si borrás la categoría, el gasto queda con su nombre.
  category text not null check (char_length(btrim(category)) between 1 and 40),
  description text not null default '',
  amount_cents integer not null check (amount_cents > 0),
  spent_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index on public.personal_categories (trip_id, user_id);
create index on public.personal_expenses (trip_id, user_id);

alter table public.personal_categories enable row level security;
alter table public.personal_expenses enable row level security;

-- Solo vos, y solo en viajes de los que sos miembro.
create policy "personal_categories: solo las tuyas" on public.personal_categories
  for all to authenticated
  using (user_id = auth.uid() and public.is_trip_member(trip_id))
  with check (user_id = auth.uid() and public.is_trip_member(trip_id));

create policy "personal_expenses: solo los tuyos" on public.personal_expenses
  for all to authenticated
  using (user_id = auth.uid() and public.is_trip_member(trip_id))
  with check (user_id = auth.uid() and public.is_trip_member(trip_id));
