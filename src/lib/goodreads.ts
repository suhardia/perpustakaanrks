/**
 * Membaca file ekspor Goodreads ("goodreads_library_export.csv").
 * Hanya DATA BUKU yang diambil: judul, pengarang, penerbit, tahun, ISBN, halaman, jumlah dimiliki.
 * Rating, ulasan, tanggal baca, dan catatan pribadi diabaikan.
 * Dipakai di browser (pratinjau) dan di server (validasi ulang sebelum disimpan).
 */

export interface BukuGoodreads {
  grId: string; // "Book Id" Goodreads, disimpan sebagai sumber_id "gr_<id>" agar tidak terimpor ganda
  judul: string;
  pengarang: string | null;
  penerbit: string | null;
  tahun: number | null;
  isbn: string | null; // ISBN-13 bila ada, jika tidak ISBN-10
  halaman: number | null;
  dimiliki: number; // kolom "Owned Copies"
  rak: string; // "Exclusive Shelf": read / to-read / currently-reading / lainnya (hanya untuk menyaring)
}

/** Parser CSV sederhana yang mendukung tanda kutip, koma, dan baris baru di dalam kutipan */
export function parseCsv(teks: string): string[][] {
  const baris: string[][] = [];
  let sel = "";
  let barisIni: string[] = [];
  let dalamKutip = false;
  const s = teks.replace(/^﻿/, "");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (dalamKutip) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          sel += '"';
          i++;
        } else dalamKutip = false;
      } else sel += c;
    } else if (c === '"') dalamKutip = true;
    else if (c === ",") {
      barisIni.push(sel);
      sel = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      barisIni.push(sel);
      if (barisIni.some((x) => x !== "")) baris.push(barisIni);
      barisIni = [];
      sel = "";
    } else sel += c;
  }
  barisIni.push(sel);
  if (barisIni.some((x) => x !== "")) baris.push(barisIni);
  return baris;
}

/** Periksa digit kontrol ISBN agar nomor rusak (mis. 0000020499390) tidak tersimpan */
export function isbnValid(x: string): boolean {
  if (/^97[89]\d{10}$/.test(x)) {
    const jumlah = [...x].reduce((s, d, i) => s + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
    return jumlah % 10 === 0;
  }
  if (/^\d{9}[\dX]$/.test(x)) {
    const jumlah = [...x].reduce((s, d, i) => s + (d === "X" ? 10 : Number(d)) * (10 - i), 0);
    return jumlah % 11 === 0;
  }
  return false;
}

/** Goodreads menulis ISBN sebagai ="9789793062792"; ambil angkanya saja, lalu periksa keabsahannya */
function bersihIsbn(v: string | undefined): string | null {
  const x = (v ?? "").replace(/[^0-9Xx]/g, "").toUpperCase();
  return isbnValid(x) ? x : null;
}

function angka(v: string | undefined, min: number, max: number): number | null {
  const n = Number(String(v ?? "").trim());
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

function teks(v: string | undefined, maks = 300): string | null {
  const x = (v ?? "").replace(/\s+/g, " ").trim();
  return x ? x.slice(0, maks) : null;
}

/** Hapus keterangan seri di akhir judul, mis. "Bumi Manusia (Tetralogi Buru, #1)" → "Bumi Manusia" */
export function rapikanJudul(judul: string): string {
  return judul.replace(/\s*\([^()]*#\d+(?:\.\d+)?\)\s*$/, "").trim() || judul;
}

export type HasilBaca = { ok: true; buku: BukuGoodreads[] } | { ok: false; pesan: string };

/** Ubah isi file CSV menjadi daftar buku. */
export function bacaGoodreads(isiFile: string): HasilBaca {
  const baris = parseCsv(isiFile);
  if (baris.length < 2) return { ok: false, pesan: "File kosong atau bukan CSV." };

  const kepala = baris[0].map((h) => h.trim());
  const kol = (nama: string) => kepala.indexOf(nama);
  const iId = kol("Book Id");
  const iJudul = kol("Title");
  if (iId < 0 || iJudul < 0 || kol("Author") < 0) {
    return {
      ok: false,
      pesan: "Ini bukan file ekspor Goodreads. Gunakan file dari Goodreads → My Books → Import and export → Export Library.",
    };
  }

  const ambil = (r: string[], nama: string) => {
    const i = kol(nama);
    return i >= 0 ? r[i] : undefined;
  };

  const buku: BukuGoodreads[] = [];
  for (const r of baris.slice(1)) {
    const grId = (r[iId] ?? "").trim();
    const judul = teks(r[iJudul], 500);
    if (!/^\d+$/.test(grId) || !judul) continue;
    buku.push({
      grId,
      judul,
      pengarang: teks(ambil(r, "Author"), 200),
      penerbit: teks(ambil(r, "Publisher"), 200),
      tahun: angka(ambil(r, "Year Published"), 1000, 2100) ?? angka(ambil(r, "Original Publication Year"), 1000, 2100),
      isbn: bersihIsbn(ambil(r, "ISBN13")) ?? bersihIsbn(ambil(r, "ISBN")),
      halaman: angka(ambil(r, "Number of Pages"), 1, 20000),
      dimiliki: angka(ambil(r, "Owned Copies"), 0, 10000) ?? 0,
      rak: teks(ambil(r, "Exclusive Shelf"), 50) ?? "lainnya",
    });
  }
  if (buku.length === 0) return { ok: false, pesan: "Tidak ada data buku yang terbaca di file ini." };
  return { ok: true, buku };
}

/** Link cover Open Library berdasarkan ISBN (hanya teks link yang disimpan) */
export function coverDariIsbn(isbn: string | null): string | null {
  return isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false` : null;
}

/** Baris yang dikirim dari pratinjau ke server */
export interface KirimanGoodreads extends BukuGoodreads {
  jumlah: number;
}

/** Validasi ulang di server: data dari browser tidak dipercaya begitu saja */
export function validasiKiriman(x: unknown): KirimanGoodreads | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const str = (v: unknown, maks: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, maks) : null);
  const int = (v: unknown, min: number, max: number) =>
    typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null;

  const grId = typeof o.grId === "string" && /^\d{1,15}$/.test(o.grId) ? o.grId : null;
  const judul = str(o.judul, 500);
  const jumlah = int(o.jumlah, 0, 10000);
  if (!grId || !judul || jumlah === null) return null;
  const isbn = typeof o.isbn === "string" && isbnValid(o.isbn) ? o.isbn : null;

  return {
    grId,
    judul,
    pengarang: str(o.pengarang, 200),
    penerbit: str(o.penerbit, 200),
    tahun: int(o.tahun, 1000, 2100),
    isbn,
    halaman: int(o.halaman, 1, 20000),
    dimiliki: int(o.dimiliki, 0, 10000) ?? 0,
    rak: str(o.rak, 50) ?? "lainnya",
    jumlah,
  };
}
