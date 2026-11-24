-- =====================================================================
--  DATA CONTOH (opsional). Jalankan setelah schema.sql.
--  Cover bisa diunggah nanti lewat menu Pustakawan -> Buku.
-- =====================================================================

insert into public.kategori (nama) values
  ('Fiksi'), ('Komputer'), ('Sains'), ('Sejarah'), ('Pengembangan Diri')
on conflict (nama) do nothing;

insert into public.buku (kategori_id, judul, pengarang, penerbit, tahun_terbit, isbn, rak, jumlah, sinopsis)
select k.id, b.judul, b.pengarang, b.penerbit, b.tahun, b.isbn, b.rak, b.jumlah, b.sinopsis
from (values
  ('Fiksi', 'Laskar Pelangi', 'Andrea Hirata', 'Bentang Pustaka', 2005, '9789793062792', 'A1', 2,
   'Kisah sepuluh anak dari keluarga sederhana di Belitung yang bersekolah di SD Muhammadiyah yang hampir ditutup. Dengan semangat guru-guru mereka, Bu Mus dan Pak Harfan, mereka menemukan arti persahabatan, mimpi, dan perjuangan meraih pendidikan.'),
  ('Fiksi', 'Bumi Manusia', 'Pramoedya Ananta Toer', 'Lentera Dipantara', 2005, '9789799731234', 'A1', 1,
   'Minke, pemuda pribumi yang bersekolah di HBS pada akhir abad ke-19, jatuh cinta pada Annelies dan berhadapan dengan ketidakadilan hukum kolonial. Roman pertama Tetralogi Buru tentang kebangkitan kesadaran sebuah bangsa.'),
  ('Fiksi', 'Negeri 5 Menara', 'Ahmad Fuadi', 'Gramedia Pustaka Utama', 2009, '9789792248616', 'A2', 2,
   'Alif meninggalkan kampung halamannya di Maninjau untuk belajar di Pondok Madani. Bersama lima sahabatnya yang gemar berkumpul di bawah menara masjid, ia belajar bahwa "man jadda wajada": siapa yang bersungguh-sungguh akan berhasil.'),
  ('Komputer', 'Belajar Next.js dari Nol', 'Tim Penulis', 'Informatika', 2025, '9786230012341', 'B1', 3,
   'Panduan praktis membangun aplikasi web modern dengan Next.js: routing, server components, server actions, autentikasi, hingga deploy ke Vercel.'),
  ('Komputer', 'Basis Data PostgreSQL', 'Tim Penulis', 'Andi Offset', 2024, '9789792912345', 'B2', 2,
   'Mempelajari perancangan tabel, relasi, query SQL, view, fungsi, dan keamanan baris (row level security) dengan PostgreSQL, termasuk pemakaian di Supabase.'),
  ('Sains', 'Kosmos Sederhana', 'Tim Penulis', 'Erlangga', 2022, '9786022981234', 'C1', 1,
   'Pengantar astronomi yang ramah pembaca: dari tata surya, bintang, galaksi, hingga asal-usul alam semesta, disertai ilustrasi dan aktivitas pengamatan langit malam.'),
  ('Sejarah', 'Sejarah Indonesia Modern', 'M.C. Ricklefs', 'Serambi', 2008, '9789790241234', 'D1', 1,
   'Menelusuri sejarah Indonesia sejak kedatangan Islam sekitar tahun 1200 hingga era reformasi, mencakup masa kerajaan, kolonialisme, pergerakan nasional, dan kemerdekaan.'),
  ('Pengembangan Diri', 'Kebiasaan Kecil, Hasil Besar', 'Tim Penulis', 'Gramedia', 2023, '9786020000001', 'E1', 2,
   'Bagaimana perubahan kecil yang dilakukan terus-menerus dapat menghasilkan perbedaan besar. Berisi strategi membangun kebiasaan baik dan menghentikan kebiasaan buruk.')
) as b(kategori, judul, pengarang, penerbit, tahun, isbn, rak, jumlah, sinopsis)
join public.kategori k on k.nama = b.kategori
on conflict (isbn) do nothing;
