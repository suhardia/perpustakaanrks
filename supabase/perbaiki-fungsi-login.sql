-- =====================================================================
--  PERBAIKI FUNGSI LOGIN NAMA PENGGUNA
--  Jalankan SELURUH file ini sekali di Supabase -> SQL Editor -> Run.
--  Aman dijalankan berulang kali.
-- =====================================================================

-- 1. Kolom & aturan nama pengguna
alter table public.profiles add column if not exists username text;
create unique index if not exists profiles_username_unik on public.profiles (lower(username));

-- 2. Fungsi: nama pengguna -> email akun pustakawan
create or replace function public.email_untuk_login(p_username text)
returns text language sql stable security definer set search_path = public as $$
  select email from public.profiles
  where lower(username) = lower(trim(p_username)) and role = 'admin'
  limit 1;
$$;

-- 3. Izin: pengunjung yang belum login (anon) harus boleh memanggil fungsi ini
grant usage on schema public to anon, authenticated;
grant execute on function public.email_untuk_login(text) to anon, authenticated;

-- 4. Minta API Supabase (PostgREST) memuat ulang daftar tabel & fungsi
notify pgrst, 'reload schema';

-- 5. Pemeriksaan: semua kolom di hasil ini harus bernilai true / terisi
select
  p.oid::regprocedure                              as fungsi,
  has_function_privilege('anon', p.oid, 'execute') as anon_boleh_memanggil,
  (select string_agg(username || ' -> ' || email, ', ')
     from public.profiles where role = 'admin' and username is not null) as akun_pustakawan
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'email_untuk_login';

-- Jika baris "akun_pustakawan" kosong, jalankan perbaiki-akun-admin.sql (Langkah 2).
