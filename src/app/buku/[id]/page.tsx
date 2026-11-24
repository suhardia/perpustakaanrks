import Link from "next/link";
import { notFound } from "next/navigation";
import Flash from "@/components/Flash";
import Sampul from "@/components/Sampul";
import StatusBuku from "@/components/StatusBuku";
import AksiPinjam from "@/components/AksiPinjam";
import { createClient } from "@/lib/supabase/server";
import { getPengaturan, getProfil } from "@/lib/auth";
import { getStatusSaya } from "@/lib/data";
import { tanggal } from "@/lib/format";
import type { BukuStatus } from "@/lib/types";

export default async function DetailBuku(props: PageProps<"/buku/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("buku_status").select("*").eq("id", Number(id)).maybeSingle();
  if (!data) notFound();
  const buku = data as BukuStatus;

  const [profil, pengaturan] = await Promise.all([getProfil(), getPengaturan()]);
  const saya = await getStatusSaya(profil);
  const kembali = `/buku/${buku.id}`;

  const info: [string, string | number | null][] = [
    ["Pengarang", buku.pengarang],
    ["Penerbit", buku.penerbit],
    ["Tahun terbit", buku.tahun_terbit],
    ["ISBN", buku.isbn],
    ["Kategori", buku.kategori_nama],
    ["Lokasi rak", buku.rak],
    ["Jumlah eksemplar", buku.jumlah],
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm text-tinta-2 hover:text-utama">← Kembali ke koleksi</Link>
      <div className="mt-4">
        <Flash pesan={sp.pesan} error={sp.error} />
      </div>

      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <div className="mx-auto w-48 md:w-full">
          <Sampul id={buku.id} judul={buku.judul} pengarang={buku.pengarang} coverUrl={buku.cover_url} />
        </div>

        <div>
          {buku.kategori_nama && (
            <span className="text-xs font-semibold tracking-wider text-aksen uppercase">{buku.kategori_nama}</span>
          )}
          <h1 className="mt-1 text-3xl font-semibold">{buku.judul}</h1>
          <p className="mt-1 text-lg text-tinta-2">{buku.pengarang}</p>

          <div className="kartu mt-5 space-y-3 p-4">
            <StatusBuku buku={buku} lengkap />
            <div className="max-w-sm">
              <AksiPinjam
                buku={buku}
                profil={profil}
                antrian={saya.antrian.get(buku.id)}
                pinjaman={saya.pinjaman.get(buku.id)}
                kembali={kembali}
              />
            </div>
            <p className="text-xs text-tinta-2">
              Lama pinjam {pengaturan.lama_pinjam} hari. Buku yang disiapkan untuk antrian harus diambil dalam{" "}
              {pengaturan.batas_ambil_hari} hari, jika tidak giliran berpindah ke antrian berikutnya.
            </p>
          </div>

          <h2 className="mt-8 text-xl font-semibold">Sinopsis</h2>
          <p className="mt-2 leading-relaxed whitespace-pre-line text-tinta-2">{buku.sinopsis ?? "Belum ada sinopsis."}</p>

          <h2 className="mt-8 text-xl font-semibold">Informasi Buku</h2>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {info.map(([k, v]) => (
              <div key={k} className="flex gap-3 border-b border-garis/60 py-1.5">
                <dt className="w-36 shrink-0 text-tinta-2">{k}</dt>
                <dd className="font-medium">{v ?? "-"}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-tinta-2">Ditambahkan {tanggal(buku.created_at)}</p>
        </div>
      </div>
    </div>
  );
}
