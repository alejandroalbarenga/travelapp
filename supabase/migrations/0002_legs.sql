-- Tramos: noches que mueven los horarios y guardado del tramo con su gasto.

-- Cambiar las noches de una parada. Los tramos que salen de esa parada y de las siguientes
-- se corren los mismos días, manteniendo la hora local (respeta los cambios de horario).
create function public.set_stop_nights(p_stop_id uuid, p_nights integer)
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

-- Guarda un tramo (crea o actualiza: hay uno por parada de origen) y su gasto asociado.
-- Con precio y quién pagó, crea o actualiza el gasto con la división de p_splits;
-- sin precio, borra el gasto si existía.
create function public.save_leg(
  p_trip_id uuid,
  p_from_stop_id uuid,
  p_to_stop_id uuid,
  p_mode public.leg_mode,
  p_departs_at timestamptz,
  p_arrives_at timestamptz,
  p_total_price_cents integer,
  p_paid_by_member_id uuid,
  p_description text,
  p_splits jsonb
)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_leg public.legs;
  v_expense_id uuid;
begin
  insert into public.legs (trip_id, from_stop_id, to_stop_id, mode, departs_at, arrives_at, total_price_cents, paid_by_member_id)
  values (p_trip_id, p_from_stop_id, p_to_stop_id, p_mode, p_departs_at, p_arrives_at, p_total_price_cents, p_paid_by_member_id)
  on conflict (from_stop_id) do update set
    to_stop_id = excluded.to_stop_id,
    mode = excluded.mode,
    departs_at = excluded.departs_at,
    arrives_at = excluded.arrives_at,
    total_price_cents = excluded.total_price_cents,
    paid_by_member_id = excluded.paid_by_member_id
  returning * into v_leg;

  if coalesce(p_total_price_cents, 0) > 0 and p_paid_by_member_id is not null then
    v_expense_id := public.save_expense(
      v_leg.expense_id, p_trip_id, p_from_stop_id, v_leg.id, null,
      p_description, 'transport', p_total_price_cents, p_paid_by_member_id, p_splits
    );
    update public.legs set expense_id = v_expense_id where id = v_leg.id;
  elsif v_leg.expense_id is not null then
    delete from public.expenses where id = v_leg.expense_id;
  end if;

  return v_leg.id;
end;
$$;

grant execute on function
  public.set_stop_nights(uuid, integer),
  public.save_leg(uuid, uuid, uuid, public.leg_mode, timestamptz, timestamptz, integer, uuid, text, jsonb)
to authenticated;
revoke execute on function
  public.set_stop_nights(uuid, integer),
  public.save_leg(uuid, uuid, uuid, public.leg_mode, timestamptz, timestamptz, integer, uuid, text, jsonb)
from public, anon;
