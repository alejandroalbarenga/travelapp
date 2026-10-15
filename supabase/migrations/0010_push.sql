-- Notificaciones de gastos (decisión 065). Cada teléfono que las activa guarda su suscripción de
-- Web Push. Cuando alguien carga, edita o borra un gasto, el servidor les avisa a los que están en
-- el gasto (los que lo dividen y quien pagó), salvo a quien lo hizo.
--
-- Nadie lee las suscripciones de otros: la tabla solo deja ver y tocar las propias, y el servidor
-- pide a quién avisar con push_targets(), que solo responde a quien puede editar el viaje.

create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "own push subscriptions" on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Las suscripciones de los integrantes que se pasan, sin las de quien llama.
create or replace function public.push_targets(p_trip_id uuid, p_member_ids uuid[])
returns table (member_id uuid, endpoint text, p256dh text, auth text)
language sql stable security definer set search_path = ''
as $$
  select m.id, s.endpoint, s.p256dh, s.auth
  from public.trip_members m
  join public.push_subscriptions s on s.user_id = m.user_id
  where public.can_edit_trip(p_trip_id)
    and m.trip_id = p_trip_id
    and m.id = any (p_member_ids)
    and m.user_id <> auth.uid();
$$;

-- Una suscripción que ya no existe (el teléfono la dio de baja): se borra para no insistir.
-- Solo si es de alguien del viaje que quien llama puede editar.
create or replace function public.forget_push_subscription(p_trip_id uuid, p_endpoint text)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.push_subscriptions s
  where s.endpoint = p_endpoint
    and public.can_edit_trip(p_trip_id)
    and exists (select 1 from public.trip_members m where m.trip_id = p_trip_id and m.user_id = s.user_id);
$$;

revoke execute on function public.push_targets(uuid, uuid[]), public.forget_push_subscription(uuid, text) from public, anon;
grant execute on function public.push_targets(uuid, uuid[]), public.forget_push_subscription(uuid, text) to authenticated;
