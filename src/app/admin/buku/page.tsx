import Link from "next/link";
import Flash from "@/components/Flash";
import Sampul from "@/components/Sampul";
import Tombol from "@/components/Tombol";
import { hapusBuku } from "@/app/actions/admin";
import { createClient } from "@/lib/supabase/server";
import { bersihkanCari } from "@/lib/format";
import type { BukuStatus } from "@/lib/types";

export const metadata = { title: "Kelola Buku" };

export default async function KelolaBuku(props: PageProps<"/admin/buku">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const supabase = await createClient();

  let query = supabase.from("buku_status").select("*").order("judul");
  const kata = bersihkanCari(q);
  if (kata) query = query.or(`judul.ilike.%${kata}%,pengarang.ilike.%${kata}%,isbn.ilike.%${kata}%`);
  const { data } = await query.limit(300);
  const buku = (data ?? []) as BukuStatus[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Koleksi Buku</h1>
        <Link href="/admin/buku/baru" className="btn-utama">+ Tambah Buku</Link>
      </div>
      <Flash pesan={sp.pesan} error={sp.error} />

      <form className="flex max-w-lg gap-2">
        <input name="q" defaultValue={q} placeholder="Cari judul, pengarang, ISBN…" className="input" />
        <button className="btn-garis">Cari</button>
      </form>

      <div className="kartu overflow-x-auto">
        <table className="tabel">
          <thead>
            <tr><th className="w-14"></th><th>Judul</th><th>Kategori</th><th>ISBN / Rak</th><th>Eksemplar</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {buku.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-tinta-2">Belum ada buku.</td></tr>}
            {buku.map((b) => (
              <tr key={b.id}>
                <td><div className="w-10"><Sampul id={b.id} judul={b.judul} coverUrl={b.cover_url} kecil /></div></td>
                <td>
                  <Link href={`/admin/buku/${b.id}`} className="font-semibold hover:text-utama">{b.judul}</Link>
                  <br /><span className="text-xs text-tinta-2">{b.pengarang}</span>
                </td>
                <td>{b.kategori_nama ?? "-"}</td>
                <td className="text-xs"><code>{b.isbn ?? "-"}</code><br />{b.rak ?? ""}</td>
                <td>{b.jumlah}</td>
                <td className="text-xs">
                  <span className="text-sukses">{b.tersedia} tersedia</span><br />
                  <span className="text-tinta-2">{b.dipinjam} dipinjam · {b.dipesan} disisihkan · {b.antrian} antre</span>
                </td>
                <td className="text-right whitespace-nowrap">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/buku/${b.id}`} className="btn-garis btn-kecil">Ubah</Link>
                    <form action={hapusBuku}>
                      <input type="hidden" name="id" value={b.id} />
                      <Tombol className="btn-bahaya btn-kecil" konfirmasi={`Hapus "${b.judul}"? Buku yang punya riwayat peminjaman tidak dapat dihapus.`}>
                        Hapus
                      </Tombol>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
