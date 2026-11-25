/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import Flash from "@/components/Flash";
import Tombol from "@/components/Tombol";
import { imporBuku } from "@/app/actions/admin";
import { createClient } from "@/lib/supabase/server";
import { ambilIndeks, BI_KATEGORI, type BarisIndeks } from "@/lib/bukuIndonesia";
import type { Kategori } from "@/lib/types";

export const metadata = { title: "Impor Katalog" };

const PER_HALAMAN = 40;

export default async function Impor(props: PageProps<"/admin/impor">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const kat = typeof sp.kat === "string" ? sp.kat : "";
  const kurasi = sp.kurasi === "1";
  const pilihSemua = sp.pilih === "semua";
  const halaman = Math.max(Number(sp.hal) || 1, 1);

  // URL halaman ini, agar setelah impor kembali ke posisi yang sama
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (kat) params.set("kat", kat);
  if (kurasi) params.set("kurasi", "1");
  if (halaman > 1) params.set("hal", String(halaman));
  const urlDengan = (ubah: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(ubah)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    return `/admin/impor?${p.toString()}`;
  };
  const kembali = urlDengan({});

  let indeks: BarisIndeks[] = [];
  let errorApi: string | null = null;
  try {
    indeks = await ambilIndeks();
  } catch (e) {
    errorApi = `Tidak dapat mengambil data dari API Buku Indonesia: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Saring di server
  const kata = q.toLowerCase();
  const tersaring = indeks.filter(
    (b) =>
      (!kat || b.kategori.includes(kat)) &&
      (!kurasi || b.dikurasi) &&
      (!kata ||
        b.judul.toLowerCase().includes(kata) ||
        b.pengarang.some((a) => a.toLowerCase().includes(kata)) ||
        (b.isbn ?? "").includes(kata)),
  );
  const total = tersaring.length;
  const jumlahHalaman = Math.max(Math.ceil(total / PER_HALAMAN), 1);
  const tampil = tersaring.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN);

  // Tandai buku yang sudah ada di koleksi
  const supabase = await createClient();
  const isbnTampil = tampil.map((b) => b.isbn).filter((x): x is string => Boolean(x));
  const [{ data: adaSumber }, { data: adaIsbn }, { data: kategoriLokal }] = await Promise.all([
    tampil.length ? supabase.from("buku").select("sumber_id").in("sumber_id", tampil.map((b) => b.id)) : Promise.resolve({ data: [] }),
    isbnTampil.length ? supabase.from("buku").select("isbn").in("isbn", isbnTampil) : Promise.resolve({ data: [] }),
    supabase.from("kategori").select("id, nama").order("nama"),
  ]);
  const sudahAda = new Set<string>([
    ...((adaSumber ?? []) as { sumber_id: string }[]).map((r) => r.sumber_id),
    ...((adaIsbn ?? []) as { isbn: string }[]).map((r) => `isbn:${r.isbn}`),
  ]);
  const ada = (b: BarisIndeks) => sudahAda.has(b.id) || (b.isbn ? sudahAda.has(`isbn:${b.isbn}`) : false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Impor Katalog dari “Buku Indonesia”</h1>
        <p className="mt-1 max-w-3xl text-sm text-tinta-2">
          Sumber: API{" "}
          <a href="https://github.com/khrlanamm/buku-indonesia" target="_blank" rel="noreferrer" className="text-utama underline">
            Buku Indonesia
          </a>{" "}
          (±3.000 judul, data CC0). Cari buku yang dimiliki perpustakaan, centang, isi <strong>jumlah eksemplar</strong>,
          lalu klik Impor. Judul, pengarang, penerbit, tahun, ISBN, kategori, dan cover (Open Library) terisi otomatis.
          <strong> Sinopsis tidak tersedia dari API</strong>, jadi lengkapi lewat menu Buku → Ubah.
        </p>
      </div>
      <Flash pesan={sp.pesan} error={sp.error ?? errorApi ?? undefined} />

      {/* ---------- Pencarian ---------- */}
      <form className="kartu flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-60 flex-1">
          <label className="label">Cari judul / pengarang / ISBN</label>
          <input name="q" defaultValue={q} className="input" placeholder="mis. Pramoedya, Laskar Pelangi…" />
        </div>
        <div>
          <label className="label">Kategori API</label>
          <select name="kat" defaultValue={kat} className="input">
            <option value="">Semua kategori</option>
            {BI_KATEGORI.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="kurasi" value="1" defaultChecked={kurasi} /> Hanya data terkurasi
        </label>
        <button className="btn-utama">Cari</button>
      </form>

      {/* ---------- Hasil + form impor ---------- */}
      <form action={imporBuku} className="space-y-3">
        <input type="hidden" name="kembali" value={kembali} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-tinta-2">
            {total.toLocaleString("id-ID")} judul cocok · halaman {halaman} dari {jumlahHalaman}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link href={urlDengan({ pilih: pilihSemua ? null : "semua" })} className="btn-garis btn-kecil">
              {pilihSemua ? "Batalkan pilih semua" : "Pilih semua di halaman ini"}
            </Link>
            <label className="text-tinta-2">Jumlah bawaan</label>
            <input name="jumlah_bawaan" type="number" min={0} defaultValue={1} className="input w-20 py-1.5" />
            <select name="kategori_tujuan" defaultValue="0" className="input w-56 py-1.5">
              <option value="0">Kategori: ikuti kategori API</option>
              {((kategoriLokal ?? []) as Kategori[]).map((k) => (
                <option key={k.id} value={k.id}>Masukkan ke: {k.nama}</option>
              ))}
            </select>
            <Tombol teksProses="Mengimpor…">Impor yang dicentang</Tombol>
          </div>
        </div>

        <div className="kartu overflow-x-auto">
          <table className="tabel">
            <thead>
              <tr><th className="w-10"></th><th className="w-12"></th><th>Judul</th><th>Pengarang / Penerbit</th><th>Kategori</th><th>ISBN</th><th className="w-28">Jumlah eks.</th></tr>
            </thead>
            <tbody>
              {tampil.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-tinta-2">{errorApi ? "Data API tidak tersedia." : "Tidak ada judul yang cocok."}</td></tr>
              )}
              {tampil.map((b) => {
                const sudah = ada(b);
                return (
                  <tr key={b.id} className={sudah ? "opacity-60" : ""}>
                    <td>
                      {sudah ? (
                        <span title="Sudah ada di koleksi">✓</span>
                      ) : (
                        <input type="checkbox" name="pilih" value={b.id} defaultChecked={pilihSemua} className="h-4 w-4" />
                      )}
                    </td>
                    <td>
                      {b.coverKecil ? (
                        <img src={b.coverKecil} alt="" loading="lazy" className="h-12 w-8 rounded object-cover shadow-sm" />
                      ) : (
                        <div className="h-12 w-8 rounded bg-kertas-2" />
                      )}
                    </td>
                    <td>
                      <span className="font-semibold">{b.judul}</span>
                      {b.subjudul && <span className="text-tinta-2">: {b.subjudul}</span>}
                      <div className="text-xs text-tinta-2">
                        {b.tahun ?? "-"}
                        {b.dikurasi && <span className="ml-2 rounded bg-sukses-muda px-1.5 text-sukses">terkurasi</span>}
                        {sudah && <span className="ml-2 rounded bg-utama-muda px-1.5 text-utama">sudah di koleksi</span>}
                      </div>
                    </td>
                    <td className="text-xs">
                      {b.pengarang.join(", ") || "-"}
                      <br /><span className="text-tinta-2">{b.penerbit ?? ""}</span>
                    </td>
                    <td className="text-xs">{b.kategori.join(", ")}</td>
                    <td className="font-mono text-xs">{b.isbn ?? "-"}</td>
                    <td>
                      {!sudah && (
                        <input name={`jumlah_${b.id}`} type="number" min={0} max={10000} placeholder="bawaan" className="input w-24 py-1" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </form>

      {jumlahHalaman > 1 && (
        <nav className="flex items-center justify-center gap-2 text-sm">
          {halaman > 1 && <Link href={urlDengan({ hal: String(halaman - 1), pilih: null })} className="btn-garis btn-kecil">← Sebelumnya</Link>}
          <span className="px-3 text-tinta-2">Halaman {halaman} dari {jumlahHalaman}</span>
          {halaman < jumlahHalaman && <Link href={urlDengan({ hal: String(halaman + 1), pilih: null })} className="btn-garis btn-kecil">Berikutnya →</Link>}
        </nav>
      )}

      <p className="text-xs text-tinta-2">
        Data katalog: Buku Indonesia oleh khrlanamm (CC0 1.0). Gambar cover dari Open Library; hak cipta cover tetap milik
        pemiliknya.
      </p>
    </div>
  );
}
