-- Pantalla de ciudad: guarda quién está, las notas y el alojamiento (con su gasto) en un paso.

-- p_member_ids: quiénes están en la parada (al menos uno).
-- Alojamiento: uno por parada en la interfaz. Si no tiene nombre ni dónde se reservó, se borra.
-- Con dónde se reservó, precio y quién pagó, crea o actualiza su gasto con la división de p_stay_splits;
-- si no, borra el gasto si existía (decisiones 018 y 031).
create function public.save_stop(
  p_stop_id uuid,
  p_member_ids uuid[],
  p_notes text,
  p_stay_name text,
  p_booked_via public.booking_source,
  p_stay_price_cents integer,
  p_stay_paid_by_member_id uuid,
  p_stay_description text,
  p_stay_splits jsonb
)
returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_stop public.stops;
  v_stay public.stays;
  v_expense_id uuid;
begin
  select * into v_stop from public.stops where id = p_stop_id;
  if not found then
    raise exception 'No se encontró la ciudad';
  end if;
  if coalesce(array_length(p_member_ids, 1), 0) = 0 then
    raise exception 'Tiene que quedar al menos una persona';
  end if;

  update public.stops set notes = nullif(trim(coalesce(p_notes, '')), '') where id = p_stop_id;

  delete from public.stop_members where stop_id = p_stop_id and member_id <> all (p_member_ids);
  insert into public.stop_members (stop_id, member_id)
  select p_stop_id, m from unnest(p_member_ids) as m
  on conflict do nothing;

  select * into v_stay from public.stays where stop_id = p_stop_id order by created_at limit 1;

  if nullif(trim(coalesce(p_stay_name, '')), '') is null and p_booked_via is null then
    if v_stay.id is not null then
      delete from public.expenses where id = v_stay.expense_id;
      delete from public.stays where id = v_stay.id;
    end if;
    return;
  end if;

  if v_stay.id is null then
    insert into public.stays (stop_id, name, booked_via, total_price_cents, paid_by_member_id)
    values (p_stop_id, nullif(trim(p_stay_name), ''), p_booked_via, p_stay_price_cents, p_stay_paid_by_member_id)
    returning * into v_stay;
  else
    update public.stays set
      name = nullif(trim(p_stay_name), ''),
      booked_via = p_booked_via,
      total_price_cents = p_stay_price_cents,
      paid_by_member_id = p_stay_paid_by_member_id
    where id = v_stay.id
    returning * into v_stay;
  end if;

  if p_booked_via is not null and coalesce(p_stay_price_cents, 0) > 0 and p_stay_paid_by_member_id is not null then
    v_expense_id := public.save_expense(
      v_stay.expense_id, v_stop.trip_id, p_stop_id, null, v_stay.id,
      p_stay_description, 'lodging', p_stay_price_cents, p_stay_paid_by_member_id, p_stay_splits
    );
    update public.stays set expense_id = v_expense_id where id = v_stay.id;
  elsif v_stay.expense_id is not null then
    delete from public.expenses where id = v_stay.expense_id;
  end if;
end;
$$;

grant execute on function
  public.save_stop(uuid, uuid[], text, text, public.booking_source, integer, uuid, text, jsonb)
to authenticated;
revoke execute on function
  public.save_stop(uuid, uuid[], text, text, public.booking_source, integer, uuid, text, jsonb)
from public, anon;
