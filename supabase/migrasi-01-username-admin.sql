-- =====================================================================
--  MIGRASI 01: Login pustakawan memakai NAMA PENGGUNA + PASSWORD
--  - Jika database Anda sudah dibuat dengan schema.sql versi sebelumnya,
--    jalankan file ini sekali di Supabase -> SQL Editor.
--  - Untuk instalasi baru, isi file ini sudah termasuk di akhir schema.sql.
-- =====================================================================

-- Akun yang dibuat SEBELUM file ini dijalankan belum punya profil -> buatkan sekarang
insert into public.profiles (id, email, nama, no_anggota)
select u.id, u.email, coalesce(nullif(u.raw_user_meta_data ->> 'nama', ''), split_part(u.email, '@', 1)),
       'AGT' || lpad(nextval('public.no_anggota_seq')::text, 5, '0')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- Kolom nama pengguna (hanya dipakai akun pustakawan)
alter table public.profiles add column if not exists username text;

create unique index if not exists profiles_username_unik on public.profiles (lower(username));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_username_format') then
    alter table public.profiles add constraint profiles_username_format
      check (username is null or username ~ '^[A-Za-z0-9_.]{3,30}$');
  end if;
end $$;

-- Mengubah nama pengguna -> email akun pustakawan, dipakai saat login.
-- Hanya akun ber-role admin yang bisa masuk memakai nama pengguna.
-- (Password tetap diperiksa oleh Supabase Auth, lengkap dengan pembatasan percobaan login.)
create or replace function public.email_untuk_login(p_username text)
returns text language sql stable security definer set search_path = public as $$
  select email from public.profiles
  where lower(username) = lower(trim(p_username)) and role = 'admin'
  limit 1;
$$;

-- PUSTAKAWAN: mengatur nama pengguna (milik sendiri atau pustakawan lain)
create or replace function public.atur_username(p_user_id uuid, p_username text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_u text := nullif(trim(p_username), '');
begin
  if not public.is_admin() then raise exception 'Hanya pustakawan.'; end if;
  if v_u is not null and v_u !~ '^[A-Za-z0-9_.]{3,30}$' then
    raise exception 'Nama pengguna 3–30 karakter, hanya huruf, angka, titik, atau garis bawah (tanpa spasi).';
  end if;
  if v_u is not null and exists (
    select 1 from public.profiles where lower(username) = lower(v_u) and id <> p_user_id
  ) then
    raise exception 'Nama pengguna "%" sudah dipakai.', v_u;
  end if;
  update public.profiles set username = v_u where id = p_user_id;
end $$;

revoke execute on function public.email_untuk_login(text)  from public;
grant  execute on function public.email_untuk_login(text)  to anon, authenticated;
revoke execute on function public.atur_username(uuid, text) from public, anon;
grant  execute on function public.atur_username(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- MEMBUAT PUSTAKAWAN PERTAMA (contoh, sesuaikan lalu jalankan terpisah):
--   1. Daftar dulu lewat halaman "Daftar Anggota" di website (atau
--      Supabase -> Authentication -> Users -> Add user -> centang Auto Confirm).
--   2. Jalankan:
--        update public.profiles
--        set role = 'admin', username = 'admin'
--        where email = 'email-anda@contoh.com';
--   3. Masuk di website dengan nama pengguna: admin + password akun tersebut.
-- ---------------------------------------------------------------------
