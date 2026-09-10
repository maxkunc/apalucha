-- Apalucha merch archive schema

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  year integer not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.merch_items (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  name text not null,
  price_kc integer not null,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_merch_items_season on public.merch_items(season_id);

alter table public.seasons enable row level security;
alter table public.merch_items enable row level security;

-- Public (anonymous) read access — this is a public archive/gallery
create policy "Public can read seasons"
  on public.seasons for select
  to anon, authenticated
  using (true);

create policy "Public can read merch items"
  on public.merch_items for select
  to anon, authenticated
  using (true);

-- Only the admin account can write
create policy "Admin can insert seasons"
  on public.seasons for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'kunc.maxik@gmail.com');

create policy "Admin can update seasons"
  on public.seasons for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'kunc.maxik@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'kunc.maxik@gmail.com');

create policy "Admin can delete seasons"
  on public.seasons for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'kunc.maxik@gmail.com');

create policy "Admin can insert merch items"
  on public.merch_items for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'kunc.maxik@gmail.com');

create policy "Admin can update merch items"
  on public.merch_items for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'kunc.maxik@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'kunc.maxik@gmail.com');

create policy "Admin can delete merch items"
  on public.merch_items for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'kunc.maxik@gmail.com');

-- Storage bucket for merch photos
insert into storage.buckets (id, name, public)
values ('merch-images', 'merch-images', true)
on conflict (id) do nothing;

create policy "Public can read merch images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'merch-images');

create policy "Admin can upload merch images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'merch-images' and (auth.jwt() ->> 'email') = 'kunc.maxik@gmail.com');

create policy "Admin can update merch images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'merch-images' and (auth.jwt() ->> 'email') = 'kunc.maxik@gmail.com');

create policy "Admin can delete merch images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'merch-images' and (auth.jwt() ->> 'email') = 'kunc.maxik@gmail.com');

-- Seed ten seasons (2017–2026) with one example item on the latest one
insert into public.seasons (year) values
  (2017), (2018), (2019), (2020), (2021), (2022), (2023), (2024), (2025), (2026)
on conflict (year) do nothing;

insert into public.merch_items (season_id, name, price_kc)
select id, 'Černé triko', 400 from public.seasons where year = 2026;
