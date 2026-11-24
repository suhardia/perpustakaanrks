import { ambilLaporan, rentangDari } from "./data";
import { rupiah, tanggal } from "@/lib/format";

export const metadata = { title: "Laporan" };

export default async function Laporan(props: PageProps<"/admin/laporan">) {
  const sp = await props.searchParams;
  const { dari, sampai } = rentangDari(sp);
  const data = await ambilLaporan(dari, sampai);

  // Buku terpopuler pada periode ini
  const hitung = new Map<string, number>();
  for (const p of data) hitung.set(p.judul, (hitung.get(p.judul) ?? 0) + 1);
  const populer = [...hitung.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const ringkas = [
    ["Total transaksi", data.length],
    ["Sudah kembali", data.filter((p) => p.status === "dikembalikan").length],
    ["Masih dipinjam", data.filter((p) => p.status === "dipinjam").length],
    ["Denda (tercatat + berjalan)", rupiah(data.reduce((s, p) => s + p.denda_berjalan, 0))],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <h1 className="text-2xl font-semibold">Laporan Peminjaman</h1>
        <div className="flex gap-2">
          <a href={`/admin/laporan/csv?dari=${dari}&sampai=${sampai}`} className="btn-garis">Unduh CSV (Excel)</a>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3 print:hidden">
        <div><label className="label">Dari</label><input type="date" name="dari" defaultValue={dari} className="input" /></div>
        <div><label className="label">Sampai</label><input type="date" name="sampai" defaultValue={sampai} className="input" /></div>
        <button className="btn-utama">Tampilkan</button>
      </form>

      <p className="text-sm text-tinta-2">Periode {tanggal(dari)} – {tanggal(sampai)}</p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {ringkas.map(([l, v]) => (
          <div key={l} className="kartu p-4"><p className="text-xl font-bold">{v}</p><p className="text-xs text-tinta-2">{l}</p></div>
        ))}
      </div>

      {populer.length > 0 && (
        <div className="kartu p-5">
          <h2 className="mb-3 font-semibold">Buku paling sering dipinjam</h2>
          <ol className="space-y-2 text-sm">
            {populer.map(([judul, n]) => (
              <li key={judul} className="flex items-center gap-3">
                <span className="w-48 truncate sm:w-72">{judul}</span>
                <span className="h-2 rounded-full bg-utama" style={{ width: `${(n / populer[0][1]) * 200}px` }} />
                <span className="text-tinta-2">{n}×</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="kartu overflow-x-auto">
        <table className="tabel">
          <thead><tr><th>No</th><th>Tgl pinjam</th><th>Anggota</th><th>Buku</th><th>Jatuh tempo</th><th>Kembali</th><th>Denda</th></tr></thead>
          <tbody>
            {data.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-tinta-2">Tidak ada transaksi pada periode ini.</td></tr>}
            {data.map((p, i) => (
              <tr key={p.id}>
                <td>{i + 1}</td>
                <td>{tanggal(p.tgl_pinjam)}</td>
                <td>{p.anggota_nama}</td>
                <td>{p.judul}</td>
                <td>{tanggal(p.tgl_jatuh_tempo)}</td>
                <td>{p.tgl_kembali ? tanggal(p.tgl_kembali) : <span className="text-aksen">belum</span>}</td>
                <td>{p.denda_berjalan ? rupiah(p.denda_berjalan) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
