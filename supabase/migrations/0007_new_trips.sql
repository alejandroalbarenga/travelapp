-- Viajes nuevos: borrar un viaje entero (solo el organizador, decisión 034) y que quien se suma
-- con la invitación quede en las ciudades.

-- Borrar un viaje entero.
-- Un delete directo de trips falla si tiene gastos: la cascada puede llegar a trip_members antes
-- que a expenses, y los gastos no dejan borrar a quien pagó o participó (on delete restrict, a
-- propósito: un integrante con gastos no se puede sacar). Acá se borran primero los gastos y
-- los saldos, y después el viaje con todo lo demás en cascada.
-- Los archivos del bucket los borra antes la app (Storage no deja borrarlos desde SQL).

create function public.delete_trip(p_trip_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_trip_admin(p_trip_id) then
    raise exception 'Solo el organizador puede borrar el viaje';
  end if;
  delete from public.settlements where trip_id = p_trip_id;
  delete from public.expenses where trip_id = p_trip_id;
  delete from public.trips where id = p_trip_id;
end;
$$;

revoke execute on function public.delete_trip(uuid) from public, anon;
grant execute on function public.delete_trip(uuid) to authenticated;

-- Sumarse con la invitación como integrante nuevo: además queda en todas las ciudades del viaje
-- (antes no quedaba en ninguna y no entraba en la división de los gastos). Si no hace todo el
-- viaje, se ajusta en "Quién está" de cada ciudad.
create or replace function public.join_trip_as_new(
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
  v_member_id uuid;
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
  on conflict (trip_id, user_id) do nothing
  returning id into v_member_id;
  if v_member_id is not null then
    insert into public.stop_members (stop_id, member_id)
    select id, v_member_id from public.stops where trip_id = v_trip_id;
  end if;
  return v_trip_id;
end;
$$;
