-- Swap admin identity from kunc.maxik@gmail.com to admin@apalucha.cz

alter policy "Admin can insert seasons" on public.seasons
  with check ((auth.jwt() ->> 'email') = 'admin@apalucha.cz');

alter policy "Admin can update seasons" on public.seasons
  using ((auth.jwt() ->> 'email') = 'admin@apalucha.cz')
  with check ((auth.jwt() ->> 'email') = 'admin@apalucha.cz');

alter policy "Admin can delete seasons" on public.seasons
  using ((auth.jwt() ->> 'email') = 'admin@apalucha.cz');

alter policy "Admin can insert merch items" on public.merch_items
  with check ((auth.jwt() ->> 'email') = 'admin@apalucha.cz');

alter policy "Admin can update merch items" on public.merch_items
  using ((auth.jwt() ->> 'email') = 'admin@apalucha.cz')
  with check ((auth.jwt() ->> 'email') = 'admin@apalucha.cz');

alter policy "Admin can delete merch items" on public.merch_items
  using ((auth.jwt() ->> 'email') = 'admin@apalucha.cz');

alter policy "Admin can upload merch images" on storage.objects
  with check (bucket_id = 'merch-images' and (auth.jwt() ->> 'email') = 'admin@apalucha.cz');

alter policy "Admin can update merch images" on storage.objects
  using (bucket_id = 'merch-images' and (auth.jwt() ->> 'email') = 'admin@apalucha.cz');

alter policy "Admin can delete merch images" on storage.objects
  using (bucket_id = 'merch-images' and (auth.jwt() ->> 'email') = 'admin@apalucha.cz');

-- Note: the admin auth account itself (admin@apalucha.cz) was created directly
-- against this project via SQL, not tracked here. IMPORTANT: GoTrue fails
-- login with a 500 ("converting NULL to string is unsupported") if the
-- token columns (confirmation_token, recovery_token, email_change_token_new,
-- email_change, email_change_token_current, phone_change, phone_change_token,
-- reauthentication_token) are left NULL — they must be set to '' on insert.
