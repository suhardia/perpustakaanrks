# 📚 Perpustakaan Digital: Katalog, Sirkulasi & Antrian Peminjaman

Aplikasi web perpustakaan berbasis **Next.js 16** + **Supabase** (database, login, penyimpanan cover),
disimpan di **GitHub** dan di-deploy ke **Vercel**.

## Fitur

**Halaman depan (publik)**
- Koleksi buku dengan **cover, sinopsis, kategori**, pencarian, dan filter.
- **Status peminjaman** tiap buku: tersedia X dari Y, atau sedang dipinjam beserta perkiraan tanggal kembali dan jumlah orang yang mengantre.

- **Quote acak** di halaman depan, diambil dari [Quotes Indonesia](https://quotes.liupurnomo.com) (bahasa Indonesia)
  atau [Recite](https://recite-flax.vercel.app) (kutipan buku, bahasa Inggris). Jika satu API gagal, otomatis memakai
  yang lain; jika keduanya gagal, kartu quote disembunyikan.

**Anggota**
- Daftar dan masuk sendiri; nomor anggota (mis. `AGT00012`) dibuat otomatis.
- **Ajukan pinjam**: jika buku tersedia, eksemplar langsung disisihkan untuk diambil di meja pustakawan.
- **Masuk antrian**: jika buku sedang dipinjam semua. Saat buku dikembalikan, antrian terdepan otomatis
  menjadi **“siap diambil”**. Jika tidak diambil dalam batas waktu (bawaan 2 hari), giliran pindah ke antrian berikutnya.
- Halaman **Akun Saya**: kartu anggota digital, buku siap diambil, pinjaman aktif + denda berjalan, posisi antrian,
  perpanjangan, dan riwayat.

**Admin/Pustakawan**
- Masuk dengan **nama pengguna + password** (bisa diatur di menu *Akun Saya*).
- Dashboard: statistik, buku siap diambil, dan daftar keterlambatan.
- **Sirkulasi**: catat peminjaman di meja layanan, pengembalian (denda dihitung otomatis), dan perpanjangan.
- **Antrian**: serahkan buku ke anggota yang mendapat giliran, atau batalkan antrian.
- **Impor Katalog** dari API [Buku Indonesia](https://github.com/khrlanamm/buku-indonesia) (±3.000 judul, data CC0):
  cari, centang buku yang dimiliki, isi **jumlah eksemplar**, lalu impor. Judul, pengarang, penerbit, tahun, ISBN,
  kategori, halaman, dan cover (Open Library) terisi otomatis. API ini tidak menyediakan sinopsis, jadi isi manual.
- **Impor Goodreads**: upload file ekspor Goodreads (`goodreads_library_export.csv`), pilih rak dan buku, isi jumlah
  eksemplar, lalu impor. Hanya data buku yang diambil; buku yang sudah ada dilewati sehingga aman diimpor ulang.
- Kelola **buku**. Cover cukup berupa **link Google Drive** (atau URL gambar lain); yang tersimpan di database hanya
  teks link, tanpa upload file. Ada pratinjau langsung di form. **kategori**, dan **anggota** (termasuk menjadikan seseorang pustakawan).
- **Laporan** per periode, buku terpopuler, dan ekspor CSV untuk Excel.
- **Pengaturan**: lama pinjam, denda, batas pinjam/antrian, batas waktu pengambilan, dan zona waktu.

Semua aturan sirkulasi dijalankan **di database** (fungsi PostgreSQL + Row Level Security), sehingga aman
walaupun ada yang mencoba memanggil API secara langsung.

---

## Arsitektur

```
Browser ──► Vercel (Next.js: halaman + Server Actions) ──► Supabase
                                                            ├─ Auth       (login anggota & pustakawan)
                                                            ├─ PostgreSQL (tabel, view, fungsi antrian, RLS)
Cover buku ─► link Google Drive (dibagikan "Siapa saja yang memiliki link"), hanya teks link yang disimpan
GitHub ── push ──► Vercel otomatis build & deploy ulang
```

| Folder | Isi |
|---|---|
| `supabase/schema.sql` | Seluruh skema database: tabel, view, fungsi, RLS, dan bucket storage |
| `supabase/seed.sql` | Contoh kategori & 8 buku |
| `supabase/migrasi-02-impor-buku.sql` | Kolom tambahan untuk fitur Impor Katalog (untuk database lama) |
| `src/lib/goodreads.ts` | Pembaca file ekspor Goodreads & validasi ISBN |
| `src/lib/bukuIndonesia.ts` | Klien API Buku Indonesia & pemetaan ke tabel buku |
| `src/app/api/quote/route.ts` | Proksi quote acak (Quotes Indonesia / Recite) |
| `supabase/perbaiki-fungsi-login.sql` | Memperbaiki fungsi login nama pengguna (izin & cache API) |
| `supabase/perbaiki-akun-admin.sql` | Diagnosis & perbaikan akun pustakawan yang tidak bisa masuk |
| `supabase/migrasi-01-username-admin.sql` | Tambahan login pustakawan dengan nama pengguna (untuk database lama) |
| `src/app/` | Halaman: beranda, detail buku, masuk/daftar, akun, admin |
| `src/app/actions/` | Server Actions (pinjam, antre, kembalikan, simpan buku, …) |
| `src/lib/` | Klien Supabase, tipe data, helper format |
| `src/proxy.ts` | Menjaga sesi login & melindungi `/akun` dan `/admin` |

---

## Langkah 1: Siapkan Supabase

1. Buat akun di **https://supabase.com**, lalu klik **New project**. Pilih region **Southeast Asia (Singapore)** dan simpan password database.
2. Buka **SQL Editor → New query**, tempel seluruh isi **`supabase/schema.sql`**, lalu klik **Run**.
3. (Opsional) Buat query baru, tempel isi **`supabase/seed.sql`**, lalu **Run** untuk mengisi buku contoh.
4. Buka **Project Settings → API** (atau tombol **Connect** di atas). Catat:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable key** (atau *anon public key* di proyek lama) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
     (atau `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
5. **Authentication → Sign In / Providers → Email**:
   - Untuk tahap uji coba, Anda boleh mematikan **Confirm email** supaya anggota bisa langsung masuk setelah daftar.
   - Untuk produksi, biarkan menyala (anggota harus mengklik tautan konfirmasi di email).

> Jangan pernah memasukkan **service_role / secret key** ke aplikasi ini. Kunci itu tidak diperlukan.

## Langkah 2: Jalankan di komputer (opsional, untuk uji)

Butuh **Node.js 20.9+**.

```bash
npm install
cp .env.example .env.local     # lalu isi URL dan key dari Langkah 1
npm run dev
```

Buka http://localhost:3000.

## Langkah 3: Upload ke GitHub

1. Buat repository baru di **https://github.com/new** (mis. `perpustakaan-web`). Boleh *Private*, tanpa README.
2. Di folder project:
   ```bash
   git remote add origin https://github.com/USERNAME/perpustakaan-web.git
   git branch -M main
   git push -u origin main
   ```
   (Commit pertama sudah disiapkan di paket ini. File `.env.local` tidak ikut ter-upload karena ada di `.gitignore`.)

## Langkah 4: Deploy ke Vercel

1. Masuk ke **https://vercel.com** dengan akun GitHub → **Add New… → Project**.
2. Pilih repository `perpustakaan-web` → **Import**. Framework otomatis terdeteksi sebagai *Next.js*.
3. Buka **Environment Variables** dan tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (atau `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Klik **Deploy**. Setelah selesai, Anda mendapat alamat seperti `https://perpustakaan-web.vercel.app`.
5. Kembali ke Supabase → **Authentication → URL Configuration**:
   - **Site URL**: `https://perpustakaan-web.vercel.app`
   - **Redirect URLs**: tambahkan `https://perpustakaan-web.vercel.app/auth/callback` dan `http://localhost:3000/auth/callback`

Setiap `git push` ke branch `main` akan otomatis di-deploy ulang oleh Vercel.

## Langkah 5: Buat akun Pustakawan (login dengan nama pengguna + password)

Pustakawan masuk memakai **nama pengguna + password**, sedangkan anggota memakai **email + password**.
Keduanya lewat halaman **Masuk** yang sama.

> Supabase Auth tetap membutuhkan email untuk setiap akun. Nama pengguna hanyalah “alias” yang dipetakan ke
> email akun pustakawan, jadi email tetap diisi saat membuat akun.

**Pustakawan pertama:**
1. Buat akunnya dengan salah satu cara berikut:
   - lewat website: klik **Daftar Anggota**, atau
   - di Supabase: **Authentication → Users → Add user → Create new user**. Isi email dan password, lalu centang **Auto Confirm User**.
2. Di Supabase **SQL Editor**, jadikan akun itu pustakawan sekaligus beri nama pengguna:
   ```sql
   update public.profiles
   set role = 'admin', username = 'admin'
   where email = 'email-anda@contoh.com';
   ```
3. Buka website → **Masuk** → isi nama pengguna `admin` dan password akun tersebut.

**Pustakawan berikutnya:** buka **Panel Pustakawan → Anggota**, klik **Jadikan pustakawan** pada orangnya, lalu
isi kolom **Nama pengguna**.

**Mengubah nama pengguna atau password sendiri:** buka **Panel Pustakawan → Akun Saya**.

Aturan nama pengguna: 3–30 karakter (huruf, angka, titik, garis bawah, tanpa spasi). Huruf besar dan kecil dianggap
sama. Hanya akun berperan pustakawan yang bisa masuk memakai nama pengguna.

**Sudah menjalankan `schema.sql` versi sebelumnya?** Jalankan juga `supabase/migrasi-01-username-admin.sql` sekali di
SQL Editor.

---

## Cover buku dari Google Drive

Cover **tidak di-upload** ke Supabase; database hanya menyimpan teks link-nya, sehingga kapasitas database tetap kecil.

1. Upload gambar cover ke Google Drive (sebaiknya satu folder khusus, mis. "Cover Perpustakaan").
2. Klik kanan file gambar → **Bagikan** → *Akses umum* ubah menjadi **“Siapa saja yang memiliki link” (Pelihat)**.
   Cara cepat: bagikan **folder**-nya seperti itu, maka semua gambar di dalamnya ikut terbuka.
3. Klik kanan file → **Bagikan → Salin link**, lalu tempel di kolom **Link cover** pada form buku. Pratinjau akan muncul.
4. Klik **Simpan**.

Bentuk link yang diterima: `https://drive.google.com/file/d/ID/view?usp=sharing`, `…/open?id=ID`, `…/uc?id=ID`,
atau link gambar biasa (`https://…/gambar.jpg`). **Link folder** dan **link Google Docs** ditolak.
Aplikasi mengubah link share menjadi alamat gambar (`drive.google.com/thumbnail?id=…`, cadangan
`lh3.googleusercontent.com/d/…`). Jika keduanya gagal, misalnya karena file belum dibagikan untuk umum, sampul berwarna
otomatis yang ditampilkan.

Tips: gunakan gambar JPG sekitar 600×900 piksel (di bawah 300 KB) agar halaman cepat dimuat. Buku hasil **Impor
Katalog** juga hanya menyimpan link cover (dari Open Library).

Cover lama yang pernah di-upload ke Supabase Storage tetap tampil. Untuk mengosongkan Storage, ganti cover buku
tersebut dengan link Google Drive, lalu hapus file di Supabase → **Storage → cover**.

## Mengimpor koleksi dari Goodreads

Cocok bila daftar buku TBM dicatat di Goodreads.

1. **Di Goodreads:** tambahkan buku yang dimiliki TBM ke rak (shelf) Anda. Agar jumlah eksemplar ikut terbawa, isi
   **“Owned copies”** di halaman buku (My Books → klik buku → *I own a copy*); jika kosong, dipakai “Jumlah bawaan”.
2. Ekspor: **My Books → Import and export → Export Library**, lalu unduh `goodreads_library_export.csv`.
3. Di aplikasi: **Panel Pustakawan → Impor Goodreads**, pilih file tersebut.
4. Centang **rak** yang berisi buku milik TBM (biasanya bukan `to-read`), periksa daftar, ubah jumlah per buku bila
   perlu, lalu klik **Impor ke Koleksi**.

Yang diambil hanya data buku: judul, pengarang, penerbit, tahun, ISBN (yang rusak dibuang), halaman, dan jumlah
dimiliki. Rating, ulasan, dan tanggal baca diabaikan. Data tambahan yang diisi otomatis:
- **Cover** berupa link Open Library berdasarkan ISBN; jika tidak ada, dipakai sampul otomatis.
- **Kategori** diambil dari data Buku Indonesia bila ISBN cocok; sisanya mengikuti pilihan kategori cadangan.
- **Sinopsis** tetap diisi manual.

Buku yang sudah ada (ID Goodreads atau ISBN sama) dilewati. Jadi setelah menambah buku di Goodreads, cukup ekspor
lagi dan impor ulang: hanya buku baru yang masuk.

Edisi berbeda dari judul yang sama (mis. dua edisi *The Kite Runner*) diimpor sebagai dua buku. Hapus atau gabungkan
lewat menu Buku bila perlu.

## Mengisi katalog dari API Buku Indonesia

1. Jika database dibuat sebelum fitur ini, jalankan sekali `supabase/migrasi-02-impor-buku.sql` di SQL Editor.
2. Masuk sebagai pustakawan → **Panel Pustakawan → Impor Katalog**.
3. Cari judul atau pengarang (atau saring per kategori), lalu centang buku yang **benar-benar dimiliki** perpustakaan.
4. Isi kolom **Jumlah eks.** per buku (kosong = memakai “Jumlah bawaan”), lalu klik **Impor yang dicentang**
   (maksimal 60 judul per impor).
5. Buku yang sudah ada (ID sumber atau ISBN sama) otomatis dilewati dan ditandai ✓.
6. Lengkapi **sinopsis** lewat menu **Buku → Ubah**, karena API tidak menyediakannya.

Di halaman depan, buku yang punya eksemplar bebas ditandai **“Tersedia X dari Y”**. Buku yang semua eksemplarnya
dipinjam ditandai **“Sedang dipinjam”** dan bisa diantre. Buku dengan jumlah 0 ditandai **“Belum ada eksemplar”**.

## Alur antrian peminjaman

```
Anggota klik "Ajukan Pinjam" / "Masuk Antrian"
        │
        ├─ ada eksemplar bebas & tidak ada yang menunggu ─► SIAP DIAMBIL (eksemplar disisihkan, batas ambil N hari)
        └─ semua dipinjam ──────────────────────────────► MENUNGGU (posisi ke-1, ke-2, …)

Pustakawan memproses pengembalian ─► antrian terdepan otomatis menjadi SIAP DIAMBIL
Anggota datang → Pustakawan klik "Serahkan" ─► tercatat sebagai PEMINJAMAN (jatuh tempo otomatis)
Tidak diambil sampai batas ─► KEDALUWARSA, giliran pindah ke antrian berikutnya
```

Aturan tambahan:
- Perpanjangan ditolak jika ada orang lain yang mengantre buku tersebut.
- Anggota yang masih punya buku terlambat tidak bisa meminjam atau mengantre sampai buku itu dikembalikan.
- Menambah jumlah eksemplar otomatis memberi giliran ke antrian.

Pengecekan antrian yang kedaluwarsa berjalan otomatis setiap kali panel pustakawan dibuka atau ada anggota mengantre.
Jika ingin berjalan terjadwal, aktifkan ekstensi **pg_cron** di Supabase lalu jalankan:
```sql
select cron.schedule('antrian-kedaluwarsa', '0 * * * *', $$select public.proses_kedaluwarsa()$$);
```

## Masalah yang sering muncul

| Gejala | Solusi |
|---|---|
| Banner kuning “Supabase belum dihubungkan” | Environment variable belum diisi di `.env.local` atau Vercel. Setelah mengisi di Vercel, lakukan **Redeploy**. |
| Daftar berhasil tetapi tidak bisa masuk | Email belum dikonfirmasi. Klik tautan di email, atau matikan *Confirm email* (Langkah 1.5). |
| Tautan konfirmasi email membuka `localhost` | Atur **Site URL** dan **Redirect URLs** di Supabase (Langkah 4.5). |
| Cover Google Drive tidak tampil (yang muncul sampul berwarna) | File belum dibagikan “Siapa saja yang memiliki link”, atau link yang ditempel adalah link folder. Buka link itu di jendela *incognito*; jika diminta login, berarti belum dibagikan untuk umum. |
| Tidak muncul menu Panel Pustakawan | Jalankan SQL di Langkah 5, lalu keluar dan masuk lagi. |
| “API Supabase belum mengenali fungsi email_untuk_login” | Jalankan `supabase/perbaiki-fungsi-login.sql`. Pastikan juga `NEXT_PUBLIC_SUPABASE_URL` di Vercel sama dengan Project URL proyek Supabase tempat SQL dijalankan. |
| Gagal masuk dengan nama pengguna | Jalankan `supabase/perbaiki-akun-admin.sql` (Langkah 1 untuk diagnosis, Langkah 2 untuk perbaikan). Pesan error di halaman Masuk menunjukkan penyebabnya. |
| “Nama pengguna atau password salah” padahal benar | Pastikan akun berperan `admin` dan kolom `username` terisi (cek di Table Editor → profiles). Jika database dibuat sebelum fitur ini, jalankan `migrasi-01-username-admin.sql`. |
| Ganti password gagal “reauthentication” | Di Supabase: Authentication → Sign In / Providers → Email → matikan **Secure password change**, atau keluar lalu masuk kembali. |
