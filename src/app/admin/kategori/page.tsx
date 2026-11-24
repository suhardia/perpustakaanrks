import Flash from "@/components/Flash";
import Tombol from "@/components/Tombol";
import { hapusKategori, simpanKategori } from "@/app/actions/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Kategori" };

export default async function KategoriPage(props: PageProps<"/admin/kategori">) {
  const sp = await props.searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("kategori").select("id, nama, buku(count)").order("nama");
  const kategori = (data ?? []) as { id: number; nama: string; buku: { count: number }[] }[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Kategori Buku</h1>
      <Flash pesan={sp.pesan} error={sp.error} />

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <form action={simpanKategori} className="kartu h-fit space-y-3 p-5">
          <label className="label">Kategori baru</label>
          <input name="nama" required className="input" placeholder="mis. Novel, Sains, Agama" />
          <Tombol className="btn-utama w-full">Tambah</Tombol>
        </form>

        <div className="kartu overflow-x-auto">
          <table className="tabel">
            <thead><tr><th>Nama</th><th>Jumlah judul</th><th></th></tr></thead>
            <tbody>
              {kategori.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-tinta-2">Belum ada kategori.</td></tr>}
              {kategori.map((k) => (
                <tr key={k.id}>
                  <td>
                    <form action={simpanKategori} className="flex gap-2">
                      <input type="hidden" name="id" value={k.id} />
                      <input name="nama" defaultValue={k.nama} required className="input py-1.5" />
                      <Tombol className="btn-garis btn-kecil">Simpan</Tombol>
                    </form>
                  </td>
                  <td>{k.buku?.[0]?.count ?? 0}</td>
                  <td className="text-right">
                    <form action={hapusKategori}>
                      <input type="hidden" name="id" value={k.id} />
                      <Tombol className="btn-bahaya btn-kecil" konfirmasi={`Hapus kategori "${k.nama}"?`}>Hapus</Tombol>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
