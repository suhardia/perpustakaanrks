import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PeminjamanDetail } from "@/lib/types";

export function rentangDari(sp: Record<string, string | string[] | undefined>) {
  const hariIni = new Date();
  const awalBulan = new Date(Date.UTC(hariIni.getUTCFullYear(), hariIni.getUTCMonth(), 1));
  const valid = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  return {
    dari: valid(sp.dari) ? (sp.dari as string) : awalBulan.toISOString().slice(0, 10),
    sampai: valid(sp.sampai) ? (sp.sampai as string) : hariIni.toISOString().slice(0, 10),
  };
}

export async function ambilLaporan(dari: string, sampai: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("peminjaman_detail")
    .select("*")
    .gte("tgl_pinjam", dari)
    .lte("tgl_pinjam", sampai)
    .order("tgl_pinjam");
  return (data ?? []) as PeminjamanDetail[];
}
