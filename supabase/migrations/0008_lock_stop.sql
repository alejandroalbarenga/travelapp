-- Bloquear una ciudad (decisión 042): ya está todo reservado y pago, no se toca más.
-- Una ciudad bloqueada no deja cambiar sus noches, quién está, notas ni alojamiento (con su
-- comprobante), ni borrarla. Tampoco se pueden correr sus fechas: no se cambian las noches de las
-- ciudades anteriores ni se agrega o borra una ciudad con noches antes. Los tramos siguen
-- editables y los gastos sueltos se cargan igual. Bloquear y desbloquear: los que pueden editar.
-- Todo se controla con triggers, así vale para cualquier función o update directo. Cuando se
-- borra el viaje entero (cascada), la fila padre ya no existe y se deja pasar.

alter table public.stops add column locked boolean not null default false;

create function public.stop_is_locked(p_stop_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select locked from public.stops where id = p_stop_id), false); $$;

-- ¿Hay una ciudad bloqueada en o después de esa posición? Sus fechas dependen de las anteriores.
create function public.locked_from(p_trip_id uuid, p_position integer)
returns text
language sql stable security definer set search_path = ''
as $$
  select city from public.stops
  where trip_id = p_trip_id and locked and position >= p_position
  order by position limit 1;
$$;

-- Las usan los triggers con el usuario de la sesión; sin sesión no se pueden llamar.
revoke execute on function public.stop_is_locked(uuid), public.locked_from(uuid, integer) from public, anon;
grant execute on function public.stop_is_locked(uuid), public.locked_from(uuid, integer) to authenticated;

create function public.protect_locked_stop()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_city text;
begin
  if tg_op = 'INSERT' then
    v_city := public.locked_from(new.trip_id, new.position);
    if new.nights > 0 and v_city is not null then
      raise exception 'Hay una ciudad bloqueada después (%): sus fechas no se pueden correr', v_city;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if not exists (select 1 from public.trips where id = old.trip_id) then
      return old; -- se está borrando el viaje entero
    end if;
    if old.locked then
      raise exception 'La ciudad está bloqueada';
    end if;
    v_city := public.locked_from(old.trip_id, old.position + 1);
    if old.nights > 0 and v_city is not null then
      raise exception 'Hay una ciudad bloqueada después (%): sus fechas no se pueden correr', v_city;
    end if;
    return old;
  end if;

  -- UPDATE. Mover de posición (al agregar o borrar otra) y bloquear o desbloquear se puede siempre.
  if old.locked and new.locked and (
    new.nights, new.city, new.country, new.country_code, new.code, new.tagline, new.notes,
    new.timezone, new.lat, new.lng, new.photo_url
  ) is distinct from (
    old.nights, old.city, old.country, old.country_code, old.code, old.tagline, old.notes,
    old.timezone, old.lat, old.lng, old.photo_url
  ) then
    raise exception 'La ciudad está bloqueada';
  end if;
  if new.nights <> old.nights then
    v_city := public.locked_from(new.trip_id, new.position + 1);
    if v_city is not null then
      raise exception 'Hay una ciudad bloqueada después (%): sus fechas no se pueden correr', v_city;
    end if;
  end if;
  return new;
end;
$$;

create trigger stops_protect_locked
  before insert or update or delete on public.stops
  for each row execute function public.protect_locked_stop();

-- Quién está, alojamiento y comprobante de una ciudad bloqueada.
create function public.protect_locked_stop_children()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_stop_id uuid;
begin
  if tg_table_name = 'stay_attachments' then
    select stop_id into v_stop_id from public.stays where id = coalesce(new.stay_id, old.stay_id);
  else
    v_stop_id := coalesce(new.stop_id, old.stop_id);
  end if;
  -- En una cascada (se borra la ciudad, el viaje o el integrante) la fila padre ya no está.
  -- (IF anidados: plpgsql no corta el AND y old.member_id no existe en las otras tablas.)
  if tg_table_name = 'stop_members' and tg_op = 'DELETE' then
    if not exists (select 1 from public.trip_members where id = old.member_id) then
      return old;
    end if;
  end if;
  -- Al borrar el viaje entero, la ciudad sigue un instante pero el viaje ya no (ej. el "pagó" del
  -- alojamiento pasa a null cuando se van los integrantes).
  if public.stop_is_locked(v_stop_id)
     and exists (select 1 from public.trips t join public.stops s on s.trip_id = t.id where s.id = v_stop_id) then
    raise exception 'La ciudad está bloqueada';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger stop_members_protect_locked
  before insert or update or delete on public.stop_members
  for each row execute function public.protect_locked_stop_children();
create trigger stays_protect_locked
  before insert or update or delete on public.stays
  for each row execute function public.protect_locked_stop_children();
create trigger stay_attachments_protect_locked
  before insert or update or delete on public.stay_attachments
  for each row execute function public.protect_locked_stop_children();

-- Borrar el viaje: primero se desbloquean sus ciudades (al borrar los gastos, el alojamiento
-- pierde su expense_id y eso contaría como editar una ciudad bloqueada).
create or replace function public.delete_trip(p_trip_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_trip_admin(p_trip_id) then
    raise exception 'Solo el organizador puede borrar el viaje';
  end if;
  update public.stops set locked = false where trip_id = p_trip_id and locked;
  delete from public.settlements where trip_id = p_trip_id;
  delete from public.expenses where trip_id = p_trip_id;
  delete from public.trips where id = p_trip_id;
end;
$$;

-- Hostelworld como lugar de reserva del alojamiento (decisión 045). "direct" queda por los que ya
-- lo usaron, pero la pantalla ya no lo ofrece.
alter type public.booking_source add value if not exists 'hostelworld';
