import Link from "next/link";
import Flash from "@/components/Flash";
import Tombol from "@/components/Tombol";
import { kembalikanBuku, serahkanAntrian } from "@/app/actions/admin";
import { createClient } from "@/lib/supabase/server";
import { rupiah, tanggal } from "@/lib/format";
import type { AntrianDetail, PeminjamanDetail } from "@/lib/types";

export const metadata = { title: "Dashboard Pustakawan" };

export default async function Dashboard(props: PageProps<"/admin">) {
  const sp = await props.searchParams;
  const supabase = await createClient();
  const hariIni = new Date().toISOString().slice(0, 10);

  const [buku, eksemplar, anggota, dipinjam, menunggu, siapData, telatData] = await Promise.all([
    supabase.from("buku").select("id", { count: "exact", head: true }),
    supabase.from("buku").select("jumlah"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "anggota"),
    supabase.from("peminjaman").select("id", { count: "exact", head: true }).eq("status", "dipinjam"),
    supabase.from("antrian").select("id", { count: "exact", head: true }).eq("status", "menunggu"),
    supabase.from("antrian_detail").select("*").eq("status", "siap_diambil").order("batas_ambil"),
    supabase.from("peminjaman_detail").select("*").eq("status", "dipinjam").gt("hari_terlambat", 0).order("tgl_jatuh_tempo"),
  ]);
  const siap = (siapData.data ?? []) as AntrianDetail[];
  const telat = (telatData.data ?? []) as PeminjamanDetail[];
  const totalEksemplar = (eksemplar.data ?? []).reduce((s: number, r: { jumlah: number }) => s + r.jumlah, 0);

  const stat = [
    ["Judul buku", buku.count ?? 0, "/admin/buku"],
    ["Eksemplar", totalEksemplar, "/admin/buku"],
    ["Anggota", anggota.count ?? 0, "/admin/anggota"],
    ["Sedang dipinjam", dipinjam.count ?? 0, "/admin/sirkulasi"],
    ["Terlambat", telat.length, "/admin/sirkulasi?tab=terlambat"],
    ["Menunggu antrian", menunggu.count ?? 0, "/admin/antrian?tab=menunggu"],
    ["Siap diambil", siap.length, "/admin/antrian"],
  ] as const;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link href="/admin/sirkulasi" className="btn-utama">+ Catat Peminjaman</Link>
      </div>
      <Flash pesan={sp.pesan} error={sp.error} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {stat.map(([label, nilai, href]) => (
          <Link key={label} href={href} className="kartu p-4 hover:border-utama">
            <p className="text-2xl font-bold">{nilai}</p>
            <p className="text-xs text-tinta-2">{label}</p>
          </Link>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Siap diambil anggota ({siap.length})</h2>
        {siap.length === 0 ? (
          <p className="kartu p-5 text-sm text-tinta-2">Tidak ada buku yang menunggu diambil.</p>
        ) : (
          <div className="kartu overflow-x-auto">
            <table className="tabel">
              <thead><tr><th>Anggota</th><th>Buku</th><th>Batas ambil</th><th></th></tr></thead>
              <tbody>
                {siap.map((a) => (
                  <tr key={a.id}>
                    <td><span className="font-medium">{a.anggota_nama}</span> <span className="text-tinta-2">· {a.no_anggota}</span></td>
                    <td>{a.judul}</td>
                    <td className={a.batas_ambil && a.batas_ambil <= hariIni ? "font-semibold text-aksen" : ""}>{tanggal(a.batas_ambil)}</td>
                    <td className="text-right">
                      <form action={serahkanAntrian}>
                        <input type="hidden" name="antrian_id" value={a.id} />
                        <input type="hidden" name="kembali" value="/admin" />
                        <Tombol className="btn-utama btn-kecil">Serahkan</Tombol>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-bahaya">Terlambat dikembalikan ({telat.length})</h2>
        {telat.length === 0 ? (
          <p className="kartu p-5 text-sm text-tinta-2">Tidak ada keterlambatan. 🎉</p>
        ) : (
          <div className="kartu overflow-x-auto">
            <table className="tabel">
              <thead><tr><th>Anggota</th><th>Buku</th><th>Jatuh tempo</th><th>Terlambat</th><th>Denda</th><th></th></tr></thead>
              <tbody>
                {telat.map((p) => (
                  <tr key={p.id}>
                    <td><span className="font-medium">{p.anggota_nama}</span> <span className="text-tinta-2">· {p.no_anggota}</span></td>
                    <td>{p.judul}</td>
                    <td>{tanggal(p.tgl_jatuh_tempo)}</td>
                    <td className="font-semibold text-bahaya">{p.hari_terlambat} hari</td>
                    <td>{rupiah(p.denda_berjalan)}</td>
                    <td className="text-right">
                      <form action={kembalikanBuku}>
                        <input type="hidden" name="peminjaman_id" value={p.id} />
                        <input type="hidden" name="kembali" value="/admin" />
                        <Tombol className="btn-garis btn-kecil" konfirmasi={`Proses pengembalian "${p.judul}"? Denda ${rupiah(p.denda_berjalan)}.`}>
                          Kembalikan
                        </Tombol>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
