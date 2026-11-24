"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { gagal, pathKembali, pesanError, sukses } from "@/lib/aksi";
import { tanggal } from "@/lib/format";
import { getProfil } from "@/lib/auth";

/** Anggota mengajukan antrian peminjaman sebuah buku. */
export async function ajukanAntrian(form: FormData) {
  const kembali = pathKembali(form);
  const profil = await getProfil();
  if (!profil) gagal(`/masuk?lanjut=${encodeURIComponent(kembali)}`, "Silakan masuk untuk mengajukan peminjaman.");

  const bukuId = Number(form.get("buku_id"));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ajukan_antrian", { p_buku_id: bukuId });
  if (error) gagal(kembali, pesanError(error));

  revalidatePath("/", "layout");
  if (data?.status === "siap_diambil") {
    sukses(kembali, `Buku sudah disiapkan untuk Anda! Ambil di meja pustakawan paling lambat ${tanggal(data.batas_ambil)}.`);
  }
  sukses(kembali, "Anda masuk antrian. Kami akan menyisihkan buku saat giliran Anda tiba — pantau di halaman Akun Saya.");
}

export async function batalkanAntrian(form: FormData) {
  const kembali = pathKembali(form, "/akun");
  const supabase = await createClient();
  const { error } = await supabase.rpc("batalkan_antrian", { p_antrian_id: Number(form.get("antrian_id")) });
  if (error) gagal(kembali, pesanError(error));
  revalidatePath("/", "layout");
  sukses(kembali, "Antrian dibatalkan.");
}

export async function perpanjang(form: FormData) {
  const kembali = pathKembali(form, "/akun");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("perpanjang_peminjaman", {
    p_peminjaman_id: Number(form.get("peminjaman_id")),
  });
  if (error) gagal(kembali, pesanError(error));
  revalidatePath("/", "layout");
  sukses(kembali, `Masa pinjam diperpanjang sampai ${tanggal(data?.tgl_jatuh_tempo)}.`);
}

export async function ubahProfil(form: FormData) {
  const profil = await getProfil();
  if (!profil) gagal("/masuk", "Silakan masuk.");

  const nama = String(form.get("nama") ?? "").trim();
  if (!nama) gagal("/akun", "Nama wajib diisi.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      nama,
      no_hp: String(form.get("no_hp") ?? "").trim() || null,
      alamat: String(form.get("alamat") ?? "").trim() || null,
    })
    .eq("id", profil.id);
  if (error) gagal("/akun", pesanError(error));

  revalidatePath("/", "layout");
  sukses("/akun", "Profil disimpan.");
}
