import "server-only";

/**
 * Klien API "Buku Indonesia" (https://github.com/khrlanamm/buku-indonesia), data berlisensi CC0.
 * Catatan: API ini TIDAK menyediakan sinopsis dan jumlah eksemplar.
 * Cover di-host oleh Open Library.
 */
export const BI_BASE = "https://khrlanamm.github.io/buku-indonesia/api/v1";

export const BI_KATEGORI = [
  "Novel", "Sastra Klasik", "Remaja", "Puisi", "Kumpulan Cerpen", "Sejarah", "Biografi", "Agama",
  "Pengembangan Diri", "Sains", "Bisnis", "Komik", "Anak", "Nonfiksi Umum", "Lainnya",
] as const;

/** Baris ringkas dari search-index.json (kunci disingkat oleh API) */
interface BarisIndeksMentah {
  i: string; // id
  t: string; // judul
  s: string | null; // subjudul
  a: string[] | null; // pengarang
  p: string | null; // penerbit
  y: number | null; // tahun
  b: string | null; // ISBN-13
  c: string[] | null; // kategori
  r: boolean; // reviewed (sudah dikurasi)
  v: number | null; // id cover Open Library
}

export interface BarisIndeks {
  id: string;
  judul: string;
  subjudul: string | null;
  pengarang: string[];
  penerbit: string | null;
  tahun: number | null;
  isbn: string | null;
  kategori: string[];
  dikurasi: boolean;
  coverKecil: string | null;
}

/** Objek lengkap dari books/{id}.json */
export interface BukuAPI {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[] | null;
  publisher: string | null;
  year: number | null;
  isbn13: string | null;
  isbn10?: string | null;
  pages: number | null;
  categories: string[] | null;
  coverUrl?: string | null;
  openLibrary?: { coverId?: number | null } | null;
}

/** Seluruh indeks (±3.000 judul, ±600 KB), di-cache 1 hari oleh Next.js */
export async function ambilIndeks(): Promise<BarisIndeks[]> {
  const res = await fetch(`${BI_BASE}/search-index.json`, {
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`API Buku Indonesia membalas ${res.status}`);
  const mentah = (await res.json()) as BarisIndeksMentah[];
  return mentah.map((r) => ({
    id: r.i,
    judul: r.t,
    subjudul: r.s ?? null,
    pengarang: r.a ?? [],
    penerbit: r.p ?? null,
    tahun: r.y ?? null,
    isbn: r.b ?? null,
    kategori: r.c ?? [],
    dikurasi: Boolean(r.r),
    coverKecil: typeof r.v === "number" ? `https://covers.openlibrary.org/b/id/${r.v}-S.jpg` : null,
  }));
}

export async function ambilBuku(id: string): Promise<BukuAPI | null> {
  if (!/^bk_[a-z0-9]+$/i.test(id)) return null;
  const res = await fetch(`${BI_BASE}/books/${id}.json`, {
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  return (await res.json()) as BukuAPI;
}

/** Ubah data API menjadi baris tabel buku perpustakaan */
export function keBaris(b: BukuAPI, jumlah: number, kategoriId: number | null) {
  const judul = b.subtitle ? `${b.title}: ${b.subtitle}` : b.title;
  const coverId = b.openLibrary?.coverId;
  // "-L" = ukuran besar; "?default=false" agar cover yang tidak ada menghasilkan 404 (lalu diganti sampul otomatis)
  const cover =
    typeof coverId === "number"
      ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg?default=false`
      : b.coverUrl
        ? b.coverUrl.replace(/-[SM]\.jpg$/, "-L.jpg")
        : null;
  return {
    sumber_id: b.id,
    judul: judul.slice(0, 500),
    pengarang: b.authors?.length ? b.authors.join(", ") : null,
    penerbit: b.publisher ?? null,
    tahun_terbit: typeof b.year === "number" ? b.year : null,
    isbn: b.isbn13 ?? b.isbn10 ?? null,
    halaman: typeof b.pages === "number" ? b.pages : null,
    cover_url: cover,
    kategori_id: kategoriId,
    jumlah,
    sinopsis: null as string | null,
  };
}
