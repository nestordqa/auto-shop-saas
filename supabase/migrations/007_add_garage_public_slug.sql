create extension if not exists unaccent;

alter table public.garages add column slug text;

with normalized as (
  select
    id,
    coalesce(nullif(trim(both '-' from regexp_replace(unaccent(lower(name)), '[^a-z0-9]+', '-', 'g')), ''), 'taller') as base_slug,
    row_number() over (
      partition by coalesce(nullif(trim(both '-' from regexp_replace(unaccent(lower(name)), '[^a-z0-9]+', '-', 'g')), ''), 'taller')
      order by created_at, id
    ) as duplicate_number
  from public.garages
)
update public.garages as garage
set slug = normalized.base_slug || case when normalized.duplicate_number = 1 then '' else '-' || left(garage.id::text, 8) end
from normalized
where normalized.id = garage.id;

alter table public.garages alter column slug set not null;
alter table public.garages add constraint garages_slug_format_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
create unique index garages_slug_unique_idx on public.garages (slug);