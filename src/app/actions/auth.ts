"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { gagal, sukses } from "@/lib/aksi";

function lanjutAman(v: FormDataEntryValue | null): string {
  const p = String(v ?? "");
  return p.startsWith("/") && !p.startsWith("//") ? p : "/";
}

export async function masuk(form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const lanjut = lanjutAman(form.get("lanjut"));
  const balik = `/masuk?lanjut=${encodeURIComponent(lanjut)}`;

  if (!email || !password) gagal(balik, "Email dan password wajib diisi.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    gagal(
      balik,
      error.message.includes("Email not confirmed")
        ? "Email belum dikonfirmasi. Buka tautan konfirmasi di kotak masuk email Anda."
        : "Email atau password salah.",
    );
  }

  revalidatePath("/", "layout");
  redirect(lanjut);
}

export async function daftar(form: FormData) {
  const nama = String(form.get("nama") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const noHp = String(form.get("no_hp") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const ulangi = String(form.get("ulangi") ?? "");

  if (!nama || !email || !password) gagal("/daftar", "Nama, email, dan password wajib diisi.");
  if (password.length < 6) gagal("/daftar", "Password minimal 6 karakter.");
  if (password !== ulangi) gagal("/daftar", "Konfirmasi password tidak sama.");

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nama, no_hp: noHp },
      emailRedirectTo: `${origin}/auth/callback?lanjut=/akun`,
    },
  });
  if (error) {
    gagal("/daftar", error.message.includes("already registered") ? "Email sudah terdaftar." : error.message);
  }

  // Jika konfirmasi email dimatikan di Supabase, user langsung masuk
  if (data.session) {
    revalidatePath("/", "layout");
    sukses("/akun", `Selamat datang, ${nama}! Akun anggota Anda sudah aktif.`);
  }
  sukses("/masuk", "Pendaftaran berhasil. Cek email Anda untuk konfirmasi, lalu masuk.");
}

export async function keluar() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
