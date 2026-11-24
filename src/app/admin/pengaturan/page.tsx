import Flash from "@/components/Flash";
import Tombol from "@/components/Tombol";
import { simpanPengaturan } from "@/app/actions/admin";
import { getPengaturan } from "@/lib/auth";

export const metadata = { title: "Pengaturan" };

const ZONA = [
  ["Asia/Jakarta", "WIB (Asia/Jakarta)"],
  ["Asia/Makassar", "WITA (Asia/Makassar)"],
  ["Asia/Jayapura", "WIT (Asia/Jayapura)"],
];

export default async function Pengaturan(props: PageProps<"/admin/pengaturan">) {
  const sp = await props.searchParams;
  const p = await getPengaturan();

  const angka: [keyof typeof p, string, string][] = [
    ["lama_pinjam", "Lama pinjam", "hari"],
    ["denda_per_hari", "Denda keterlambatan", "rupiah / hari / buku"],
    ["maks_pinjam", "Maksimal buku dipinjam", "buku per anggota"],
    ["maks_antrian", "Maksimal antrian aktif", "buku per anggota"],
    ["maks_perpanjang", "Maksimal perpanjangan", "kali per peminjaman"],
    ["batas_ambil_hari", "Batas mengambil buku antrian", "hari sejak giliran tiba"],
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Pengaturan Perpustakaan</h1>
      <Flash pesan={sp.pesan} error={sp.error} />

      <form action={simpanPengaturan} className="kartu space-y-4 p-6">
        <div>
          <label className="label">Nama perpustakaan</label>
          <input name="nama_perpustakaan" defaultValue={p.nama_perpustakaan} className="input" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {angka.map(([key, label, satuan]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input name={key} type="number" min={0} required defaultValue={String(p[key])} className="input" />
              <p className="mt-1 text-xs text-tinta-2">{satuan}</p>
            </div>
          ))}
        </div>
        <div>
          <label className="label">Zona waktu (untuk menghitung jatuh tempo &amp; denda)</label>
          <select name="zona_waktu" defaultValue={p.zona_waktu} className="input">
            {ZONA.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <Tombol>Simpan Pengaturan</Tombol>
      </form>
    </div>
  );
}
