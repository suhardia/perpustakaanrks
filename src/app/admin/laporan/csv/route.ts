import { NextResponse, type NextRequest } from "next/server";
import { getProfil } from "@/lib/auth";
import { ambilLaporan, rentangDari } from "../data";

/** GET /admin/laporan/csv?dari=YYYY-MM-DD&sampai=YYYY-MM-DD → file CSV (bisa dibuka di Excel) */
export async function GET(request: NextRequest) {
  const profil = await getProfil();
  if (profil?.role !== "admin") return new NextResponse("Tidak diizinkan", { status: 403 });

  const { dari, sampai } = rentangDari(Object.fromEntries(request.nextUrl.searchParams));
  const data = await ambilLaporan(dari, sampai);

  const sel = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const baris = [
    ["No", "Tgl Pinjam", "Jatuh Tempo", "Tgl Kembali", "No Anggota", "Nama", "Judul", "Status", "Hari Terlambat", "Denda"],
    ...data.map((p, i) => [
      i + 1, p.tgl_pinjam, p.tgl_jatuh_tempo, p.tgl_kembali ?? "", p.no_anggota, p.anggota_nama, p.judul, p.status,
      p.hari_terlambat, p.denda_berjalan,
    ]),
  ];
  // BOM agar Excel membaca UTF-8 dengan benar; pemisah ";" sesuai pengaturan regional Indonesia
  const csv = "﻿" + baris.map((r) => r.map(sel).join(";")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-peminjaman-${dari}-sd-${sampai}.csv"`,
    },
  });
}
