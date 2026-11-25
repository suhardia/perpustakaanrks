-- =====================================================================
--  MIGRASI 02: Impor katalog dari API "Buku Indonesia"
--  (https://khrlanamm.github.io/buku-indonesia/, data CC0)
--  Jalankan sekali di Supabase -> SQL Editor jika database dibuat sebelum fitur ini.
--  Untuk instalasi baru, isi file ini sudah termasuk di akhir schema.sql.
-- =====================================================================

-- ID buku di API sumber (mis. bk_b4a005e3558d0371), mencegah impor ganda
alter table public.buku add column if not exists sumber_id text;
create unique index if not exists buku_sumber_id_unik on public.buku (sumber_id);

-- Jumlah halaman (tersedia dari API)
alter table public.buku add column if not exists halaman int;

-- Tampilkan kolom baru di view katalog (ditambahkan di akhir agar kompatibel)
create or replace view public.buku_status as
select
  b.id, b.kategori_id, b.judul, b.pengarang, b.penerbit, b.tahun_terbit, b.isbn,
  b.rak, b.jumlah, b.sinopsis, b.cover_url, b.created_at,
  k.nama                                   as kategori_nama,
  coalesce(p.dipinjam, 0)::int             as dipinjam,
  coalesce(a.dipesan, 0)::int              as dipesan,      -- disisihkan untuk antrian
  coalesce(a.menunggu, 0)::int             as antrian,      -- jumlah orang menunggu
  greatest(b.jumlah - coalesce(p.dipinjam, 0) - coalesce(a.dipesan, 0), 0)::int as tersedia,
  p.kembali_terdekat,
  b.halaman,
  b.sumber_id
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
grant select on public.buku_status to anon, authenticated;

notify pgrst, 'reload schema';
