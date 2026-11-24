import "server-only";
import { redirect } from "next/navigation";

/** Ambil path tujuan kembali dari form (hanya path internal, cegah open-redirect). */
export function pathKembali(form: FormData, bawaan = "/"): string {
  const p = String(form.get("kembali") ?? "");
  return p.startsWith("/") && !p.startsWith("//") ? p : bawaan;
}

function denganParam(path: string, key: string, nilai: string): string {
  const [dasar, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.delete("pesan");
  params.delete("error");
  params.set(key, nilai);
  return `${dasar}?${params.toString()}`;
}

/** Redirect dengan pesan sukses (ditampilkan oleh komponen <Flash />). */
export function sukses(path: string, pesan: string): never {
  redirect(denganParam(path, "pesan", pesan));
}

/** Redirect dengan pesan error. */
export function gagal(path: string, pesan: string): never {
  redirect(denganParam(path, "error", pesan));
}

/** Pesan error dari Supabase/PostgreSQL dibuat lebih ramah. */
export function pesanError(e: { message?: string; code?: string } | null | undefined): string {
  if (!e) return "Terjadi kesalahan.";
  if (e.code === "23503") return "Data ini masih dipakai oleh data lain (mis. riwayat peminjaman), sehingga tidak bisa dihapus.";
  if (e.code === "23505") return "Data yang sama sudah ada (mis. ISBN atau nama kategori kembar).";
  if (e.code === "42501") return "Anda tidak memiliki izin untuk melakukan aksi ini.";
  return e.message ?? "Terjadi kesalahan.";
}
