/**
 * Cover buku disimpan sebagai TEKS LINK saja (tidak ada file yang di-upload ke database/storage).
 * Mendukung link share Google Drive ("Siapa saja yang memiliki link") dan link gambar biasa (https://…jpg/png/webp).
 *
 * Link share Google Drive adalah halaman web, bukan gambar, sehingga perlu diubah ke alamat gambar:
 *   https://drive.google.com/thumbnail?id=ID&sz=w800   (utama)
 *   https://lh3.googleusercontent.com/d/ID=w800        (cadangan)
 */

const POLA_ID_DRIVE = [
  /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,})/,
  /drive\.google\.com\/(?:open|uc|thumbnail)\?(?:.*&)?id=([A-Za-z0-9_-]{10,})/,
  /docs\.google\.com\/uc\?(?:.*&)?id=([A-Za-z0-9_-]{10,})/,
  /lh3\.googleusercontent\.com\/d\/([A-Za-z0-9_-]{10,})/,
];

/** Ambil ID file dari berbagai bentuk link Google Drive */
export function idGoogleDrive(link: string): string | null {
  for (const pola of POLA_ID_DRIVE) {
    const m = link.match(pola);
    if (m) return m[1];
  }
  return null;
}

/** Daftar alamat gambar yang dicoba berurutan untuk menampilkan cover */
export function alamatGambarCover(link: string | null | undefined, lebar = 800): string[] {
  if (!link) return [];
  const id = idGoogleDrive(link);
  if (id) {
    return [
      `https://drive.google.com/thumbnail?id=${id}&sz=w${lebar}`,
      `https://lh3.googleusercontent.com/d/${id}=w${lebar}`,
    ];
  }
  return [link];
}

export type HasilLinkCover = { ok: true; link: string | null } | { ok: false; pesan: string };

/** Periksa & rapikan link yang diisi pustakawan sebelum disimpan */
export function rapikanLinkCover(masukan: string): HasilLinkCover {
  const teks = masukan.trim();
  if (!teks) return { ok: true, link: null };

  if (/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\//.test(teks)) {
    return { ok: false, pesan: "Itu link folder. Buka file gambarnya di Google Drive, lalu salin link file tersebut (Bagikan → Salin link)." };
  }
  if (/docs\.google\.com\/(document|spreadsheets|presentation)\//.test(teks)) {
    return { ok: false, pesan: "Itu link dokumen Google, bukan gambar. Gunakan link file gambar (JPG/PNG) di Google Drive." };
  }

  const id = idGoogleDrive(teks);
  if (id) return { ok: true, link: `https://drive.google.com/file/d/${id}/view` }; // bentuk baku yang mudah dibaca

  if (teks.includes("drive.google.com")) {
    return { ok: false, pesan: "Link Google Drive tidak dikenali. Gunakan link dari tombol Bagikan → Salin link pada file gambar." };
  }
  try {
    const url = new URL(teks);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    return { ok: true, link: url.toString() };
  } catch {
    return { ok: false, pesan: "Link cover tidak valid. Tempel link share Google Drive atau link gambar yang diawali https://." };
  }
}
