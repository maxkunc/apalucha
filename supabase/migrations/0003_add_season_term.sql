-- Support a spring/autumn term per year. Existing rows are left termless
-- (displayed as just the year) since we don't know which term they were;
-- new seasons going forward always specify one via the admin UI.

alter table public.seasons
  add column term text check (term in ('jaro', 'podzim'));

alter table public.seasons drop constraint seasons_year_key;
alter table public.seasons add constraint seasons_year_term_key unique (year, term);
