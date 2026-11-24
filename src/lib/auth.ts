import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Pengaturan, Profil } from "@/lib/types";
import { supabaseSiap } from "@/lib/supabase/env";

/** Profil pengguna yang sedang masuk (null jika tamu). Di-cache per request. */
export const getProfil = cache(async (): Promise<Profil | null> => {
  if (!supabaseSiap) return null;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
  return (data as Profil | null) ?? null;
});

export async function wajibMasuk(): Promise<Profil> {
  const profil = await getProfil();
  if (!profil) redirect("/masuk");
  return profil;
}

export async function wajibAdmin(): Promise<Profil> {
  const profil = await wajibMasuk();
  if (profil.role !== "admin") redirect("/?error=" + encodeURIComponent("Halaman khusus pustakawan."));
  return profil;
}

export const getPengaturan = cache(async (): Promise<Pengaturan> => {
  const bawaan: Pengaturan = {
    id: 1,
    nama_perpustakaan: "Perpustakaan Digital",
    lama_pinjam: 7,
    denda_per_hari: 1000,
    maks_pinjam: 3,
    maks_antrian: 3,
    maks_perpanjang: 1,
    batas_ambil_hari: 2,
    zona_waktu: "Asia/Jayapura",
  };
  if (!supabaseSiap) return bawaan;
  const supabase = await createClient();
  const { data } = await supabase.from("pengaturan").select("*").eq("id", 1).maybeSingle();
  return (data as Pengaturan | null) ?? bawaan;
});
