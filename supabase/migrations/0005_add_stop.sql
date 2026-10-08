-- Agregar una ciudad al recorrido (diseño: pantalla 10) y cambiarle el lugar (renombrar).

-- Inserta una parada después de p_after_stop_id (o al principio si es null), con las mismas personas
-- que la anterior (decisión 017). El tramo que salía de la anterior iba a la ciudad siguiente, que
-- ahora ya no es la siguiente: se borra junto con su gasto y sus pasajes, como en el diseño.
create function public.add_stop(
  p_trip_id uuid,
  p_after_stop_id uuid,
  p_city text,
  p_country text,
  p_country_code text,
  p_code text,
  p_lat double precision,
  p_lng double precision,
  p_timezone text,
  p_nights integer
)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_position integer;
  v_id uuid;
begin
  if not public.can_edit_trip(p_trip_id) then
    raise exception 'No tenés permiso para editar este viaje';
  end if;
  if length(trim(coalesce(p_city, ''))) = 0 then
    raise exception 'Falta el nombre de la ciudad';
  end if;

  if p_after_stop_id is null then
    v_position := 0;
  else
    select position + 1 into v_position from public.stops where id = p_after_stop_id and trip_id = p_trip_id;
    if v_position is null then
      raise exception 'No se encontró la ciudad anterior';
    end if;
    delete from public.legs where from_stop_id = p_after_stop_id;
  end if;

  update public.stops set position = position + 1 where trip_id = p_trip_id and position >= v_position;

  insert into public.stops (trip_id, position, city, country, country_code, code, nights, timezone, lat, lng)
  values (p_trip_id, v_position, trim(p_city), p_country, p_country_code, p_code, greatest(0, coalesce(p_nights, 2)),
          coalesce(p_timezone, 'UTC'), p_lat, p_lng)
  returning id into v_id;

  if p_after_stop_id is not null then
    insert into public.stop_members (stop_id, member_id)
    select v_id, member_id from public.stop_members where stop_id = p_after_stop_id;
  else
    insert into public.stop_members (stop_id, member_id)
    select v_id, id from public.trip_members where trip_id = p_trip_id;
  end if;

  return v_id;
end;
$$;

grant execute on function
  public.add_stop(uuid, uuid, text, text, text, text, double precision, double precision, text, integer)
to authenticated;
revoke execute on function
  public.add_stop(uuid, uuid, text, text, text, text, double precision, double precision, text, integer)
from public, anon;
