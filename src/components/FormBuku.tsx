/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import Tombol from "@/components/Tombol";
import { simpanBuku } from "@/app/actions/admin";
import type { Buku, Kategori } from "@/lib/types";

/** Form tambah/ubah buku (dipakai halaman baru & edit). */
export default function FormBuku({ buku, kategori }: { buku?: Buku; kategori: Kategori[] }) {
  return (
    <form action={simpanBuku} className="kartu grid gap-4 p-6 md:grid-cols-6">
      {buku && <input type="hidden" name="id" value={buku.id} />}

      <div className="md:col-span-4">
        <label className="label">Judul *</label>
        <input name="judul" defaultValue={buku?.judul} required className="input" />
      </div>
      <div className="md:col-span-2">
        <label className="label">Kategori</label>
        <select name="kategori_id" defaultValue={buku?.kategori_id ?? ""} className="input">
          <option value="">— Tanpa kategori —</option>
          {kategori.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
      </div>
      <div className="md:col-span-3">
        <label className="label">Pengarang</label>
        <input name="pengarang" defaultValue={buku?.pengarang ?? ""} className="input" />
      </div>
      <div className="md:col-span-3">
        <label className="label">Penerbit</label>
        <input name="penerbit" defaultValue={buku?.penerbit ?? ""} className="input" />
      </div>
      <div className="md:col-span-2">
        <label className="label">ISBN</label>
        <input name="isbn" defaultValue={buku?.isbn ?? ""} className="input" placeholder="978…" />
      </div>
      <div>
        <label className="label">Tahun</label>
        <input name="tahun_terbit" type="number" min={1000} max={2100} defaultValue={buku?.tahun_terbit ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Rak</label>
        <input name="rak" defaultValue={buku?.rak ?? ""} className="input" />
      </div>
      <div className="md:col-span-2">
        <label className="label">Jumlah eksemplar *</label>
        <input name="jumlah" type="number" min={0} required defaultValue={buku?.jumlah ?? 1} className="input" />
        <p className="mt-1 text-xs text-tinta-2">Menambah eksemplar otomatis memberi giliran ke antrian.</p>
      </div>

      <div className="md:col-span-4">
        <label className="label">Sinopsis</label>
        <textarea name="sinopsis" rows={8} defaultValue={buku?.sinopsis ?? ""} className="input" placeholder="Ringkasan isi buku yang tampil di halaman depan…" />
      </div>
      <div className="md:col-span-2">
        <label className="label">Cover (JPG/PNG/WebP, maks 2 MB)</label>
        <input name="cover" type="file" accept="image/*" className="input file:mr-3 file:rounded file:border-0 file:bg-kertas-2 file:px-2 file:py-1" />
        {buku?.cover_url && (
          <div className="mt-3 space-y-2">
            <img src={buku.cover_url} alt="" className="w-28 rounded shadow" />
            <label className="flex items-center gap-2 text-xs text-tinta-2">
              <input type="checkbox" name="hapus_cover" value="1" /> Hapus cover
            </label>
          </div>
        )}
      </div>

      <div className="flex gap-2 md:col-span-6">
        <Tombol teksProses="Menyimpan…">Simpan</Tombol>
        <Link href="/admin/buku" className="btn-garis">Batal</Link>
      </div>
    </form>
  );
}
