-- Historial de movimientos de gastos y pagos (pantalla Gastos, abajo del todo), y nota en los pagos.

-- Pagos entre integrantes: "Marcar como saldado" o una transferencia cargada a mano
-- ("le transferí €50 a Josué"), con una nota opcional.
alter table public.settlements add column note text;

-- Queda registrado quién cargó, editó o borró un gasto y quién marcó o deshizo un saldo,
-- para que nada se pierda aunque alguien borre algo. Nadie lo puede editar ni borrar:
-- solo lo escriben los triggers y save_expense (security definer).

create table public.activity (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  -- Quién lo hizo. El nombre se guarda aparte por si después se borra al integrante.
  actor_member_id uuid references public.trip_members (id) on delete set null,
  actor_name text,
  action text not null check (action in ('expense_added', 'expense_edited', 'expense_deleted', 'settled', 'settle_undone')),
  -- Gasto: su concepto. Saldo: quién le pagó a quién.
  description text,
  from_name text,
  to_name text,
  amount_cents integer,
  previous_amount_cents integer,
  -- Qué cambió en una edición: amount, description, payer, split, city, category.
  changes text[],
  created_at timestamptz not null default now()
);
create index on public.activity (trip_id, created_at desc);

alter table public.activity enable row level security;
create policy "members read activity" on public.activity
  for select to authenticated using (public.is_trip_member(trip_id));
revoke all on public.activity from anon, authenticated;
grant select on public.activity to authenticated;

-- Anota un movimiento a nombre del integrante del usuario actual en ese viaje.
-- La llama save_expense (que corre con los permisos del usuario), así que un editor podría
-- llamarla a mano: lo que anote queda a su nombre, y no puede borrar ni cambiar nada.
create function public.log_activity(
  p_trip_id uuid,
  p_action text,
  p_description text,
  p_amount_cents integer,
  p_previous_amount_cents integer default null,
  p_changes text[] default null,
  p_from_name text default null,
  p_to_name text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_member public.trip_members;
begin
  -- Si se está borrando el viaje entero, no hay nada que anotar.
  if not exists (select 1 from public.trips where id = p_trip_id) then
    return;
  end if;
  -- Desde los triggers, el permiso ya lo controló RLS al escribir el gasto o el saldo.
  if auth.uid() is not null and not public.can_edit_trip(p_trip_id) then
    raise exception 'No tenés permiso para editar este viaje';
  end if;
  select * into v_member from public.trip_members
  where trip_id = p_trip_id and user_id = auth.uid();
  insert into public.activity
    (trip_id, actor_member_id, actor_name, action, description, from_name, to_name, amount_cents, previous_amount_cents, changes)
  values
    (p_trip_id, v_member.id, v_member.display_name, p_action, p_description, p_from_name, p_to_name, p_amount_cents, p_previous_amount_cents, p_changes);
end;
$$;
revoke execute on function public.log_activity(uuid, text, text, integer, integer, text[], text, text) from public, anon;
grant execute on function public.log_activity(uuid, text, text, integer, integer, text[], text, text) to authenticated;

-- Gastos: alta y baja por trigger (también los de tramos y alojamientos, y los que se borran en cascada).
create function public.log_expense_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.trip_id, 'expense_added', new.description, new.amount_cents);
    return new;
  end if;
  perform public.log_activity(old.trip_id, 'expense_deleted', old.description, old.amount_cents);
  return old;
end;
$$;

create trigger expenses_activity
  after insert or delete on public.expenses
  for each row execute function public.log_expense_activity();

-- Saldos: marcar como saldado y deshacer.
create function public.log_settlement_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.settlements := case when tg_op = 'INSERT' then new else old end;
begin
  perform public.log_activity(
    v_row.trip_id,
    case when tg_op = 'INSERT' then 'settled' else 'settle_undone' end,
    v_row.note,
    v_row.amount_cents,
    null,
    null,
    (select display_name from public.trip_members where id = v_row.from_member_id),
    (select display_name from public.trip_members where id = v_row.to_member_id)
  );
  return v_row;
end;
$$;

create trigger settlements_activity
  after insert or delete on public.settlements
  for each row execute function public.log_settlement_activity();

-- Las ediciones se anotan en save_expense, que es el único lugar donde se conoce la división
-- de antes y la de después. Si nada cambió (ej. se guardó un tramo sin tocar el precio), no se anota.
create or replace function public.save_expense(
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
  v_old public.expenses;
  v_old_splits jsonb;
  v_new_splits jsonb;
  v_changes text[] := '{}';
begin
  if v_id is null then
    insert into public.expenses
      (trip_id, stop_id, leg_id, stay_id, description, category, amount_cents, paid_by_member_id)
    values
      (p_trip_id, p_stop_id, p_leg_id, p_stay_id, p_description, p_category, p_amount_cents, p_paid_by_member_id)
    returning id into v_id;
  else
    select * into v_old from public.expenses where id = v_id and trip_id = p_trip_id;
    select coalesce(jsonb_object_agg(member_id, amount_cents), '{}') into v_old_splits
    from public.expense_splits where expense_id = v_id;

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

  if p_expense_id is not null then
    select coalesce(jsonb_object_agg(member_id, amount_cents), '{}') into v_new_splits
    from public.expense_splits where expense_id = v_id;
    if v_old.amount_cents <> p_amount_cents then v_changes := array_append(v_changes, 'amount'); end if;
    if v_old.description is distinct from p_description then v_changes := array_append(v_changes, 'description'); end if;
    if v_old.paid_by_member_id <> p_paid_by_member_id then v_changes := array_append(v_changes, 'payer'); end if;
    -- Con otro monto la división cambia sí o sí: solo cuenta si cambió entre quiénes.
    if v_old_splits <> v_new_splits and (
      v_old.amount_cents = p_amount_cents
      or (select array_agg(k order by k) from jsonb_object_keys(v_old_splits) k)
         is distinct from (select array_agg(k order by k) from jsonb_object_keys(v_new_splits) k)
    ) then v_changes := array_append(v_changes, 'split'); end if;
    if v_old.stop_id is distinct from p_stop_id then v_changes := array_append(v_changes, 'city'); end if;
    if v_old.category is distinct from p_category then v_changes := array_append(v_changes, 'category'); end if;
    if cardinality(v_changes) > 0 then
      perform public.log_activity(p_trip_id, 'expense_edited', p_description, p_amount_cents, v_old.amount_cents, v_changes);
    end if;
  end if;

  return v_id;
end;
$$;
