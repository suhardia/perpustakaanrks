"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { gagal, pathKembali, pesanError, sukses } from "@/lib/aksi";
import { rupiah } from "@/lib/format";
import { wajibAdmin } from "@/lib/auth";
import { ambilBuku, keBaris } from "@/lib/bukuIndonesia";
import { rapikanLinkCover } from "@/lib/cover";

function teks(form: FormData, key: string): string | null {
  const v = String(form.get(key) ?? "").trim();
  return v === "" ? null : v;
}

function segarkan() {
  revalidatePath("/", "layout");
}

// ======================= BUKU =======================

export async function simpanBuku(form: FormData) {
  await wajibAdmin();
  const supabase = await createClient();
  const id = Number(form.get("id")) || null;
  const balik = id ? `/admin/buku/${id}` : "/admin/buku/baru";

  const judul = teks(form, "judul");
  const jumlah = Number(form.get("jumlah"));
  if (!judul) gagal(balik, "Judul wajib diisi.");
  if (!Number.isInteger(jumlah) || jumlah < 0) gagal(balik, "Jumlah eksemplar tidak valid.");
  const tahun = teks(form, "tahun_terbit");

  const data = {
    judul,
    kategori_id: Number(form.get("kategori_id")) || null,
    pengarang: teks(form, "pengarang"),
    penerbit: teks(form, "penerbit"),
    tahun_terbit: tahun ? Number(tahun) : null,
    isbn: teks(form, "isbn"),
    rak: teks(form, "rak"),
    jumlah,
    sinopsis: teks(form, "sinopsis"),
  };

  // Cover disimpan sebagai teks link saja (Google Drive / URL gambar), tanpa upload file
  const cover = rapikanLinkCover(String(form.get("cover_link") ?? ""));
  if (!cover.ok) gagal(balik, cover.pesan);
  const payload = { ...data, cover_url: cover.link };

  if (id) {
    const { error } = await supabase.from("buku").update(payload).eq("id", id);
    if (error) gagal(balik, pesanError(error));
  } else {
    const { error } = await supabase.from("buku").insert(payload);
    if (error) gagal(balik, pesanError(error));
  }

  segarkan();
  sukses("/admin/buku", id ? "Data buku diperbarui." : "Buku ditambahkan ke koleksi.");
}

export async function hapusBuku(form: FormData) {
  await wajibAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("buku").delete().eq("id", Number(form.get("id")));
  if (error) gagal("/admin/buku", pesanError(error));
  segarkan();
  sukses("/admin/buku", "Buku dihapus.");
}

// ===================== KATEGORI =====================

export async function simpanKategori(form: FormData) {
  await wajibAdmin();
  const nama = teks(form, "nama");
  if (!nama) gagal("/admin/kategori", "Nama kategori wajib diisi.");
  const id = Number(form.get("id")) || null;
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("kategori").update({ nama }).eq("id", id)
    : await supabase.from("kategori").insert({ nama });
  if (error) gagal("/admin/kategori", pesanError(error));
  segarkan();
  sukses("/admin/kategori", id ? "Kategori diperbarui." : "Kategori ditambahkan.");
}

export async function hapusKategori(form: FormData) {
  await wajibAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("kategori").delete().eq("id", Number(form.get("id")));
  if (error) gagal("/admin/kategori", pesanError(error));
  segarkan();
  sukses("/admin/kategori", "Kategori dihapus. Buku di dalamnya menjadi tanpa kategori.");
}

// ===================== SIRKULASI =====================

export async function catatPeminjaman(form: FormData) {
  await wajibAdmin();
  const kembali = pathKembali(form, "/admin/sirkulasi");
  const anggotaId = String(form.get("anggota_id") ?? "");
  const bukuId = Number(form.get("buku_id"));
  if (!anggotaId || !bukuId) gagal(kembali, "Pilih anggota dan buku.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("catat_peminjaman", { p_anggota_id: anggotaId, p_buku_id: bukuId });
  if (error) gagal(kembali, pesanError(error));
  segarkan();
  sukses(kembali, "Peminjaman dicatat.");
}

export async function kembalikanBuku(form: FormData) {
  await wajibAdmin();
  const kembali = pathKembali(form, "/admin/sirkulasi");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("kembalikan_buku", { p_peminjaman_id: Number(form.get("peminjaman_id")) });
  if (error) gagal(kembali, pesanError(error));
  segarkan();
  const denda = Number(data?.denda ?? 0);
  sukses(
    kembali,
    "Buku dikembalikan." +
      (denda > 0 ? ` Denda keterlambatan ${rupiah(denda)}.` : "") +
      " Jika ada antrian, anggota berikutnya otomatis mendapat giliran.",
  );
}

export async function perpanjangAdmin(form: FormData) {
  await wajibAdmin();
  const kembali = pathKembali(form, "/admin/sirkulasi");
  const supabase = await createClient();
  const { error } = await supabase.rpc("perpanjang_peminjaman", { p_peminjaman_id: Number(form.get("peminjaman_id")) });
  if (error) gagal(kembali, pesanError(error));
  segarkan();
  sukses(kembali, "Masa pinjam diperpanjang.");
}

export async function serahkanAntrian(form: FormData) {
  await wajibAdmin();
  const kembali = pathKembali(form, "/admin/antrian");
  const supabase = await createClient();
  const { error } = await supabase.rpc("serahkan_antrian", { p_antrian_id: Number(form.get("antrian_id")) });
  if (error) gagal(kembali, pesanError(error));
  segarkan();
  sukses(kembali, "Buku diserahkan dan tercatat sebagai peminjaman.");
}

export async function batalkanAntrianAdmin(form: FormData) {
  await wajibAdmin();
  const kembali = pathKembali(form, "/admin/antrian");
  const supabase = await createClient();
  const { error } = await supabase.rpc("batalkan_antrian", { p_antrian_id: Number(form.get("antrian_id")) });
  if (error) gagal(kembali, pesanError(error));
  segarkan();
  sukses(kembali, "Antrian dibatalkan. Giliran berpindah ke antrian berikutnya bila ada.");
}

// ===================== ANGGOTA & PENGATURAN =====================

export async function ubahRole(form: FormData) {
  await wajibAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("ubah_role", {
    p_user_id: String(form.get("user_id")),
    p_role: String(form.get("role")),
  });
  if (error) gagal("/admin/anggota", pesanError(error));
  segarkan();
  sukses("/admin/anggota", "Peran pengguna diperbarui.");
}

export async function simpanPengaturan(form: FormData) {
  await wajibAdmin();
  const angka = (k: string) => Number(form.get(k));
  const data = {
    nama_perpustakaan: teks(form, "nama_perpustakaan") ?? "Perpustakaan Digital",
    lama_pinjam: angka("lama_pinjam"),
    denda_per_hari: angka("denda_per_hari"),
    maks_pinjam: angka("maks_pinjam"),
    maks_antrian: angka("maks_antrian"),
    maks_perpanjang: angka("maks_perpanjang"),
    batas_ambil_hari: angka("batas_ambil_hari"),
    zona_waktu: teks(form, "zona_waktu") ?? "Asia/Jayapura",
  };
  if (Object.values(data).some((v) => typeof v === "number" && (!Number.isInteger(v) || v < 0))) {
    gagal("/admin/pengaturan", "Semua angka harus bilangan bulat positif.");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("pengaturan").update(data).eq("id", 1);
  if (error) gagal("/admin/pengaturan", pesanError(error));
  segarkan();
  sukses("/admin/pengaturan", "Pengaturan disimpan.");
}

// ===================== AKUN PUSTAKAWAN =====================

/** Mengatur nama pengguna login pustakawan (milik sendiri atau pustakawan lain). */
export async function aturUsername(form: FormData) {
  const saya = await wajibAdmin();
  const kembali = pathKembali(form, "/admin/akun");
  const userId = String(form.get("user_id") ?? "") || saya.id;
  const username = String(form.get("username") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.rpc("atur_username", { p_user_id: userId, p_username: username });
  if (error) gagal(kembali, pesanError(error));
  segarkan();
  sukses(kembali, username ? `Nama pengguna diatur menjadi "${username}".` : "Nama pengguna dihapus.");
}

/** Mengubah nama tampilan akun pustakawan sendiri. */
export async function ubahNamaAdmin(form: FormData) {
  const saya = await wajibAdmin();
  const nama = String(form.get("nama") ?? "").trim();
  if (!nama) gagal("/admin/akun", "Nama wajib diisi.");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ nama }).eq("id", saya.id);
  if (error) gagal("/admin/akun", pesanError(error));
  segarkan();
  sukses("/admin/akun", "Nama disimpan.");
}

/** Mengganti password akun yang sedang masuk. */
export async function gantiPassword(form: FormData) {
  await wajibAdmin();
  const password = String(form.get("password") ?? "");
  const ulangi = String(form.get("ulangi") ?? "");
  if (password.length < 8) gagal("/admin/akun", "Password pustakawan minimal 8 karakter.");
  if (password !== ulangi) gagal("/admin/akun", "Konfirmasi password tidak sama.");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    gagal(
      "/admin/akun",
      error.message.toLowerCase().includes("reauthentication")
        ? "Supabase meminta verifikasi ulang. Matikan opsi 'Secure password change' di Supabase, atau keluar lalu masuk kembali dan coba lagi."
        : error.message.includes("different") ? "Password baru harus berbeda dari password lama." : error.message,
    );
  }
  sukses("/admin/akun", "Password berhasil diganti.");
}

// ===================== IMPOR DARI API BUKU INDONESIA =====================

/** Mengimpor buku terpilih dari API Buku Indonesia beserta jumlah eksemplarnya. */
export async function imporBuku(form: FormData) {
  await wajibAdmin();
  const kembali = pathKembali(form, "/admin/impor");
  const ids = [...new Set(form.getAll("pilih").map(String))].filter((id) => /^bk_[a-z0-9]+$/i.test(id)).slice(0, 60);
  if (ids.length === 0) gagal(kembali, "Centang minimal satu buku yang ingin diimpor.");

  const angka = (v: FormDataEntryValue | null, bawaan: number) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 && n <= 10000 ? n : bawaan;
  };
  const jumlahBawaan = angka(form.get("jumlah_bawaan"), 1);
  const kategoriTetap = Number(form.get("kategori_tujuan")) || null; // 0 = ikuti kategori API

  // Ambil detail tiap buku dari API (paralel)
  const hasil = await Promise.all(ids.map((id) => ambilBuku(id).catch(() => null)));
  const bukuApi = hasil.filter((b): b is NonNullable<typeof b> => b !== null);
  const gagalAmbil = ids.length - bukuApi.length;

  const supabase = await createClient();

  // Lewati buku yang sudah ada (berdasarkan ID sumber atau ISBN)
  const isbnBaru = bukuApi.map((b) => b.isbn13 ?? b.isbn10).filter((x): x is string => Boolean(x));
  const [{ data: adaSumber }, { data: adaIsbn }] = await Promise.all([
    supabase.from("buku").select("sumber_id").in("sumber_id", bukuApi.map((b) => b.id)),
    isbnBaru.length ? supabase.from("buku").select("isbn").in("isbn", isbnBaru) : Promise.resolve({ data: [] }),
  ]);
  const sudahAda = new Set<string>([
    ...((adaSumber ?? []) as { sumber_id: string }[]).map((r) => r.sumber_id),
    ...((adaIsbn ?? []) as { isbn: string }[]).map((r) => `isbn:${r.isbn}`),
  ]);

  // Siapkan kategori lokal (dibuat otomatis jika belum ada)
  const petaKategori = new Map<string, number>();
  if (!kategoriTetap) {
    const namaDibutuhkan = [...new Set(bukuApi.map((b) => b.categories?.[0]).filter((x): x is string => Boolean(x)))];
    const { data: katAda } = await supabase.from("kategori").select("id, nama");
    for (const k of (katAda ?? []) as { id: number; nama: string }[]) petaKategori.set(k.nama.toLowerCase(), k.id);
    const kurang = namaDibutuhkan.filter((n) => !petaKategori.has(n.toLowerCase()));
    if (kurang.length) {
      const { data: baru, error } = await supabase.from("kategori").insert(kurang.map((nama) => ({ nama }))).select("id, nama");
      if (error) gagal(kembali, `Gagal membuat kategori: ${pesanError(error)}`);
      for (const k of (baru ?? []) as { id: number; nama: string }[]) petaKategori.set(k.nama.toLowerCase(), k.id);
    }
  }

  const isbnDipakai = new Set<string>();
  const baris = [];
  let dilewati = 0;
  for (const b of bukuApi) {
    const isbn = b.isbn13 ?? b.isbn10 ?? null;
    if (sudahAda.has(b.id) || (isbn && (sudahAda.has(`isbn:${isbn}`) || isbnDipakai.has(isbn)))) {
      dilewati++;
      continue;
    }
    if (isbn) isbnDipakai.add(isbn);
    const kat = kategoriTetap ?? petaKategori.get((b.categories?.[0] ?? "").toLowerCase()) ?? null;
    baris.push(keBaris(b, angka(form.get(`jumlah_${b.id}`), jumlahBawaan), kat));
  }

  if (baris.length > 0) {
    const { error } = await supabase.from("buku").insert(baris);
    if (error) gagal(kembali, `Impor gagal: ${pesanError(error)}`);
  }

  segarkan();
  const info = [`${baris.length} buku diimpor ke koleksi.`];
  if (dilewati) info.push(`${dilewati} dilewati karena sudah ada.`);
  if (gagalAmbil) info.push(`${gagalAmbil} gagal diambil dari API.`);
  if (baris.length) info.push("Sinopsis belum tersedia dari API — lengkapi lewat menu Buku → Ubah.");
  sukses(kembali, info.join(" "));
}
