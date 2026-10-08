-- Datos de ejemplo: el viaje Otoño en Europa de docs/diseño.md.
-- Los integrantes se crean sin cuenta; cada uno se reclama entrando con el link de invitación.
-- Se borran antes de cargar el viaje real (plan, Etapa 6).
-- Al final muestra el código de invitación.

do $$
declare
  v_trip uuid;
  v_al uuid; v_ro uuid; v_jo uuid; v_ag uuid;
  v_stops uuid[] := '{}';
  v_id uuid;
  v_leg uuid;
  v_stay uuid;
  v_exp uuid;
  i integer;
  -- city, country, country_code, code, nights, timezone, lat, lng, tagline
  v_data text[][] := array[
    ['Madrid', 'España', 'es', 'MAD', '0', 'Europe/Madrid', '40.4168', '-3.7038', 'Tapas, terrazas y nadie cena antes de las diez'],
    ['Bruselas', 'Bélgica', 'be', 'BRU', '4', 'Europe/Brussels', '50.8503', '4.3517', 'Waffles, papas fritas y cómics en las paredes'],
    ['Ámsterdam', 'Países Bajos', 'nl', 'AMS', '3', 'Europe/Amsterdam', '52.3676', '4.9041', 'Canales, bicis por todos lados y casas torcidas'],
    ['Eindhoven', 'Países Bajos', 'nl', 'EIN', '1', 'Europe/Amsterdam', '51.4416', '5.4697', 'Diseño, luces y una noche para cortar el viaje'],
    ['Vilna', 'Lituania', 'lt', 'VNO', '3', 'Europe/Vilnius', '54.6872', '25.2797', 'Cúpulas barrocas y un casco viejo para perderse'],
    ['Riga', 'Letonia', 'lv', 'RIX', '3', 'Europe/Riga', '56.9496', '24.1052', 'Art nouveau, un mercado gigante y bálsamo negro'],
    ['Oslo', 'Noruega', 'no', 'OSL', '3', 'Europe/Oslo', '59.9139', '10.7522', 'Fiordo, una ópera para caminar por arriba y todo carísimo'],
    ['Alicante', 'España', 'es', 'ALC', '3', 'Europe/Madrid', '38.3452', '-0.4810', 'Playa en noviembre y un castillo arriba del morro'],
    ['Valencia', 'España', 'es', 'VLC', '3', 'Europe/Madrid', '39.4699', '-0.3763', 'Paella de verdad y edificios de ciencia ficción'],
    ['Sevilla', 'España', 'es', 'SVQ', '3', 'Europe/Madrid', '37.3891', '-5.9845', 'Naranjos, patios y flamenco a la noche'],
    ['Málaga', 'España', 'es', 'AGP', '2', 'Europe/Madrid', '36.7213', '-4.4214', 'Sol, Picasso y espetos frente al mar'],
    ['Lisboa', 'Portugal', 'pt', 'LIS', '3', 'Europe/Lisbon', '38.7223', '-9.1393', 'Tranvía 28, pastéis de nata y miradores'],
    ['Madrid', 'España', 'es', 'MAD', '3', 'Europe/Madrid', '40.4168', '-3.7038', 'La última vuelta antes de volver a casa']
  ];
  -- mode, fecha de salida, hora de salida (local de origen), duración en minutos; null = sin cargar
  v_legs text[][] := array[
    ['plane', '2026-10-17', '13:40', '129'],
    ['train', '2026-10-21', '10:15', '112'],
    ['train', '2026-10-24', '11:04', '80'],
    ['plane', '2026-10-25', '09:30', '155'],
    ['bus', '2026-10-28', '08:00', '250'],
    ['plane', '2026-10-31', '14:20', '110'],
    ['plane', '2026-11-03', '07:45', '245'],
    [null, null, null, null],
    ['train', '2026-11-09', '09:20', '235'],
    ['car', '2026-11-12', '10:00', '130'],
    ['plane', '2026-11-14', '16:30', '85'],
    ['plane', '2026-11-17', '12:10', '80']
  ];
begin
  insert into public.trips (name, start_date, end_date, created_by)
  values ('Otoño en Europa', '2026-10-17', '2026-11-20', null)
  returning id into v_trip;

  insert into public.trip_members (trip_id, display_name, initials, color) values (v_trip, 'Ale', 'Al', '#2F5D8A') returning id into v_al;
  insert into public.trip_members (trip_id, display_name, initials, color) values (v_trip, 'Rodrigo', 'Ro', '#A4502B') returning id into v_ro;
  insert into public.trip_members (trip_id, display_name, initials, color) values (v_trip, 'Josué', 'Jo', '#3A6E4F') returning id into v_jo;
  insert into public.trip_members (trip_id, display_name, initials, color) values (v_trip, 'Agustín', 'Ag', '#634A83') returning id into v_ag;

  for i in 1 .. array_length(v_data, 1) loop
    insert into public.stops (trip_id, position, city, country, country_code, code, nights, timezone, lat, lng, tagline)
    values (v_trip, i - 1, v_data[i][1], v_data[i][2], v_data[i][3], v_data[i][4], v_data[i][5]::int,
            v_data[i][6], v_data[i][7]::float8, v_data[i][8]::float8, v_data[i][9])
    returning id into v_id;
    v_stops := v_stops || v_id;

    -- Quién está: Ale, Rodrigo y Josué hasta Riga; Oslo solo Ale y Rodrigo; desde Alicante se suma Agustín.
    insert into public.stop_members (stop_id, member_id)
    select v_id, m from unnest(case
      when i <= 6 then array[v_al, v_ro, v_jo]
      when i = 7 then array[v_al, v_ro]
      else array[v_al, v_ro, v_ag]
    end) as m;
  end loop;

  for i in 1 .. array_length(v_legs, 1) loop
    continue when v_legs[i][1] is null;
    insert into public.legs (trip_id, from_stop_id, to_stop_id, mode, departs_at, arrives_at, paid_by_member_id)
    values (
      v_trip, v_stops[i], v_stops[i + 1], v_legs[i][1]::public.leg_mode,
      (v_legs[i][2] || ' ' || v_legs[i][3])::timestamp at time zone v_data[i][6],
      ((v_legs[i][2] || ' ' || v_legs[i][3])::timestamp at time zone v_data[i][6]) + make_interval(mins => v_legs[i][4]::int),
      v_al
    )
    returning id into v_id;

    -- Los dos primeros tramos ya tienen precio y gasto, como en el diseño.
    if i = 1 then
      update public.legs set total_price_cents = 48000 where id = v_id;
      v_exp := public.save_expense(null, v_trip, v_stops[1], v_id, null, 'Vuelo Madrid → Bruselas', 'transport', 48000, v_al,
        jsonb_build_array(jsonb_build_object('member_id', v_al, 'amount_cents', 16000),
                          jsonb_build_object('member_id', v_ro, 'amount_cents', 16000),
                          jsonb_build_object('member_id', v_jo, 'amount_cents', 16000)));
      update public.legs set expense_id = v_exp where id = v_id;
    elsif i = 2 then
      update public.legs set total_price_cents = 18000, paid_by_member_id = v_jo where id = v_id;
      v_exp := public.save_expense(null, v_trip, v_stops[2], v_id, null, 'Tren Bruselas → Ámsterdam', 'transport', 18000, v_jo,
        jsonb_build_array(jsonb_build_object('member_id', v_al, 'amount_cents', 6000),
                          jsonb_build_object('member_id', v_ro, 'amount_cents', 6000),
                          jsonb_build_object('member_id', v_jo, 'amount_cents', 6000)));
      update public.legs set expense_id = v_exp where id = v_id;
    end if;
  end loop;

  -- Alojamientos con su gasto.
  insert into public.stays (stop_id, name, booked_via, total_price_cents, paid_by_member_id)
  values (v_stops[2], 'Hotel cerca de Grand-Place', 'booking', 26400, v_ro) returning id into v_stay;
  v_exp := public.save_expense(null, v_trip, v_stops[2], null, v_stay, 'Hotel cerca de Grand-Place · 4 noches', 'lodging', 26400, v_ro,
    jsonb_build_array(jsonb_build_object('member_id', v_al, 'amount_cents', 8800),
                      jsonb_build_object('member_id', v_ro, 'amount_cents', 8800),
                      jsonb_build_object('member_id', v_jo, 'amount_cents', 8800)));
  update public.stays set expense_id = v_exp where id = v_stay;

  insert into public.stays (stop_id, name, booked_via, total_price_cents, paid_by_member_id)
  values (v_stops[3], 'Departamento en De Pijp', 'airbnb', 42000, v_al) returning id into v_stay;
  v_exp := public.save_expense(null, v_trip, v_stops[3], null, v_stay, 'Departamento en De Pijp · 3 noches', 'lodging', 42000, v_al,
    jsonb_build_array(jsonb_build_object('member_id', v_al, 'amount_cents', 14000),
                      jsonb_build_object('member_id', v_ro, 'amount_cents', 14000),
                      jsonb_build_object('member_id', v_jo, 'amount_cents', 14000)));
  update public.stays set expense_id = v_exp where id = v_stay;

  -- Gastos sueltos en Ámsterdam.
  perform public.save_expense(null, v_trip, v_stops[3], null, null, 'Cena en De Pijp', 'food', 15600, v_jo,
    jsonb_build_array(jsonb_build_object('member_id', v_al, 'amount_cents', 5200),
                      jsonb_build_object('member_id', v_ro, 'amount_cents', 5200),
                      jsonb_build_object('member_id', v_jo, 'amount_cents', 5200)));
  perform public.save_expense(null, v_trip, v_stops[3], null, null, 'Museo Van Gogh', 'activities', 8800, v_ro,
    jsonb_build_array(jsonb_build_object('member_id', v_al, 'amount_cents', 2934),
                      jsonb_build_object('member_id', v_ro, 'amount_cents', 2933),
                      jsonb_build_object('member_id', v_jo, 'amount_cents', 2933)));
end;
$$;

select name, invite_code from public.trips where name = 'Otoño en Europa';
