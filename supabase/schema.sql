-- =====================================================================
--  SKEMA DATABASE PERPUSTAKAAN (Supabase / PostgreSQL)
--  Jalankan seluruh file ini SEKALI di: Supabase Dashboard -> SQL Editor
--  Lalu (opsional) jalankan seed.sql untuk data contoh.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PENGATURAN (satu baris saja)
-- ---------------------------------------------------------------------
create table if not exists public.pengaturan (
  id               int primary key default 1 check (id = 1),
  nama_perpustakaan text not null default 'Perpustakaan Digital',
  lama_pinjam      int  not null default 7    check (lama_pinjam > 0),      -- hari
  denda_per_hari   int  not null default 1000 check (denda_per_hari >= 0),  -- rupiah
  maks_pinjam      int  not null default 3    check (maks_pinjam > 0),      -- buku aktif per anggota
  maks_antrian     int  not null default 3    check (maks_antrian > 0),     -- antrian aktif per anggota
  maks_perpanjang  int  not null default 1    check (maks_perpanjang >= 0),
  batas_ambil_hari int  not null default 2    check (batas_ambil_hari > 0), -- waktu mengambil buku setelah giliran tiba
  zona_waktu       text not null default 'Asia/Jayapura'
);
insert into public.pengaturan (id) values (1) on conflict (id) do nothing;

-- Tanggal "hari ini" mengikuti zona waktu perpustakaan
create or replace function public.hari_ini()
returns date language sql stable set search_path = public as $$
  select (now() at time zone (select zona_waktu from public.pengaturan where id = 1))::date;
$$;

-- ---------------------------------------------------------------------
-- 2. PROFIL PENGGUNA (terhubung ke auth.users milik Supabase)
-- ---------------------------------------------------------------------
create sequence if not exists public.no_anggota_seq;

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  nama        text not null default '',
  role        text not null default 'anggota' check (role in ('admin', 'anggota')),
  no_anggota  text unique,
  no_hp       text,
  alamat      text,
  created_at  timestamptz not null default now()
);

-- Profil dibuat otomatis setiap ada user baru mendaftar
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nama, no_hp, no_anggota)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'nama', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'no_hp', ''),
    'AGT' || lpad(nextval('public.no_anggota_seq')::text, 5, '0')
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Akun yang dibuat SEBELUM file ini dijalankan belum punya profil -> buatkan sekarang
insert into public.profiles (id, email, nama, no_anggota)
select u.id, u.email, coalesce(nullif(u.raw_user_meta_data ->> 'nama', ''), split_part(u.email, '@', 1)),
       'AGT' || lpad(nextval('public.no_anggota_seq')::text, 5, '0')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------
-- 3. KATALOG
-- ---------------------------------------------------------------------
create table if not exists public.kategori (
  id         bigint generated always as identity primary key,
  nama       text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.buku (
  id           bigint generated always as identity primary key,
  kategori_id  bigint references public.kategori (id) on delete set null,
  judul        text not null,
  pengarang    text,
  penerbit     text,
  tahun_terbit int,
  isbn         text unique,
  rak          text,
  jumlah       int  not null default 1 check (jumlah >= 0),  -- total eksemplar
  sinopsis     text,
  cover_url    text,
  created_at   timestamptz not null default now()
);
create index if not exists buku_judul_idx on public.buku (lower(judul));

-- ---------------------------------------------------------------------
-- 4. SIRKULASI: PEMINJAMAN & ANTRIAN
-- ---------------------------------------------------------------------
create table if not exists public.peminjaman (
  id                bigint generated always as identity primary key,
  anggota_id        uuid   not null references public.profiles (id) on delete restrict,
  buku_id           bigint not null references public.buku (id) on delete restrict,
  tgl_pinjam        date   not null,
  tgl_jatuh_tempo   date   not null,
  tgl_kembali       date,
  status            text   not null default 'dipinjam' check (status in ('dipinjam', 'dikembalikan')),
  jumlah_perpanjang int    not null default 0,
  denda             int    not null default 0,
  dicatat_oleh      uuid   references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists peminjaman_status_idx on public.peminjaman (status, buku_id);
create index if not exists peminjaman_anggota_idx on public.peminjaman (anggota_id);

-- Status antrian:
--   menunggu      -> belum ada eksemplar kosong, menunggu giliran
--   siap_diambil  -> eksemplar sudah disisihkan, anggota harus mengambil sebelum batas_ambil
--   selesai       -> sudah diserahkan (menjadi peminjaman)
--   dibatalkan    -> dibatalkan anggota/pustakawan
--   kedaluwarsa   -> tidak diambil sampai batas_ambil, giliran pindah ke antrian berikutnya
create table if not exists public.antrian (
  id          bigint generated always as identity primary key,
  anggota_id  uuid   not null references public.profiles (id) on delete cascade,
  buku_id     bigint not null references public.buku (id) on delete cascade,
  status      text   not null default 'menunggu'
              check (status in ('menunggu', 'siap_diambil', 'selesai', 'dibatalkan', 'kedaluwarsa')),
  catatan     text,
  created_at  timestamptz not null default now(),
  siap_at     timestamptz,
  batas_ambil date,
  selesai_at  timestamptz
);
-- Satu anggota hanya boleh punya satu antrian aktif per buku
create unique index if not exists antrian_aktif_unik
  on public.antrian (anggota_id, buku_id) where status in ('menunggu', 'siap_diambil');
create index if not exists antrian_buku_idx on public.antrian (buku_id, status, created_at);

-- ---------------------------------------------------------------------
-- 5. VIEW
-- ---------------------------------------------------------------------
-- Status ketersediaan tiap buku (untuk halaman depan, bisa dilihat publik).
-- Hanya berisi angka ringkasan, tidak membuka data pribadi peminjam.
create or replace view public.buku_status as
select
  b.id, b.kategori_id, b.judul, b.pengarang, b.penerbit, b.tahun_terbit, b.isbn,
  b.rak, b.jumlah, b.sinopsis, b.cover_url, b.created_at,
  k.nama                                   as kategori_nama,
  coalesce(p.dipinjam, 0)::int             as dipinjam,
  coalesce(a.dipesan, 0)::int              as dipesan,      -- disisihkan untuk antrian
  coalesce(a.menunggu, 0)::int             as antrian,      -- jumlah orang menunggu
  greatest(b.jumlah - coalesce(p.dipinjam, 0) - coalesce(a.dipesan, 0), 0)::int as tersedia,
  p.kembali_terdekat
from public.buku b
left join public.kategori k on k.id = b.kategori_id
left join (
  select buku_id, count(*) as dipinjam, min(tgl_jatuh_tempo) as kembali_terdekat
  from public.peminjaman where status = 'dipinjam' group by buku_id
) p on p.buku_id = b.id
left join (
  select buku_id,
         count(*) filter (where status = 'siap_diambil') as dipesan,
         count(*) filter (where status = 'menunggu')     as menunggu
  from public.antrian where status in ('menunggu', 'siap_diambil') group by buku_id
) a on a.buku_id = b.id;

-- Posisi seseorang dalam antrian sebuah buku (1 = paling depan)
create or replace function public.posisi_antrian(p_antrian_id bigint)
returns int language sql stable security definer set search_path = public as $$
  select case when a.status <> 'menunggu' then null else (
    select count(*)::int from public.antrian x
    where x.buku_id = a.buku_id and x.status = 'menunggu'
      and (x.created_at, x.id) <= (a.created_at, a.id)
  ) end
  from public.antrian a where a.id = p_antrian_id;
$$;

-- Detail peminjaman + denda berjalan. security_invoker: mengikuti RLS (anggota hanya melihat miliknya).
create or replace view public.peminjaman_detail with (security_invoker = true) as
select
  p.*,
  b.judul, b.cover_url, b.isbn,
  pr.nama as anggota_nama, pr.no_anggota, pr.email as anggota_email,
  greatest(coalesce(p.tgl_kembali, public.hari_ini()) - p.tgl_jatuh_tempo, 0) as hari_terlambat,
  case when p.status = 'dipinjam'
       then greatest(public.hari_ini() - p.tgl_jatuh_tempo, 0) * (select denda_per_hari from public.pengaturan where id = 1)
       else p.denda end as denda_berjalan
from public.peminjaman p
join public.buku b on b.id = p.buku_id
join public.profiles pr on pr.id = p.anggota_id;

create or replace view public.antrian_detail with (security_invoker = true) as
select
  a.*,
  b.judul, b.cover_url,
  pr.nama as anggota_nama, pr.no_anggota, pr.email as anggota_email,
  public.posisi_antrian(a.id) as posisi
from public.antrian a
join public.buku b on b.id = a.buku_id
join public.profiles pr on pr.id = a.anggota_id;

-- ---------------------------------------------------------------------
-- 6. FUNGSI INTERNAL (tidak bisa dipanggil langsung dari aplikasi)
-- ---------------------------------------------------------------------
create or replace function public._tersedia(p_buku_id bigint)
returns int language sql stable set search_path = public as $$
  select greatest(
    b.jumlah
    - (select count(*) from public.peminjaman where buku_id = b.id and status = 'dipinjam')
    - (select count(*) from public.antrian    where buku_id = b.id and status = 'siap_diambil'),
  0)::int
  from public.buku b where b.id = p_buku_id;
$$;

-- Jika ada eksemplar kosong, antrian terdepan dinaikkan menjadi "siap_diambil"
create or replace function public._promosikan_antrian(p_buku_id bigint)
returns void language plpgsql set search_path = public as $$
declare
  v_id   bigint;
  v_hari int := (select batas_ambil_hari from public.pengaturan where id = 1);
begin
  loop
    exit when public._tersedia(p_buku_id) <= 0;
    select id into v_id from public.antrian
      where buku_id = p_buku_id and status = 'menunggu'
      order by created_at, id limit 1;
    exit when v_id is null;
    update public.antrian
      set status = 'siap_diambil', siap_at = now(), batas_ambil = public.hari_ini() + v_hari
      where id = v_id;
  end loop;
end $$;

-- Pemeriksaan sebelum anggota meminjam / mengantre
create or replace function public._cek_anggota(p_anggota uuid, p_buku_id bigint, p_untuk_pinjam boolean)
returns void language plpgsql set search_path = public as $$
declare
  v_set public.pengaturan;
  v_jml int;
begin
  select * into v_set from public.pengaturan where id = 1;

  if not exists (select 1 from public.profiles where id = p_anggota and role = 'anggota') then
    raise exception 'Hanya akun anggota yang dapat meminjam atau mengantre.';
  end if;
  if exists (select 1 from public.peminjaman
             where anggota_id = p_anggota and buku_id = p_buku_id and status = 'dipinjam') then
    raise exception 'Anggota sedang meminjam buku ini.';
  end if;
  if exists (select 1 from public.peminjaman
             where anggota_id = p_anggota and status = 'dipinjam' and tgl_jatuh_tempo < public.hari_ini()) then
    raise exception 'Masih ada buku yang terlambat dikembalikan. Kembalikan dulu sebelum meminjam atau mengantre lagi.';
  end if;
  if p_untuk_pinjam then
    select count(*) into v_jml from public.peminjaman where anggota_id = p_anggota and status = 'dipinjam';
    if v_jml >= v_set.maks_pinjam then
      raise exception 'Batas peminjaman tercapai (maksimal % buku).', v_set.maks_pinjam;
    end if;
  end if;
end $$;

-- Jika pustakawan menambah jumlah eksemplar, antrian yang menunggu langsung mendapat giliran
create or replace function public._buku_jumlah_berubah()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.jumlah > old.jumlah then
    perform public._promosikan_antrian(new.id);
  end if;
  return new;
end $$;

drop trigger if exists buku_jumlah_berubah on public.buku;
create trigger buku_jumlah_berubah
  after update of jumlah on public.buku
  for each row execute function public._buku_jumlah_berubah();

-- ---------------------------------------------------------------------
-- 7. FUNGSI RPC (dipanggil aplikasi lewat supabase.rpc)
-- ---------------------------------------------------------------------

-- Menandai antrian yang tidak diambil sampai batas waktu, lalu memberikan giliran ke berikutnya.
-- Aman dipanggil kapan saja (dipanggil otomatis saat halaman pustakawan dibuka).
create or replace function public.proses_kedaluwarsa()
returns int language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_n int := 0;
begin
  for r in
    update public.antrian set status = 'kedaluwarsa', selesai_at = now()
    where status = 'siap_diambil' and batas_ambil < public.hari_ini()
    returning buku_id
  loop
    v_n := v_n + 1;
    perform public._promosikan_antrian(r.buku_id);
  end loop;
  return v_n;
end $$;

-- ANGGOTA: mengajukan antrian peminjaman.
-- Jika ada eksemplar kosong dan tidak ada yang menunggu, langsung "siap_diambil".
create or replace function public.ajukan_antrian(p_buku_id bigint)
returns public.antrian language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_set public.pengaturan;
  v_jml int;
  v_row public.antrian;
begin
  if v_uid is null then
    raise exception 'Silakan masuk terlebih dahulu.';
  end if;
  perform 1 from public.buku where id = p_buku_id for update;  -- kunci agar tidak bentrok
  if not found then
    raise exception 'Buku tidak ditemukan.';
  end if;

  perform public.proses_kedaluwarsa();
  perform public._cek_anggota(v_uid, p_buku_id, false);

  if exists (select 1 from public.antrian
             where anggota_id = v_uid and buku_id = p_buku_id and status in ('menunggu', 'siap_diambil')) then
    raise exception 'Anda sudah berada dalam antrian buku ini.';
  end if;

  select * into v_set from public.pengaturan where id = 1;
  select count(*) into v_jml from public.antrian
    where anggota_id = v_uid and status in ('menunggu', 'siap_diambil');
  if v_jml >= v_set.maks_antrian then
    raise exception 'Batas antrian tercapai (maksimal % buku sekaligus).', v_set.maks_antrian;
  end if;

  insert into public.antrian (anggota_id, buku_id) values (v_uid, p_buku_id) returning * into v_row;
  perform public._promosikan_antrian(p_buku_id);

  select * into v_row from public.antrian where id = v_row.id;
  return v_row;
end $$;

-- ANGGOTA / PUSTAKAWAN: membatalkan antrian
create or replace function public.batalkan_antrian(p_antrian_id bigint)
returns public.antrian language plpgsql security definer set search_path = public as $$
declare
  v_row public.antrian;
begin
  select * into v_row from public.antrian where id = p_antrian_id for update;
  if not found or (v_row.anggota_id <> auth.uid() and not public.is_admin()) then
    raise exception 'Antrian tidak ditemukan.';
  end if;
  if v_row.status not in ('menunggu', 'siap_diambil') then
    raise exception 'Antrian ini sudah tidak aktif.';
  end if;

  update public.antrian set status = 'dibatalkan', selesai_at = now()
    where id = p_antrian_id returning * into v_row;
  perform public._promosikan_antrian(v_row.buku_id);
  return v_row;
end $$;

-- PUSTAKAWAN: menyerahkan buku ke anggota yang antriannya "siap_diambil"
create or replace function public.serahkan_antrian(p_antrian_id bigint)
returns public.peminjaman language plpgsql security definer set search_path = public as $$
declare
  v_a   public.antrian;
  v_p   public.peminjaman;
  v_set public.pengaturan;
begin
  if not public.is_admin() then raise exception 'Hanya pustakawan.'; end if;

  select * into v_a from public.antrian where id = p_antrian_id for update;
  if not found then raise exception 'Antrian tidak ditemukan.'; end if;
  if v_a.status <> 'siap_diambil' then
    raise exception 'Antrian belum mendapat giliran (status: %).', v_a.status;
  end if;
  perform 1 from public.buku where id = v_a.buku_id for update;
  perform public._cek_anggota(v_a.anggota_id, v_a.buku_id, true);

  select * into v_set from public.pengaturan where id = 1;
  insert into public.peminjaman (anggota_id, buku_id, tgl_pinjam, tgl_jatuh_tempo, dicatat_oleh)
  values (v_a.anggota_id, v_a.buku_id, public.hari_ini(), public.hari_ini() + v_set.lama_pinjam, auth.uid())
  returning * into v_p;

  update public.antrian set status = 'selesai', selesai_at = now() where id = v_a.id;
  return v_p;
end $$;

-- PUSTAKAWAN: mencatat peminjaman langsung di meja layanan
create or replace function public.catat_peminjaman(p_anggota_id uuid, p_buku_id bigint)
returns public.peminjaman language plpgsql security definer set search_path = public as $$
declare
  v_antrian_id bigint;
  v_p   public.peminjaman;
  v_set public.pengaturan;
begin
  if not public.is_admin() then raise exception 'Hanya pustakawan.'; end if;
  perform 1 from public.buku where id = p_buku_id for update;
  if not found then raise exception 'Buku tidak ditemukan.'; end if;
  perform public.proses_kedaluwarsa();

  -- Jika anggota ini sudah mendapat giliran antrian untuk buku ini, pakai jalur antrian
  select id into v_antrian_id from public.antrian
    where anggota_id = p_anggota_id and buku_id = p_buku_id and status = 'siap_diambil';
  if v_antrian_id is not null then
    return public.serahkan_antrian(v_antrian_id);
  end if;

  perform public._cek_anggota(p_anggota_id, p_buku_id, true);
  if public._tersedia(p_buku_id) <= 0 then
    raise exception 'Tidak ada eksemplar tersedia (semua dipinjam atau disisihkan untuk antrian).';
  end if;

  select * into v_set from public.pengaturan where id = 1;
  insert into public.peminjaman (anggota_id, buku_id, tgl_pinjam, tgl_jatuh_tempo, dicatat_oleh)
  values (p_anggota_id, p_buku_id, public.hari_ini(), public.hari_ini() + v_set.lama_pinjam, auth.uid())
  returning * into v_p;

  -- Jika anggota ini juga sedang menunggu antrian buku yang sama, antriannya dianggap selesai
  update public.antrian set status = 'selesai', selesai_at = now()
    where anggota_id = p_anggota_id and buku_id = p_buku_id and status = 'menunggu';
  return v_p;
end $$;

-- PUSTAKAWAN: memproses pengembalian buku, menghitung denda, lalu memberi giliran ke antrian
create or replace function public.kembalikan_buku(p_peminjaman_id bigint)
returns public.peminjaman language plpgsql security definer set search_path = public as $$
declare
  v_p   public.peminjaman;
  v_set public.pengaturan;
begin
  if not public.is_admin() then raise exception 'Hanya pustakawan.'; end if;

  select * into v_p from public.peminjaman where id = p_peminjaman_id for update;
  if not found then raise exception 'Peminjaman tidak ditemukan.'; end if;
  if v_p.status <> 'dipinjam' then raise exception 'Buku ini sudah dikembalikan.'; end if;
  perform 1 from public.buku where id = v_p.buku_id for update;

  select * into v_set from public.pengaturan where id = 1;
  update public.peminjaman set
    status      = 'dikembalikan',
    tgl_kembali = public.hari_ini(),
    denda       = greatest(public.hari_ini() - tgl_jatuh_tempo, 0) * v_set.denda_per_hari
  where id = p_peminjaman_id
  returning * into v_p;

  perform public._promosikan_antrian(v_p.buku_id);
  return v_p;
end $$;

-- ANGGOTA / PUSTAKAWAN: memperpanjang masa pinjam
create or replace function public.perpanjang_peminjaman(p_peminjaman_id bigint)
returns public.peminjaman language plpgsql security definer set search_path = public as $$
declare
  v_p   public.peminjaman;
  v_set public.pengaturan;
begin
  select * into v_p from public.peminjaman where id = p_peminjaman_id for update;
  if not found or (v_p.anggota_id <> auth.uid() and not public.is_admin()) then
    raise exception 'Peminjaman tidak ditemukan.';
  end if;
  select * into v_set from public.pengaturan where id = 1;

  if v_p.status <> 'dipinjam' then
    raise exception 'Hanya peminjaman aktif yang bisa diperpanjang.';
  end if;
  if v_p.tgl_jatuh_tempo < public.hari_ini() then
    raise exception 'Peminjaman yang sudah terlambat tidak bisa diperpanjang.';
  end if;
  if v_p.jumlah_perpanjang >= v_set.maks_perpanjang then
    raise exception 'Batas perpanjangan sudah tercapai.';
  end if;
  if exists (select 1 from public.antrian where buku_id = v_p.buku_id and status = 'menunggu') then
    raise exception 'Tidak bisa diperpanjang karena ada anggota lain yang sedang mengantre buku ini.';
  end if;

  update public.peminjaman
    set tgl_jatuh_tempo = tgl_jatuh_tempo + v_set.lama_pinjam,
        jumlah_perpanjang = jumlah_perpanjang + 1
  where id = p_peminjaman_id
  returning * into v_p;
  return v_p;
end $$;

-- PUSTAKAWAN: mengubah peran pengguna (anggota <-> admin)
create or replace function public.ubah_role(p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Hanya pustakawan.'; end if;
  if p_role not in ('admin', 'anggota') then raise exception 'Peran tidak dikenal.'; end if;
  if p_user_id = auth.uid() and p_role <> 'admin' then
    raise exception 'Anda tidak dapat menurunkan peran akun sendiri.';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
end $$;

-- Hak eksekusi: fungsi internal tidak boleh dipanggil dari luar
revoke execute on function public._tersedia(bigint)                         from public, anon, authenticated;
revoke execute on function public._promosikan_antrian(bigint)               from public, anon, authenticated;
revoke execute on function public._cek_anggota(uuid, bigint, boolean)       from public, anon, authenticated;
revoke execute on function public.handle_new_user()                         from public, anon, authenticated;
revoke execute on function public._buku_jumlah_berubah()                    from public, anon, authenticated;
revoke execute on function public.ajukan_antrian(bigint)                    from public, anon;
revoke execute on function public.batalkan_antrian(bigint)                  from public, anon;
revoke execute on function public.serahkan_antrian(bigint)                  from public, anon;
revoke execute on function public.catat_peminjaman(uuid, bigint)            from public, anon;
revoke execute on function public.kembalikan_buku(bigint)                   from public, anon;
revoke execute on function public.perpanjang_peminjaman(bigint)             from public, anon;
revoke execute on function public.ubah_role(uuid, text)                     from public, anon;
grant  execute on function public.ajukan_antrian(bigint), public.batalkan_antrian(bigint),
  public.serahkan_antrian(bigint), public.catat_peminjaman(uuid, bigint), public.kembalikan_buku(bigint),
  public.perpanjang_peminjaman(bigint), public.ubah_role(uuid, text), public.proses_kedaluwarsa()
  to authenticated;

-- ---------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (siapa boleh membaca/mengubah apa)
-- ---------------------------------------------------------------------
alter table public.pengaturan enable row level security;
alter table public.profiles   enable row level security;
alter table public.kategori   enable row level security;
alter table public.buku       enable row level security;
alter table public.peminjaman enable row level security;
alter table public.antrian    enable row level security;

-- Pengaturan: semua boleh membaca, hanya pustakawan mengubah
drop policy if exists "pengaturan dibaca semua" on public.pengaturan;
create policy "pengaturan dibaca semua" on public.pengaturan for select using (true);
drop policy if exists "pengaturan diubah admin" on public.pengaturan;
create policy "pengaturan diubah admin" on public.pengaturan for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Profil: lihat milik sendiri (pustakawan melihat semua); ubah milik sendiri
drop policy if exists "profil dibaca" on public.profiles;
create policy "profil dibaca" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists "profil diubah" on public.profiles;
create policy "profil diubah" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
-- Kolom role/no_anggota/email tidak boleh diubah langsung (role hanya lewat fungsi ubah_role)
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (nama, no_hp, alamat) on public.profiles to authenticated;

-- Kategori & buku: publik boleh membaca, hanya pustakawan menulis
drop policy if exists "kategori dibaca semua" on public.kategori;
create policy "kategori dibaca semua" on public.kategori for select using (true);
drop policy if exists "kategori ditulis admin" on public.kategori;
create policy "kategori ditulis admin" on public.kategori for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "buku dibaca semua" on public.buku;
create policy "buku dibaca semua" on public.buku for select using (true);
drop policy if exists "buku ditulis admin" on public.buku;
create policy "buku ditulis admin" on public.buku for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Peminjaman & antrian: hanya bisa DIBACA (milik sendiri / semua untuk pustakawan).
-- Semua perubahan wajib lewat fungsi RPC di atas agar aturan selalu ditegakkan.
drop policy if exists "peminjaman dibaca" on public.peminjaman;
create policy "peminjaman dibaca" on public.peminjaman for select to authenticated
  using (anggota_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.peminjaman from anon, authenticated;

drop policy if exists "antrian dibaca" on public.antrian;
create policy "antrian dibaca" on public.antrian for select to authenticated
  using (anggota_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.antrian from anon, authenticated;

grant select on public.buku_status to anon, authenticated;
grant select on public.peminjaman_detail, public.antrian_detail to authenticated;
revoke all on public.peminjaman_detail, public.antrian_detail from anon;

-- ---------------------------------------------------------------------
-- 9. STORAGE: bucket untuk gambar cover buku
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('cover', 'cover', true)
on conflict (id) do nothing;

drop policy if exists "cover dibaca publik" on storage.objects;
create policy "cover dibaca publik" on storage.objects for select
  using (bucket_id = 'cover');
drop policy if exists "cover diunggah admin" on storage.objects;
create policy "cover diunggah admin" on storage.objects for insert to authenticated
  with check (bucket_id = 'cover' and public.is_admin());
drop policy if exists "cover diubah admin" on storage.objects;
create policy "cover diubah admin" on storage.objects for update to authenticated
  using (bucket_id = 'cover' and public.is_admin());
drop policy if exists "cover dihapus admin" on storage.objects;
create policy "cover dihapus admin" on storage.objects for delete to authenticated
  using (bucket_id = 'cover' and public.is_admin());

-- ---------------------------------------------------------------------
-- 10. LOGIN PUSTAKAWAN DENGAN NAMA PENGGUNA (sama dengan migrasi-01-username-admin.sql)
-- ---------------------------------------------------------------------
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
