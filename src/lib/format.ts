const fmtTanggal = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const fmtWaktu = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jayapura",
});

/** "2026-11-24" -> "24 Nov 2026" */
export function tanggal(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? iso : fmtTanggal.format(d);
}

/** Timestamp lengkap dengan jam */
export function waktu(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : fmtWaktu.format(d);
}

/** 15000 -> "Rp15.000" */
export function rupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

/** Escape karakter khusus agar aman dipakai di filter .ilike / .or Supabase */
export function bersihkanCari(q: string): string {
  return q.replace(/[%_,()\\]/g, " ").trim();
}
