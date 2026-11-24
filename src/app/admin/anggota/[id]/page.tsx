import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rupiah, tanggal } from "@/lib/format";
import type { AntrianDetail, PeminjamanDetail, Profil } from "@/lib/types";

export const metadata = { title: "Detail Anggota" };

export default async function DetailAnggota(props: PageProps<"/admin/anggota/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const [{ data: profil }, { data: pinjam }, { data: antre }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase.from("peminjaman_detail").select("*").eq("anggota_id", id).order("tgl_pinjam", { ascending: false }),
    supabase.from("antrian_detail").select("*").eq("anggota_id", id).in("status", ["menunggu", "siap_diambil"]),
  ]);
  if (!profil) notFound();
  const p = profil as Profil;
  const riwayat = (pinjam ?? []) as PeminjamanDetail[];
  const antrian = (antre ?? []) as AntrianDetail[];
  const totalDenda = riwayat.reduce((s, r) => s + r.denda_berjalan, 0);

  return (
    <div className="space-y-6">
      <Link href="/admin/anggota" className="text-sm text-tinta-2 hover:text-utama">← Semua anggota</Link>
      <div className="kartu flex flex-wrap gap-x-10 gap-y-3 p-5">
        <div><p className="text-xs text-tinta-2">Nama</p><p className="text-lg font-semibold">{p.nama}</p></div>
        <div><p className="text-xs text-tinta-2">No. anggota</p><p className="font-mono">{p.no_anggota}</p></div>
        <div><p className="text-xs text-tinta-2">Email</p><p>{p.email}</p></div>
        <div><p className="text-xs text-tinta-2">No. HP</p><p>{p.no_hp ?? "-"}</p></div>
        <div><p className="text-xs text-tinta-2">Alamat</p><p>{p.alamat ?? "-"}</p></div>
        <div><p className="text-xs text-tinta-2">Total denda</p><p className={totalDenda ? "text-bahaya" : ""}>{rupiah(totalDenda)}</p></div>
      </div>

      {antrian.length > 0 && (
        <div className="kartu p-5">
          <h2 className="mb-2 font-semibold">Antrian aktif</h2>
          <ul className="text-sm">
            {antrian.map((a) => (
              <li key={a.id}>{a.judul} · {a.status === "siap_diambil" ? `siap diambil s.d. ${tanggal(a.batas_ambil)}` : `menunggu ke-${a.posisi}`}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="kartu overflow-x-auto">
        <table className="tabel">
          <thead><tr><th>Buku</th><th>Pinjam</th><th>Jatuh tempo</th><th>Kembali</th><th>Status</th><th>Denda</th></tr></thead>
          <tbody>
            {riwayat.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-tinta-2">Belum pernah meminjam.</td></tr>}
            {riwayat.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{r.judul}</td>
                <td>{tanggal(r.tgl_pinjam)}</td>
                <td>{tanggal(r.tgl_jatuh_tempo)}</td>
                <td>{tanggal(r.tgl_kembali)}</td>
                <td>{r.status === "dipinjam" ? (r.hari_terlambat > 0 ? <span className="text-bahaya">Terlambat</span> : "Dipinjam") : "Dikembalikan"}</td>
                <td>{r.denda_berjalan ? rupiah(r.denda_berjalan) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
