-- Esquema inicial de Viajes en grupo.
-- Modelo de datos: CLAUDE.md y docs/decisiones.md. Montos en centavos enteros.
-- Permisos (decisión 008): los miembros de un viaje ven y editan todo lo de ese viaje;
-- nadie ve viajes de los que no es miembro.

-- ─── Tipos ────────────────────────────────────────────────────────────────

create type public.leg_mode as enum ('car', 'train', 'plane', 'bus', 'other');
create type public.attachment_kind as enum ('pdf', 'image', 'link');
create type public.booking_source as enum ('booking', 'airbnb', 'direct', 'other');
create type public.chip_display as enum ('time', 'duration');

-- ─── Tablas ───────────────────────────────────────────────────────────────

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  chip_display public.chip_display not null default 'time',
  created_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  start_date date not null,
  end_date date not null,
  currency char(3) not null default 'EUR',
  invite_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  display_name text not null check (length(trim(display_name)) > 0),
  initials text not null,
  color text not null,
  created_at timestamptz not null default now(),
  unique (trip_id, user_id)
);
create index on public.trip_members (user_id);

create table public.stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  position integer not null,
  city text not null,
  country text,
  country_code text,
  code text,
  tagline text,
  notes text,
  nights integer not null default 0 check (nights >= 0),
  timezone text not null default 'UTC',
  lat double precision,
  lng double precision,
  photo_url text,
  created_at timestamptz not null default now()
);
create index on public.stops (trip_id, position);

create table public.stop_members (
  stop_id uuid not null references public.stops (id) on delete cascade,
  member_id uuid not null references public.trip_members (id) on delete cascade,
  primary key (stop_id, member_id)
);

-- Un tramo sale de una parada. to_stop_id null = la vuelta a casa después de la última.
create table public.legs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  from_stop_id uuid not null unique references public.stops (id) on delete cascade,
  to_stop_id uuid references public.stops (id) on delete cascade,
  mode public.leg_mode not null,
  departs_at timestamptz,
  arrives_at timestamptz,
  total_price_cents integer check (total_price_cents >= 0),
  paid_by_member_id uuid references public.trip_members (id) on delete set null,
  expense_id uuid,
  created_at timestamptz not null default now()
);

create table public.stays (
  id uuid primary key default gen_random_uuid(),
  stop_id uuid not null references public.stops (id) on delete cascade,
  name text,
  address text,
  booked_via public.booking_source,
  total_price_cents integer check (total_price_cents >= 0),
  paid_by_member_id uuid references public.trip_members (id) on delete set null,
  expense_id uuid,
  notes text,
  created_at timestamptz not null default now()
);
create index on public.stays (stop_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  stop_id uuid references public.stops (id) on delete set null,
  leg_id uuid unique references public.legs (id) on delete cascade,
  stay_id uuid unique references public.stays (id) on delete cascade,
  description text not null,
  category text not null default 'other',
  amount_cents integer not null check (amount_cents > 0),
  paid_by_member_id uuid not null references public.trip_members (id) on delete restrict,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.expenses (trip_id);

alter table public.legs
  add foreign key (expense_id) references public.expenses (id) on delete set null;
alter table public.stays
  add foreign key (expense_id) references public.expenses (id) on delete set null;

create table public.expense_splits (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  member_id uuid not null references public.trip_members (id) on delete restrict,
  amount_cents integer not null check (amount_cents >= 0),
  primary key (expense_id, member_id)
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  from_member_id uuid not null references public.trip_members (id) on delete cascade,
  to_member_id uuid not null references public.trip_members (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  settled_at timestamptz not null default now(),
  check (from_member_id <> to_member_id)
);
create index on public.settlements (trip_id);

-- Pasajes (uno por viajero, decisión 023) y comprobantes de alojamiento.
create table public.leg_attachments (
  id uuid primary key default gen_random_uuid(),
  leg_id uuid not null references public.legs (id) on delete cascade,
  member_id uuid references public.trip_members (id) on delete set null,
  kind public.attachment_kind not null,
  storage_path text,
  url text,
  file_name text,
  size_bytes integer,
  uploaded_by_member_id uuid references public.trip_members (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((kind = 'link') = (url is not null))
);
create index on public.leg_attachments (leg_id);

create table public.stay_attachments (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.stays (id) on delete cascade,
  kind public.attachment_kind not null,
  storage_path text,
  url text,
  file_name text,
  size_bytes integer,
  uploaded_by_member_id uuid references public.trip_members (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((kind = 'link') = (url is not null))
);
create index on public.stay_attachments (stay_id);

-- ─── Funciones de permisos ────────────────────────────────────────────────
-- security definer para que las políticas puedan consultar trip_members sin recursión.

create function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = auth.uid()
  );
$$;

create function public.stop_trip_id(p_stop_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$ select trip_id from public.stops where id = p_stop_id; $$;

create function public.leg_trip_id(p_leg_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$ select trip_id from public.legs where id = p_leg_id; $$;

create function public.stay_trip_id(p_stay_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select s.trip_id from public.stays st join public.stops s on s.id = st.stop_id
  where st.id = p_stay_id;
$$;

create function public.expense_trip_id(p_expense_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$ select trip_id from public.expenses where id = p_expense_id; $$;

-- ─── Row Level Security ───────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.stops enable row level security;
alter table public.stop_members enable row level security;
alter table public.legs enable row level security;
alter table public.stays enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;
alter table public.leg_attachments enable row level security;
alter table public.stay_attachments enable row level security;

create policy "own profile" on public.profiles
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Los viajes se crean con create_trip() para que el creador quede como miembro.
create policy "members read trip" on public.trips
  for select to authenticated using (public.is_trip_member(id));
create policy "members update trip" on public.trips
  for update to authenticated using (public.is_trip_member(id)) with check (public.is_trip_member(id));
create policy "members delete trip" on public.trips
  for delete to authenticated using (public.is_trip_member(id));

create policy "members manage members" on public.trip_members
  for all to authenticated
  using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));

create policy "members manage stops" on public.stops
  for all to authenticated
  using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));

create policy "members manage stop members" on public.stop_members
  for all to authenticated
  using (public.is_trip_member(public.stop_trip_id(stop_id)))
  with check (public.is_trip_member(public.stop_trip_id(stop_id)));

create policy "members manage legs" on public.legs
  for all to authenticated
  using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));

create policy "members manage stays" on public.stays
  for all to authenticated
  using (public.is_trip_member(public.stop_trip_id(stop_id)))
  with check (public.is_trip_member(public.stop_trip_id(stop_id)));

create policy "members manage expenses" on public.expenses
  for all to authenticated
  using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));

create policy "members manage expense splits" on public.expense_splits
  for all to authenticated
  using (public.is_trip_member(public.expense_trip_id(expense_id)))
  with check (public.is_trip_member(public.expense_trip_id(expense_id)));

create policy "members manage settlements" on public.settlements
  for all to authenticated
  using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));

create policy "members manage leg attachments" on public.leg_attachments
  for all to authenticated
  using (public.is_trip_member(public.leg_trip_id(leg_id)))
  with check (public.is_trip_member(public.leg_trip_id(leg_id)));

create policy "members manage stay attachments" on public.stay_attachments
  for all to authenticated
  using (public.is_trip_member(public.stay_trip_id(stay_id)))
  with check (public.is_trip_member(public.stay_trip_id(stay_id)));

-- ─── La división de un gasto suma el total ───────────────────────────────
-- Se controla al final de la transacción, así se pueden reemplazar las partes
-- dentro de save_expense() sin que falle a mitad de camino.

create function public.check_expense_splits()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_expense_id uuid;
  v_amount integer;
  v_sum integer;
begin
  if tg_table_name = 'expenses' then
    v_expense_id := new.id;
  else
    v_expense_id := coalesce(new.expense_id, old.expense_id);
  end if;

  select amount_cents into v_amount from public.expenses where id = v_expense_id;
  if v_amount is null then
    return null; -- el gasto se borró
  end if;

  select coalesce(sum(amount_cents), 0) into v_sum
  from public.expense_splits where expense_id = v_expense_id;

  if v_sum <> v_amount then
    raise exception 'La división del gasto (% centavos) no suma el total (% centavos)', v_sum, v_amount;
  end if;
  return null;
end;
$$;

create constraint trigger expense_splits_sum
  after insert or update or delete on public.expense_splits
  deferrable initially deferred
  for each row execute function public.check_expense_splits();

create constraint trigger expense_amount_matches_splits
  after insert or update of amount_cents on public.expenses
  deferrable initially deferred
  for each row execute function public.check_expense_splits();

-- ─── Funciones que usa la app ─────────────────────────────────────────────

-- Perfil automático al registrarse.
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Crea un viaje y deja al usuario como su primer miembro.
create function public.create_trip(
  p_name text,
  p_start_date date,
  p_end_date date,
  p_display_name text,
  p_initials text,
  p_color text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_trip_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesión';
  end if;
  insert into public.trips (name, start_date, end_date, created_by)
  values (p_name, p_start_date, p_end_date, auth.uid())
  returning id into v_trip_id;
  insert into public.trip_members (trip_id, user_id, display_name, initials, color)
  values (v_trip_id, auth.uid(), p_display_name, p_initials, p_color);
  return v_trip_id;
end;
$$;

-- Lo que ve alguien que entra con un link de invitación: el viaje y sus miembros,
-- para elegir cuál es (decisión 006). No hace falta ser miembro todavía.
create function public.get_invite(p_code text)
returns table (
  trip_id uuid,
  trip_name text,
  start_date date,
  end_date date,
  member_id uuid,
  display_name text,
  initials text,
  color text,
  claimed boolean
)
language sql stable security definer set search_path = ''
as $$
  select t.id, t.name, t.start_date, t.end_date, m.id, m.display_name, m.initials, m.color, m.user_id is not null
  from public.trips t
  join public.trip_members m on m.trip_id = t.id
  where t.invite_code = p_code and auth.uid() is not null
  order by m.created_at;
$$;

-- Reclamar un miembro sin cuenta: queda vinculado al usuario actual.
create function public.claim_member(p_code text, p_member_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_trip_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesión';
  end if;
  select id into v_trip_id from public.trips where invite_code = p_code;
  if v_trip_id is null then
    raise exception 'El link de invitación no es válido';
  end if;
  if exists (select 1 from public.trip_members where trip_id = v_trip_id and user_id = auth.uid()) then
    return v_trip_id; -- ya es miembro
  end if;
  update public.trip_members set user_id = auth.uid()
  where id = p_member_id and trip_id = v_trip_id and user_id is null;
  if not found then
    raise exception 'Ese integrante ya está tomado';
  end if;
  return v_trip_id;
end;
$$;

-- Sumarse a un viaje como un integrante nuevo (si no estaba en la lista).
create function public.join_trip_as_new(
  p_code text,
  p_display_name text,
  p_initials text,
  p_color text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_trip_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesión';
  end if;
  select id into v_trip_id from public.trips where invite_code = p_code;
  if v_trip_id is null then
    raise exception 'El link de invitación no es válido';
  end if;
  insert into public.trip_members (trip_id, user_id, display_name, initials, color)
  values (v_trip_id, auth.uid(), p_display_name, p_initials, p_color)
  on conflict (trip_id, user_id) do nothing;
  return v_trip_id;
end;
$$;

-- Guarda un gasto y su división en una sola transacción. Corre con los permisos
-- del usuario (security invoker), así que aplican las políticas de arriba.
-- p_splits: [{"member_id": "...", "amount_cents": 1234}, ...]
create function public.save_expense(
  p_expense_id uuid,
  p_trip_id uuid,
  p_stop_id uuid,
  p_leg_id uuid,
  p_stay_id uuid,
  p_description text,
  p_category text,
  p_amount_cents integer,
  p_paid_by_member_id uuid,
  p_splits jsonb
)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid := p_expense_id;
begin
  if v_id is null then
    insert into public.expenses
      (trip_id, stop_id, leg_id, stay_id, description, category, amount_cents, paid_by_member_id)
    values
      (p_trip_id, p_stop_id, p_leg_id, p_stay_id, p_description, p_category, p_amount_cents, p_paid_by_member_id)
    returning id into v_id;
  else
    update public.expenses set
      stop_id = p_stop_id,
      leg_id = p_leg_id,
      stay_id = p_stay_id,
      description = p_description,
      category = p_category,
      amount_cents = p_amount_cents,
      paid_by_member_id = p_paid_by_member_id
    where id = v_id and trip_id = p_trip_id;
    if not found then
      raise exception 'No se encontró el gasto';
    end if;
    delete from public.expense_splits where expense_id = v_id;
  end if;

  insert into public.expense_splits (expense_id, member_id, amount_cents)
  select v_id, (s ->> 'member_id')::uuid, (s ->> 'amount_cents')::integer
  from jsonb_array_elements(p_splits) as s;

  return v_id;
end;
$$;

-- ─── Accesos ──────────────────────────────────────────────────────────────
-- Solo usuarios con sesión; las políticas de RLS deciden qué filas ve cada uno.

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.create_trip(text, date, date, text, text, text),
  public.get_invite(text),
  public.claim_member(text, uuid),
  public.join_trip_as_new(text, text, text, text),
  public.save_expense(uuid, uuid, uuid, uuid, uuid, text, text, integer, uuid, jsonb),
  public.is_trip_member(uuid),
  public.stop_trip_id(uuid),
  public.leg_trip_id(uuid),
  public.stay_trip_id(uuid),
  public.expense_trip_id(uuid)
to authenticated;

-- ─── Archivos: pasajes y comprobantes (decisión 011) ─────────────────────
-- Bucket privado. Ruta de cada archivo: {trip_id}/...; se sirven con URLs firmadas.

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create function public.can_access_trip_path(p_name text)
returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_trip_id uuid;
begin
  begin
    v_trip_id := split_part(p_name, '/', 1)::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return public.is_trip_member(v_trip_id);
end;
$$;

revoke execute on function public.can_access_trip_path(text) from public, anon;
grant execute on function public.can_access_trip_path(text) to authenticated;

create policy "members read attachments" on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments' and public.can_access_trip_path(name));
create policy "members upload attachments" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and public.can_access_trip_path(name));
create policy "members update attachments" on storage.objects
  for update to authenticated
  using (bucket_id = 'attachments' and public.can_access_trip_path(name));
create policy "members delete attachments" on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and public.can_access_trip_path(name));
