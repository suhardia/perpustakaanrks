"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { gagal, pathKembali, pesanError, sukses } from "@/lib/aksi";
import { rupiah } from "@/lib/format";
import { wajibAdmin } from "@/lib/auth";

const MAKS_COVER = 2 * 1024 * 1024;

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

  // Upload cover ke Supabase Storage (bucket "cover")
  let coverUrl: string | undefined;
  const file = form.get("cover");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) gagal(balik, "Cover harus berupa gambar (JPG/PNG/WebP).");
    if (file.size > MAKS_COVER) gagal(balik, "Ukuran cover maksimal 2 MB.");
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const nama = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("cover").upload(nama, file, {
      contentType: file.type,
      upsert: false,
    });
    if (upErr) gagal(balik, `Gagal mengunggah cover: ${upErr.message}`);
    coverUrl = supabase.storage.from("cover").getPublicUrl(nama).data.publicUrl;
  }
  if (form.get("hapus_cover") === "1") coverUrl = "";

  const payload = coverUrl === undefined ? data : { ...data, cover_url: coverUrl || null };

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
