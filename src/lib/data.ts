import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AntrianDetail, PeminjamanDetail, Profil } from "@/lib/types";

/** Antrian aktif & pinjaman aktif milik anggota yang sedang masuk, dikelompokkan per buku. */
export async function getStatusSaya(profil: Profil | null) {
  const antrian = new Map<number, AntrianDetail>();
  const pinjaman = new Map<number, PeminjamanDetail>();
  if (!profil || profil.role !== "anggota") return { antrian, pinjaman };

  const supabase = await createClient();
  const [a, p] = await Promise.all([
    supabase.from("antrian_detail").select("*").eq("anggota_id", profil.id).in("status", ["menunggu", "siap_diambil"]),
    supabase.from("peminjaman_detail").select("*").eq("anggota_id", profil.id).eq("status", "dipinjam"),
  ]);
  for (const r of (a.data ?? []) as AntrianDetail[]) antrian.set(r.buku_id, r);
  for (const r of (p.data ?? []) as PeminjamanDetail[]) pinjaman.set(r.buku_id, r);
  return { antrian, pinjaman };
}
