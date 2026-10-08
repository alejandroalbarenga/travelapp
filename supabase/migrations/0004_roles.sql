-- Permisos por integrante (decisión 034, reemplaza a la 008).
--   admin  → organizador, uno por viaje: edita todo y maneja integrantes y permisos.
--   editor → edita todo lo del viaje, salvo integrantes y permisos.
--   viewer → solo ve. Es el rol con el que arranca quien entra con la invitación.
-- La base lo hace cumplir con RLS: las funciones que guardan (save_expense, save_leg, save_stop,
-- set_stop_nights) corren con los permisos del usuario, así que también quedan cubiertas.

create type public.member_role as enum ('admin', 'editor', 'viewer');

alter table public.trip_members add column role public.member_role not null default 'viewer';

-- Un solo organizador por viaje.
create unique index trip_members_one_admin on public.trip_members (trip_id) where role = 'admin';

-- Datos que ya existen: el creador de cada viaje es el organizador. Si el viaje no tiene creador
-- (el de ejemplo, cargado con el seed), lo es el primer integrante que entró con su cuenta.
update public.trip_members m set role = 'admin'
from public.trips t
where m.trip_id = t.id and t.created_by is not null and m.user_id = t.created_by;

update public.trip_members m set role = 'admin'
where m.id in (
  select distinct on (m2.trip_id) m2.id
  from public.trip_members m2
  join public.trips t on t.id = m2.trip_id
  where m2.user_id is not null
    and not exists (select 1 from public.trip_members a where a.trip_id = m2.trip_id and a.role = 'admin')
  order by m2.trip_id, m2.created_at
);

-- ─── Funciones de permisos ────────────────────────────────────────────────

create function public.can_edit_trip(p_trip_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = auth.uid() and role in ('admin', 'editor')
  );
$$;

create function public.is_trip_admin(p_trip_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function public.can_edit_trip(uuid), public.is_trip_admin(uuid) from public, anon;
grant execute on function public.can_edit_trip(uuid), public.is_trip_admin(uuid) to authenticated;

-- El organizador no puede dejar de serlo ni borrarse (el viaje se quedaría sin organizador).
create function public.protect_trip_admin()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.role = 'admin' then
    -- Se permite cuando se borra el viaje entero (cascada).
    if exists (select 1 from public.trips where id = old.trip_id) then
      raise exception 'El organizador no se puede sacar del viaje';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' and old.role = 'admin' and new.role <> 'admin' then
    raise exception 'El organizador no puede dejar de serlo';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trip_members_protect_admin
  before update or delete on public.trip_members
  for each row execute function public.protect_trip_admin();

-- ─── Políticas: todos los miembros leen; escriben admin y editor ──────────

drop policy "members update trip" on public.trips;
drop policy "members delete trip" on public.trips;
create policy "editors update trip" on public.trips
  for update to authenticated using (public.can_edit_trip(id)) with check (public.can_edit_trip(id));
create policy "admin deletes trip" on public.trips
  for delete to authenticated using (public.is_trip_admin(id));

-- Integrantes: los ven todos; solo el organizador agrega, cambia permisos o saca.
-- (Reclamar un integrante o sumarse con la invitación va por funciones aparte.)
drop policy "members manage members" on public.trip_members;
create policy "members read members" on public.trip_members
  for select to authenticated using (public.is_trip_member(trip_id));
create policy "admin manages members" on public.trip_members
  for insert to authenticated with check (public.is_trip_admin(trip_id));
create policy "admin updates members" on public.trip_members
  for update to authenticated using (public.is_trip_admin(trip_id)) with check (public.is_trip_admin(trip_id));
create policy "admin deletes members" on public.trip_members
  for delete to authenticated using (public.is_trip_admin(trip_id));

-- El resto de las tablas: misma regla para todas.
drop policy "members manage stops" on public.stops;
create policy "members read stops" on public.stops
  for select to authenticated using (public.is_trip_member(trip_id));
create policy "editors write stops" on public.stops
  for all to authenticated using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id));

drop policy "members manage stop members" on public.stop_members;
create policy "members read stop members" on public.stop_members
  for select to authenticated using (public.is_trip_member(public.stop_trip_id(stop_id)));
create policy "editors write stop members" on public.stop_members
  for all to authenticated
  using (public.can_edit_trip(public.stop_trip_id(stop_id))) with check (public.can_edit_trip(public.stop_trip_id(stop_id)));

drop policy "members manage legs" on public.legs;
create policy "members read legs" on public.legs
  for select to authenticated using (public.is_trip_member(trip_id));
create policy "editors write legs" on public.legs
  for all to authenticated using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id));

drop policy "members manage stays" on public.stays;
create policy "members read stays" on public.stays
  for select to authenticated using (public.is_trip_member(public.stop_trip_id(stop_id)));
create policy "editors write stays" on public.stays
  for all to authenticated
  using (public.can_edit_trip(public.stop_trip_id(stop_id))) with check (public.can_edit_trip(public.stop_trip_id(stop_id)));

drop policy "members manage expenses" on public.expenses;
create policy "members read expenses" on public.expenses
  for select to authenticated using (public.is_trip_member(trip_id));
create policy "editors write expenses" on public.expenses
  for all to authenticated using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id));

drop policy "members manage expense splits" on public.expense_splits;
create policy "members read expense splits" on public.expense_splits
  for select to authenticated using (public.is_trip_member(public.expense_trip_id(expense_id)));
create policy "editors write expense splits" on public.expense_splits
  for all to authenticated
  using (public.can_edit_trip(public.expense_trip_id(expense_id))) with check (public.can_edit_trip(public.expense_trip_id(expense_id)));

drop policy "members manage settlements" on public.settlements;
create policy "members read settlements" on public.settlements
  for select to authenticated using (public.is_trip_member(trip_id));
create policy "editors write settlements" on public.settlements
  for all to authenticated using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id));

drop policy "members manage leg attachments" on public.leg_attachments;
create policy "members read leg attachments" on public.leg_attachments
  for select to authenticated using (public.is_trip_member(public.leg_trip_id(leg_id)));
create policy "editors write leg attachments" on public.leg_attachments
  for all to authenticated
  using (public.can_edit_trip(public.leg_trip_id(leg_id))) with check (public.can_edit_trip(public.leg_trip_id(leg_id)));

drop policy "members manage stay attachments" on public.stay_attachments;
create policy "members read stay attachments" on public.stay_attachments
  for select to authenticated using (public.is_trip_member(public.stay_trip_id(stay_id)));
create policy "editors write stay attachments" on public.stay_attachments
  for all to authenticated
  using (public.can_edit_trip(public.stay_trip_id(stay_id))) with check (public.can_edit_trip(public.stay_trip_id(stay_id)));

-- Archivos: leer, cualquier miembro; subir, cambiar o borrar, admin y editor.
create function public.can_edit_trip_path(p_name text)
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
  return public.can_edit_trip(v_trip_id);
end;
$$;
revoke execute on function public.can_edit_trip_path(text) from public, anon;
grant execute on function public.can_edit_trip_path(text) to authenticated;

drop policy "members upload attachments" on storage.objects;
drop policy "members update attachments" on storage.objects;
drop policy "members delete attachments" on storage.objects;
create policy "editors upload attachments" on storage.objects
  for insert to authenticated with check (bucket_id = 'attachments' and public.can_edit_trip_path(name));
create policy "editors update attachments" on storage.objects
  for update to authenticated using (bucket_id = 'attachments' and public.can_edit_trip_path(name));
create policy "editors delete attachments" on storage.objects
  for delete to authenticated using (bucket_id = 'attachments' and public.can_edit_trip_path(name));

-- ─── Crear el viaje: el creador queda como organizador ────────────────────

create or replace function public.create_trip(
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
  insert into public.trip_members (trip_id, user_id, display_name, initials, color, role)
  values (v_trip_id, auth.uid(), p_display_name, p_initials, p_color, 'admin');
  return v_trip_id;
end;
$$;

-- get_invite: suma el rol, para mostrar quién organiza.
drop function public.get_invite(text);
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
  claimed boolean,
  role public.member_role
)
language sql stable security definer set search_path = ''
as $$
  select t.id, t.name, t.start_date, t.end_date, m.id, m.display_name, m.initials, m.color, m.user_id is not null, m.role
  from public.trips t
  join public.trip_members m on m.trip_id = t.id
  where t.invite_code = p_code and auth.uid() is not null
  order by m.created_at;
$$;
revoke execute on function public.get_invite(text) from public, anon;
grant execute on function public.get_invite(text) to authenticated;

-- Cambiar noches: con solo ver, error explícito (si no, RLS lo ignoraría sin avisar).
create or replace function public.set_stop_nights(p_stop_id uuid, p_nights integer)
returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_stop public.stops;
  v_delta integer;
begin
  if p_nights < 0 or p_nights > 60 then
    raise exception 'Las noches tienen que estar entre 0 y 60';
  end if;
  select * into v_stop from public.stops where id = p_stop_id;
  if not found then
    raise exception 'No se encontró la ciudad';
  end if;
  if not public.can_edit_trip(v_stop.trip_id) then
    raise exception 'No tenés permiso para editar este viaje';
  end if;
  v_delta := p_nights - v_stop.nights;
  if v_delta = 0 then
    return;
  end if;

  update public.stops set nights = p_nights where id = p_stop_id;

  -- La llegada se corre en la zona de destino (o la de origen si es la vuelta a casa).
  update public.legs l set
    departs_at = ((l.departs_at at time zone f.timezone) + make_interval(days => v_delta)) at time zone f.timezone,
    arrives_at = ((l.arrives_at at time zone coalesce((select t.timezone from public.stops t where t.id = l.to_stop_id), f.timezone))
                  + make_interval(days => v_delta))
                 at time zone coalesce((select t.timezone from public.stops t where t.id = l.to_stop_id), f.timezone)
  from public.stops f
  where l.from_stop_id = f.id
    and f.trip_id = v_stop.trip_id
    and f.position >= v_stop.position;
end;
$$;

-- Reclamar un integrante: si el viaje todavía no tiene organizador (el de ejemplo, si nadie se
-- había reclamado antes de esta migración), el primero que entra queda como organizador.
create or replace function public.claim_member(p_code text, p_member_id uuid)
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
  if not exists (select 1 from public.trip_members where trip_id = v_trip_id and role = 'admin') then
    update public.trip_members set role = 'admin' where id = p_member_id;
  end if;
  return v_trip_id;
end;
$$;
