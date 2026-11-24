# 📚 Perpustakaan Digital: Katalog, Sirkulasi & Antrian Peminjaman

Aplikasi web perpustakaan berbasis **Next.js 16** + **Supabase** (database, login, penyimpanan cover),
disimpan di **GitHub** dan di-deploy ke **Vercel**.

## Fitur

**Halaman depan (publik)**
- Koleksi buku dengan **cover, sinopsis, kategori**, pencarian, dan filter.
- **Status peminjaman** tiap buku: tersedia X dari Y, atau sedang dipinjam beserta perkiraan tanggal kembali dan jumlah orang yang mengantre.

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
- Kelola **buku** (upload cover ke Supabase Storage), **kategori**, dan **anggota** (termasuk menjadikan seseorang pustakawan).
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
                                                            └─ Storage    (bucket "cover")
GitHub ── push ──► Vercel otomatis build & deploy ulang
```

| Folder | Isi |
|---|---|
| `supabase/schema.sql` | Seluruh skema database: tabel, view, fungsi, RLS, dan bucket storage |
| `supabase/seed.sql` | Contoh kategori & 8 buku |
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
| Upload cover gagal | Pastikan bagian Storage di `schema.sql` ikut dijalankan (bucket `cover`) dan akun Anda berperan admin. Ukuran maksimal 2 MB. |
| Tidak muncul menu Panel Pustakawan | Jalankan SQL di Langkah 5, lalu keluar dan masuk lagi. |
| Gagal masuk dengan nama pengguna | Jalankan `supabase/perbaiki-akun-admin.sql` (Langkah 1 untuk diagnosis, Langkah 2 untuk perbaikan). Pesan error di halaman Masuk menunjukkan penyebabnya. |
| “Nama pengguna atau password salah” padahal benar | Pastikan akun berperan `admin` dan kolom `username` terisi (cek di Table Editor → profiles). Jika database dibuat sebelum fitur ini, jalankan `migrasi-01-username-admin.sql`. |
| Ganti password gagal “reauthentication” | Di Supabase: Authentication → Sign In / Providers → Email → matikan **Secure password change**, atau keluar lalu masuk kembali. |
