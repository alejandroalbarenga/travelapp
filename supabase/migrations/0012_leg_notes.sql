-- Link y notas del tramo (decisión 090): dónde comprarlo o buscarlo ("omio.com/…") y una nota libre
-- ("Lo compro en Omio"). Se guardan con un update común: RLS (solo los que editan) ya aplica a legs.

alter table public.legs add column notes text;
alter table public.legs add column link_url text check (link_url is null or link_url ~* '^https?://');
