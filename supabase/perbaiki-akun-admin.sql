-- =====================================================================
--  PERIKSA & PERBAIKI AKUN PUSTAKAWAN
--  Jalankan di Supabase -> SQL Editor. Ganti email & nama pengguna di LANGKAH 2.
-- =====================================================================

-- LANGKAH 1 (diagnosis): lihat semua akun dan profilnya.
--   - profil_ada = false      -> akun dibuat sebelum schema.sql dijalankan (profil tidak terbentuk)
--   - terkonfirmasi = false   -> "Auto Confirm User" tidak dicentang saat Add user
--   - role / username kosong  -> UPDATE sebelumnya tidak mengenai baris mana pun
select
  u.email,
  u.email_confirmed_at is not null as terkonfirmasi,
  p.id is not null                 as profil_ada,
  p.role,
  p.username,
  exists (select 1 from pg_proc where proname = 'email_untuk_login') as fungsi_login_ada
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at;

-- LANGKAH 2 (perbaikan): jalankan blok di bawah ini (ganti email & username).
do $$
declare
  v_email    text := 'email-anda@contoh.com';   -- << email akun dari "Add user"
  v_username text := 'admin';                   -- << nama pengguna untuk login
  v_n int;
begin
  -- a. Buat profil untuk akun yang belum punya profil
  insert into public.profiles (id, email, nama, no_anggota)
  select u.id, u.email, split_part(u.email, '@', 1),
         'AGT' || lpad(nextval('public.no_anggota_seq')::text, 5, '0')
  from auth.users u
  where not exists (select 1 from public.profiles p where p.id = u.id);

  -- b. Samakan email profil dengan email login (huruf besar/kecil diabaikan)
  update public.profiles p set email = u.email
  from auth.users u where u.id = p.id and p.email is distinct from u.email;

  -- c. Jadikan pustakawan + beri nama pengguna
  update public.profiles
  set role = 'admin', username = v_username
  where lower(email) = lower(trim(v_email));
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Email % tidak ditemukan di auth.users. Cek ejaan email di Authentication -> Users.', v_email;
  end if;

  -- d. Konfirmasi email bila belum (agar bisa login tanpa klik tautan email)
  update auth.users set email_confirmed_at = now()
  where lower(email) = lower(trim(v_email)) and email_confirmed_at is null;

  raise notice 'Selesai: % sekarang pustakawan dengan nama pengguna "%".', v_email, v_username;
end $$;

-- LANGKAH 3: jalankan lagi query LANGKAH 1. Baris akun Anda harus menunjukkan
--   terkonfirmasi = true, profil_ada = true, role = admin, username terisi, fungsi_login_ada = true.
-- Jika fungsi_login_ada = false, jalankan dulu supabase/migrasi-01-username-admin.sql.
-- Jika password lupa: Authentication -> Users -> (titik tiga) -> Send password recovery,
-- atau hapus user lalu "Add user" lagi dan jalankan LANGKAH 2.
