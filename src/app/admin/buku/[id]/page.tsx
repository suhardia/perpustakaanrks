import Link from "next/link";
import { notFound } from "next/navigation";
import Flash from "@/components/Flash";
import FormBuku from "@/components/FormBuku";
import { createClient } from "@/lib/supabase/server";
import { tanggal } from "@/lib/format";
import type { AntrianDetail, Buku, Kategori, PeminjamanDetail } from "@/lib/types";

export const metadata = { title: "Ubah Buku" };

export default async function UbahBuku(props: PageProps<"/admin/buku/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const supabase = await createClient();

  const [{ data: buku }, { data: kategori }, { data: pinjam }, { data: antre }] = await Promise.all([
    supabase.from("buku").select("*").eq("id", Number(id)).maybeSingle(),
    supabase.from("kategori").select("id, nama").order("nama"),
    supabase.from("peminjaman_detail").select("*").eq("buku_id", Number(id)).eq("status", "dipinjam"),
    supabase.from("antrian_detail").select("*").eq("buku_id", Number(id)).in("status", ["menunggu", "siap_diambil"]).order("created_at"),
  ]);
  if (!buku) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ubah Buku</h1>
        <Link href={`/buku/${id}`} className="text-sm text-utama hover:underline">Lihat di halaman publik →</Link>
      </div>
      <Flash pesan={sp.pesan} error={sp.error} />
      <FormBuku buku={buku as Buku} kategori={(kategori ?? []) as Kategori[]} />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="kartu p-5">
          <h2 className="mb-2 font-semibold">Sedang dipinjam</h2>
          {(pinjam ?? []).length === 0 ? <p className="text-sm text-tinta-2">Tidak ada.</p> : (
            <ul className="space-y-1 text-sm">
              {(pinjam as PeminjamanDetail[]).map((p) => (
                <li key={p.id}>{p.anggota_nama} ({p.no_anggota}) · jatuh tempo {tanggal(p.tgl_jatuh_tempo)}</li>
              ))}
            </ul>
          )}
        </section>
        <section className="kartu p-5">
          <h2 className="mb-2 font-semibold">Antrian</h2>
          {(antre ?? []).length === 0 ? <p className="text-sm text-tinta-2">Tidak ada.</p> : (
            <ol className="space-y-1 text-sm">
              {(antre as AntrianDetail[]).map((a) => (
                <li key={a.id}>
                  {a.status === "siap_diambil" ? "✓ Siap diambil" : `ke-${a.posisi}`} · {a.anggota_nama} ({a.no_anggota})
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
