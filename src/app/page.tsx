import Link from "next/link";
import Flash from "@/components/Flash";
import Sampul from "@/components/Sampul";
import StatusBuku from "@/components/StatusBuku";
import AksiPinjam from "@/components/AksiPinjam";
import QuoteAcak from "@/components/QuoteAcak";
import { createClient } from "@/lib/supabase/server";
import { getPengaturan, getProfil } from "@/lib/auth";
import { getStatusSaya } from "@/lib/data";
import { bersihkanCari } from "@/lib/format";
import { supabaseSiap } from "@/lib/supabase/env";
import type { BukuStatus, Kategori } from "@/lib/types";

const PER_HALAMAN = 24;

export default async function Beranda(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const kategoriId = Number(sp.kategori) || null;
  const status = sp.status === "tersedia" || sp.status === "dipinjam" ? sp.status : "";
  const halaman = Math.max(Number(sp.hal) || 1, 1);

  const [profil, pengaturan] = await Promise.all([getProfil(), getPengaturan()]);

  let buku: BukuStatus[] = [];
  let kategori: Kategori[] = [];
  let total = 0;
  let errorMuat: string | null = null;

  if (supabaseSiap) {
    const supabase = await createClient();
    let query = supabase.from("buku_status").select("*", { count: "exact" });
    const kata = bersihkanCari(q);
    if (kata) query = query.or(`judul.ilike.%${kata}%,pengarang.ilike.%${kata}%,isbn.ilike.%${kata}%`);
    if (kategoriId) query = query.eq("kategori_id", kategoriId);
    if (status === "tersedia") query = query.gt("tersedia", 0);
    if (status === "dipinjam") query = query.eq("tersedia", 0).gt("jumlah", 0);

    const dari = (halaman - 1) * PER_HALAMAN;
    const [hasil, kat] = await Promise.all([
      query.order("judul").range(dari, dari + PER_HALAMAN - 1),
      supabase.from("kategori").select("id, nama").order("nama"),
    ]);
    if (hasil.error) errorMuat = hasil.error.message;
    buku = (hasil.data ?? []) as BukuStatus[];
    total = hasil.count ?? 0;
    kategori = (kat.data ?? []) as Kategori[];
  }

  const saya = await getStatusSaya(profil);
  const jumlahHalaman = Math.max(Math.ceil(total / PER_HALAMAN), 1);

  // URL halaman ini (dipakai agar setelah aksi pengguna kembali ke posisi yang sama)
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (kategoriId) params.set("kategori", String(kategoriId));
  if (status) params.set("status", status);
  const urlDengan = (ubah: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(ubah)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    return s ? `/?${s}` : "/";
  };
  const kembali = urlDengan({ hal: halaman > 1 ? String(halaman) : null });

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <section className="border-b border-garis bg-gradient-to-b from-kertas-2 to-kertas">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="grid items-stretch gap-8 lg:grid-cols-[1fr_400px]">
          <div>
          <p className="text-sm font-semibold tracking-widest text-aksen uppercase">Katalog Koleksi</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-semibold sm:text-4xl">
            Temukan buku, lihat ketersediaannya, dan ajukan antrian peminjaman.
          </h1>
          <p className="mt-3 max-w-2xl text-tinta-2">
            Buku yang sedang dipinjam bisa Anda antre. Saat buku dikembalikan, buku langsung disiapkan untuk antrian
            terdepan dan bisa diambil dalam {pengaturan.batas_ambil_hari} hari.
          </p>

          <form className="mt-6 flex max-w-3xl flex-col gap-2 sm:flex-row" action="/">
            <input name="q" defaultValue={q} placeholder="Cari judul, pengarang, atau ISBN…" className="input flex-1 py-2.5" />
            {kategoriId && <input type="hidden" name="kategori" value={kategoriId} />}
            <select name="status" defaultValue={status} className="input sm:w-44">
              <option value="">Semua status</option>
              <option value="tersedia">Tersedia</option>
              <option value="dipinjam">Sedang dipinjam</option>
            </select>
            <button className="btn-utama py-2.5">Cari</button>
          </form>

          {kategori.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={urlDengan({ kategori: null, hal: null })}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${!kategoriId ? "border-utama bg-utama text-white" : "border-garis bg-white hover:border-utama"}`}
              >
                Semua
              </Link>
              {kategori.map((k) => (
                <Link
                  key={k.id}
                  href={urlDengan({ kategori: String(k.id), hal: null })}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${kategoriId === k.id ? "border-utama bg-utama text-white" : "border-garis bg-white hover:border-utama"}`}
                >
                  {k.nama}
                </Link>
              ))}
            </div>
          )}
          </div>
          <QuoteAcak />
          </div>
        </div>
      </section>

      {/* ---------- Koleksi ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Flash pesan={sp.pesan} error={sp.error ?? errorMuat ?? undefined} />

        {saya.antrian.size > 0 && (
          <div className="mb-6 rounded-lg border border-utama/20 bg-utama-muda px-4 py-3 text-sm text-utama">
            Anda punya {saya.antrian.size} antrian aktif.{" "}
            <Link href="/akun" className="font-semibold underline">Lihat di Akun Saya →</Link>
          </div>
        )}

        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">{q ? `Hasil pencarian “${q}”` : "Semua Koleksi"}</h2>
          <span className="text-sm text-tinta-2">{total} judul</span>
        </div>

        {buku.length === 0 ? (
          <div className="kartu p-10 text-center text-tinta-2">
            {supabaseSiap ? "Tidak ada buku yang cocok." : "Hubungkan Supabase untuk menampilkan koleksi."}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {buku.map((b) => (
              <article key={b.id} className="kartu flex gap-4 p-4 transition hover:shadow-md">
                <Link href={`/buku/${b.id}`} className="w-28 shrink-0 sm:w-32">
                  <Sampul id={b.id} judul={b.judul} pengarang={b.pengarang} coverUrl={b.cover_url} />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  {b.kategori_nama && (
                    <span className="text-[0.7rem] font-semibold tracking-wider text-aksen uppercase">{b.kategori_nama}</span>
                  )}
                  <Link href={`/buku/${b.id}`} className="hover:text-utama">
                    <h3 className="line-clamp-2 text-lg leading-snug font-semibold">{b.judul}</h3>
                  </Link>
                  <p className="text-sm text-tinta-2">{b.pengarang ?? "Tanpa nama pengarang"}</p>
                  <p className="mt-2 line-clamp-3 text-sm text-tinta-2/90">{b.sinopsis ?? "Belum ada sinopsis."}</p>
                  <div className="mt-auto space-y-2 pt-3">
                    <StatusBuku buku={b} />
                    <AksiPinjam
                      buku={b}
                      profil={profil}
                      antrian={saya.antrian.get(b.id)}
                      pinjaman={saya.pinjaman.get(b.id)}
                      kembali={kembali}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {jumlahHalaman > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-2 text-sm">
            {halaman > 1 && (
              <Link href={urlDengan({ hal: String(halaman - 1) })} className="btn-garis btn-kecil">← Sebelumnya</Link>
            )}
            <span className="px-3 text-tinta-2">Halaman {halaman} dari {jumlahHalaman}</span>
            {halaman < jumlahHalaman && (
              <Link href={urlDengan({ hal: String(halaman + 1) })} className="btn-garis btn-kecil">Berikutnya →</Link>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
