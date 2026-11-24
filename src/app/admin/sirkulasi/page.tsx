import Link from "next/link";
import Flash from "@/components/Flash";
import Tombol from "@/components/Tombol";
import { catatPeminjaman, kembalikanBuku, perpanjangAdmin } from "@/app/actions/admin";
import { createClient } from "@/lib/supabase/server";
import { getPengaturan } from "@/lib/auth";
import { bersihkanCari, rupiah, tanggal } from "@/lib/format";
import type { BukuStatus, PeminjamanDetail, Profil } from "@/lib/types";

export const metadata = { title: "Sirkulasi" };

const TAB = { dipinjam: "Sedang dipinjam", terlambat: "Terlambat", dikembalikan: "Sudah kembali" } as const;
type Tab = keyof typeof TAB;

export default async function Sirkulasi(props: PageProps<"/admin/sirkulasi">) {
  const sp = await props.searchParams;
  const tab: Tab = sp.tab === "terlambat" || sp.tab === "dikembalikan" ? sp.tab : "dipinjam";
  const q = typeof sp.q === "string" ? sp.q : "";
  const kembali = `/admin/sirkulasi?tab=${tab}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  const supabase = await createClient();
  const pengaturan = await getPengaturan();

  let query = supabase.from("peminjaman_detail").select("*");
  if (tab === "dipinjam") query = query.eq("status", "dipinjam").order("tgl_jatuh_tempo");
  if (tab === "terlambat") query = query.eq("status", "dipinjam").gt("hari_terlambat", 0).order("tgl_jatuh_tempo");
  if (tab === "dikembalikan") query = query.eq("status", "dikembalikan").order("tgl_kembali", { ascending: false });
  const kata = bersihkanCari(q);
  if (kata) query = query.or(`judul.ilike.%${kata}%,anggota_nama.ilike.%${kata}%,no_anggota.ilike.%${kata}%`);

  const [{ data: list }, { data: anggota }, { data: buku }] = await Promise.all([
    query.limit(200),
    supabase.from("profiles").select("id, nama, no_anggota").eq("role", "anggota").order("nama"),
    supabase.from("buku_status").select("id, judul, isbn, tersedia").gt("tersedia", 0).order("judul"),
  ]);
  const data = (list ?? []) as PeminjamanDetail[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Sirkulasi Peminjaman</h1>
      <Flash pesan={sp.pesan} error={sp.error} />

      {/* ---------- Catat peminjaman langsung ---------- */}
      <section className="kartu p-5">
        <h2 className="font-semibold">Catat peminjaman di meja layanan</h2>
        <p className="mb-4 text-xs text-tinta-2">
          Daftar buku hanya berisi eksemplar yang bebas (tidak dipinjam dan tidak disisihkan untuk antrian). Untuk anggota yang
          antriannya sudah “siap diambil”, gunakan tombol Serahkan di menu Antrian. Jatuh tempo otomatis {pengaturan.lama_pinjam} hari.
        </p>
        <form action={catatPeminjaman} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input type="hidden" name="kembali" value={kembali} />
          <select name="anggota_id" required className="input" defaultValue="">
            <option value="" disabled>Pilih anggota…</option>
            {((anggota ?? []) as Pick<Profil, "id" | "nama" | "no_anggota">[]).map((a) => (
              <option key={a.id} value={a.id}>{a.no_anggota} — {a.nama}</option>
            ))}
          </select>
          <select name="buku_id" required className="input" defaultValue="">
            <option value="" disabled>Pilih buku tersedia…</option>
            {((buku ?? []) as Pick<BukuStatus, "id" | "judul" | "isbn" | "tersedia">[]).map((b) => (
              <option key={b.id} value={b.id}>{b.judul} {b.isbn ? `(${b.isbn})` : ""} · sisa {b.tersedia}</option>
            ))}
          </select>
          <Tombol>Simpan Peminjaman</Tombol>
        </form>
      </section>

      {/* ---------- Daftar ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-kertas-2 p-1 text-sm">
          {(Object.keys(TAB) as Tab[]).map((t) => (
            <Link
              key={t}
              href={`/admin/sirkulasi?tab=${t}`}
              className={`rounded-md px-3 py-1.5 ${tab === t ? "bg-white font-semibold shadow-sm" : "text-tinta-2"}`}
            >
              {TAB[t]}
            </Link>
          ))}
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="tab" value={tab} />
          <input name="q" defaultValue={q} placeholder="Cari judul / nama / no. anggota" className="input w-64" />
          <button className="btn-garis">Cari</button>
        </form>
      </div>

      <div className="kartu overflow-x-auto">
        <table className="tabel">
          <thead>
            <tr><th>Anggota</th><th>Buku</th><th>Pinjam</th><th>Jatuh tempo</th>{tab === "dikembalikan" && <th>Kembali</th>}<th>Denda</th><th></th></tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-tinta-2">Tidak ada data.</td></tr>
            )}
            {data.map((p) => (
              <tr key={p.id}>
                <td><span className="font-medium">{p.anggota_nama}</span><br /><span className="text-xs text-tinta-2">{p.no_anggota}</span></td>
                <td className="max-w-xs">{p.judul}</td>
                <td>{tanggal(p.tgl_pinjam)}</td>
                <td className={p.status === "dipinjam" && p.hari_terlambat > 0 ? "font-semibold text-bahaya" : ""}>
                  {tanggal(p.tgl_jatuh_tempo)}
                  {p.status === "dipinjam" && p.hari_terlambat > 0 && <><br /><span className="text-xs">terlambat {p.hari_terlambat} hari</span></>}
                  {p.jumlah_perpanjang > 0 && <><br /><span className="text-xs text-tinta-2">diperpanjang {p.jumlah_perpanjang}×</span></>}
                </td>
                {tab === "dikembalikan" && <td>{tanggal(p.tgl_kembali)}</td>}
                <td className={p.denda_berjalan > 0 ? "text-bahaya" : "text-tinta-2"}>{p.denda_berjalan > 0 ? rupiah(p.denda_berjalan) : "-"}</td>
                <td className="text-right whitespace-nowrap">
                  {p.status === "dipinjam" && (
                    <div className="flex justify-end gap-2">
                      {p.hari_terlambat === 0 && p.jumlah_perpanjang < pengaturan.maks_perpanjang && (
                        <form action={perpanjangAdmin}>
                          <input type="hidden" name="peminjaman_id" value={p.id} />
                          <input type="hidden" name="kembali" value={kembali} />
                          <Tombol className="btn-garis btn-kecil">Perpanjang</Tombol>
                        </form>
                      )}
                      <form action={kembalikanBuku}>
                        <input type="hidden" name="peminjaman_id" value={p.id} />
                        <input type="hidden" name="kembali" value={kembali} />
                        <Tombol
                          className="btn-utama btn-kecil"
                          konfirmasi={`Proses pengembalian "${p.judul}" dari ${p.anggota_nama}?${p.denda_berjalan > 0 ? ` Denda ${rupiah(p.denda_berjalan)}.` : ""}`}
                        >
                          Kembalikan
                        </Tombol>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
