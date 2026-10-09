-- Horas de check-in y checkout del alojamiento (decisión 051): la ficha de la ciudad las muestra en
-- la línea de tiempo ("Check-in · después de 14:00", "Checkout · antes de 11:00").
-- Se guardan aparte de save_stop() con un update común: RLS (solo los que editan) y el bloqueo
-- de ciudades (migración 0008) ya aplican a stays.

alter table public.stays add column check_in_time time;
alter table public.stays add column check_out_time time;
