import Link from "next/link";
import { redirect } from "next/navigation";
import Flash from "@/components/Flash";
import Sampul from "@/components/Sampul";
import Tombol from "@/components/Tombol";
import { batalkanAntrian, perpanjang, ubahProfil } from "@/app/actions/anggota";
import { createClient } from "@/lib/supabase/server";
import { getPengaturan, wajibMasuk } from "@/lib/auth";
import { rupiah, tanggal } from "@/lib/format";
import type { AntrianDetail, PeminjamanDetail } from "@/lib/types";

export const metadata = { title: "Akun Saya" };

const LABEL_ANTRIAN: Record<string, string> = {
  selesai: "Sudah diambil",
  dibatalkan: "Dibatalkan",
  kedaluwarsa: "Tidak diambil (kedaluwarsa)",
};

export default async function AkunSaya(props: PageProps<"/akun">) {
  const sp = await props.searchParams;
  const profil = await wajibMasuk();
  if (profil.role === "admin") redirect("/admin");

  const supabase = await createClient();
  const pengaturan = await getPengaturan();
  const [{ data: antrianData }, { data: pinjamData }] = await Promise.all([
    supabase.from("antrian_detail").select("*").eq("anggota_id", profil.id).order("created_at", { ascending: false }).limit(30),
    supabase.from("peminjaman_detail").select("*").eq("anggota_id", profil.id).order("tgl_pinjam", { ascending: false }).limit(50),
  ]);
  const antrian = (antrianData ?? []) as AntrianDetail[];
  const pinjaman = (pinjamData ?? []) as PeminjamanDetail[];

  const siap = antrian.filter((a) => a.status === "siap_diambil");
  const menunggu = antrian.filter((a) => a.status === "menunggu");
  const riwayatAntrian = antrian.filter((a) => !["siap_diambil", "menunggu"].includes(a.status)).slice(0, 10);
  const aktif = pinjaman.filter((p) => p.status === "dipinjam");
  const riwayat = pinjaman.filter((p) => p.status === "dikembalikan");
  const totalDenda = aktif.reduce((s, p) => s + p.denda_berjalan, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Flash pesan={sp.pesan} error={sp.error} />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* ---------- Kartu anggota & profil ---------- */}
        <aside className="space-y-4">
          <div className="rounded-xl bg-gradient-to-br from-utama to-utama-gelap p-5 text-white shadow-lg">
            <p className="text-xs tracking-widest text-white/70 uppercase">Kartu Anggota</p>
            <p className="mt-1 text-sm text-white/80">{pengaturan.nama_perpustakaan}</p>
            <p className="mt-5 font-mono text-2xl font-bold tracking-wider">{profil.no_anggota}</p>
            <p className="mt-1 text-lg">{profil.nama}</p>
            <p className="mt-3 text-xs text-white/70">Tunjukkan nomor ini kepada pustakawan saat mengambil buku.</p>
          </div>

          <details className="kartu p-4">
            <summary className="cursor-pointer text-sm font-semibold">Ubah profil</summary>
            <form action={ubahProfil} className="mt-4 space-y-3">
              <div>
                <label className="label">Nama</label>
                <input name="nama" defaultValue={profil.nama} required className="input" />
              </div>
              <div>
                <label className="label">No. HP</label>
                <input name="no_hp" defaultValue={profil.no_hp ?? ""} className="input" />
              </div>
              <div>
                <label className="label">Alamat</label>
                <textarea name="alamat" defaultValue={profil.alamat ?? ""} rows={2} className="input" />
              </div>
              <p className="text-xs text-tinta-2">Email: {profil.email}</p>
              <Tombol className="btn-utama w-full">Simpan</Tombol>
            </form>
          </details>

          <div className="kartu p-4 text-xs leading-relaxed text-tinta-2">
            <p className="mb-1 font-semibold text-tinta">Aturan peminjaman</p>
            Lama pinjam {pengaturan.lama_pinjam} hari · maks {pengaturan.maks_pinjam} buku · maks {pengaturan.maks_antrian} antrian ·
            denda {rupiah(pengaturan.denda_per_hari)}/hari · perpanjang {pengaturan.maks_perpanjang}× (jika tidak ada yang mengantre) ·
            buku antrian wajib diambil dalam {pengaturan.batas_ambil_hari} hari.
          </div>
        </aside>

        <div className="space-y-8">
          {/* ---------- Siap diambil ---------- */}
          {siap.length > 0 && (
            <section className="rounded-xl border-2 border-sukses/40 bg-sukses-muda p-5">
              <h2 className="text-lg font-semibold text-sukses">🎉 Buku siap diambil</h2>
              <p className="text-sm text-sukses/90">Datang ke meja pustakawan dan sebutkan nomor anggota Anda.</p>
              <ul className="mt-4 space-y-3">
                {siap.map((a) => (
                  <li key={a.id} className="flex items-center gap-4 rounded-lg bg-white p-3">
                    <div className="w-12 shrink-0"><Sampul id={a.buku_id} judul={a.judul} coverUrl={a.cover_url} kecil /></div>
                    <div className="flex-1">
                      <Link href={`/buku/${a.buku_id}`} className="font-semibold hover:text-utama">{a.judul}</Link>
                      <p className="text-sm">Ambil paling lambat <strong>{tanggal(a.batas_ambil)}</strong></p>
                    </div>
                    <BatalAntrian id={a.id} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ---------- Sedang dipinjam ---------- */}
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-xl font-semibold">Sedang Dipinjam ({aktif.length})</h2>
              {totalDenda > 0 && <span className="text-sm font-semibold text-bahaya">Denda berjalan: {rupiah(totalDenda)}</span>}
            </div>
            {aktif.length === 0 ? (
              <p className="kartu p-6 text-center text-sm text-tinta-2">
                Tidak ada buku yang sedang Anda pinjam. <Link href="/" className="text-utama underline">Jelajahi koleksi</Link>
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {aktif.map((p) => {
                  const terlambat = p.hari_terlambat > 0;
                  return (
                    <li key={p.id} className={`kartu flex gap-4 p-4 ${terlambat ? "border-bahaya/40" : ""}`}>
                      <div className="w-16 shrink-0"><Sampul id={p.buku_id} judul={p.judul} coverUrl={p.cover_url} kecil /></div>
                      <div className="flex-1 text-sm">
                        <Link href={`/buku/${p.buku_id}`} className="font-semibold hover:text-utama">{p.judul}</Link>
                        <p className="text-tinta-2">Dipinjam {tanggal(p.tgl_pinjam)}</p>
                        <p className={terlambat ? "font-semibold text-bahaya" : "font-medium"}>
                          Jatuh tempo {tanggal(p.tgl_jatuh_tempo)}
                          {terlambat && ` · terlambat ${p.hari_terlambat} hari (${rupiah(p.denda_berjalan)})`}
                        </p>
                        {!terlambat && p.jumlah_perpanjang < pengaturan.maks_perpanjang && (
                          <form action={perpanjang} className="mt-2">
                            <input type="hidden" name="peminjaman_id" value={p.id} />
                            <input type="hidden" name="kembali" value="/akun" />
                            <Tombol className="btn-garis btn-kecil">Perpanjang {pengaturan.lama_pinjam} hari</Tombol>
                          </form>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ---------- Antrian ---------- */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">Antrian Saya ({menunggu.length})</h2>
            {menunggu.length === 0 ? (
              <p className="kartu p-6 text-center text-sm text-tinta-2">
                Tidak ada antrian. Buku yang sedang dipinjam orang lain bisa Anda antre dari halaman koleksi.
              </p>
            ) : (
              <ul className="space-y-2">
                {menunggu.map((a) => (
                  <li key={a.id} className="kartu flex items-center gap-4 p-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-aksen-muda text-center">
                      <span className="text-xs leading-none text-aksen">ke-<br /><strong className="text-lg">{a.posisi}</strong></span>
                    </div>
                    <div className="flex-1 text-sm">
                      <Link href={`/buku/${a.buku_id}`} className="font-semibold hover:text-utama">{a.judul}</Link>
                      <p className="text-tinta-2">Mengantre sejak {tanggal(a.created_at)}</p>
                    </div>
                    <BatalAntrian id={a.id} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---------- Riwayat ---------- */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">Riwayat Peminjaman</h2>
            {riwayat.length === 0 ? (
              <p className="text-sm text-tinta-2">Belum ada riwayat.</p>
            ) : (
              <div className="kartu overflow-x-auto">
                <table className="tabel">
                  <thead>
                    <tr><th>Buku</th><th>Pinjam</th><th>Kembali</th><th>Denda</th></tr>
                  </thead>
                  <tbody>
                    {riwayat.map((p) => (
                      <tr key={p.id}>
                        <td className="font-medium">{p.judul}</td>
                        <td>{tanggal(p.tgl_pinjam)}</td>
                        <td>{tanggal(p.tgl_kembali)}</td>
                        <td className={p.denda > 0 ? "text-bahaya" : ""}>{p.denda > 0 ? rupiah(p.denda) : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {riwayatAntrian.length > 0 && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-tinta-2">Riwayat antrian ({riwayatAntrian.length})</summary>
                <ul className="mt-2 space-y-1">
                  {riwayatAntrian.map((a) => (
                    <li key={a.id} className="text-tinta-2">
                      {tanggal(a.created_at)} · <span className="text-tinta">{a.judul}</span> · {LABEL_ANTRIAN[a.status] ?? a.status}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function BatalAntrian({ id }: { id: number }) {
  return (
    <form action={batalkanAntrian}>
      <input type="hidden" name="antrian_id" value={id} />
      <input type="hidden" name="kembali" value="/akun" />
      <Tombol className="btn-bahaya btn-kecil" konfirmasi="Batalkan antrian ini?">Batalkan</Tombol>
    </form>
  );
}
