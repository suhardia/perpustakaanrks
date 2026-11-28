"use client";

import { useMemo, useState } from "react";
import Tombol from "@/components/Tombol";
import { imporGoodreads } from "@/app/actions/admin";
import { bacaGoodreads, rapikanJudul, type BukuGoodreads } from "@/lib/goodreads";
import type { Kategori } from "@/lib/types";

const NAMA_RAK: Record<string, string> = {
  read: "Sudah dibaca (read)",
  "to-read": "Ingin dibaca (to-read)",
  "currently-reading": "Sedang dibaca (currently-reading)",
};

/**
 * Pratinjau & pemilihan buku dari file ekspor Goodreads.
 * File dibaca di browser; hanya buku yang dicentang yang dikirim ke server.
 */
export default function ImporGoodreads({
  isbnAda,
  sumberAda,
  kategori,
}: {
  isbnAda: string[];
  sumberAda: string[];
  kategori: Kategori[];
}) {
  const [buku, setBuku] = useState<BukuGoodreads[]>([]);
  const [namaFile, setNamaFile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rakDipilih, setRakDipilih] = useState<Set<string>>(new Set());
  const [tidakDipilih, setTidakDipilih] = useState<Set<string>>(new Set()); // grId yang di-uncheck
  const [jumlahKhusus, setJumlahKhusus] = useState<Record<string, string>>({});
  const [jumlahBawaan, setJumlahBawaan] = useState("1");
  const [rapikan, setRapikan] = useState(true);
  const [cari, setCari] = useState("");

  const sudahAda = useMemo(() => {
    const isbn = new Set(isbnAda);
    const sumber = new Set(sumberAda);
    return (b: BukuGoodreads) => sumber.has(`gr_${b.grId}`) || (b.isbn ? isbn.has(b.isbn) : false);
  }, [isbnAda, sumberAda]);

  const daftarRak = useMemo(() => {
    const hitung = new Map<string, number>();
    for (const b of buku) hitung.set(b.rak, (hitung.get(b.rak) ?? 0) + 1);
    return [...hitung.entries()].sort((a, b) => b[1] - a[1]);
  }, [buku]);

  async function pilihFile(file: File | undefined) {
    setError(null);
    setBuku([]);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("File terlalu besar (maks 5 MB).");
      return;
    }
    const hasil = bacaGoodreads(await file.text());
    if (!hasil.ok) {
      setError(hasil.pesan);
      return;
    }
    setNamaFile(file.name);
    setBuku(hasil.buku);
    setRakDipilih(new Set(hasil.buku.map((b) => b.rak)));
    setTidakDipilih(new Set());
    setJumlahKhusus({});
  }

  const bawaan = Math.max(0, Math.min(10000, Math.floor(Number(jumlahBawaan) || 0)));
  const jumlahUntuk = (b: BukuGoodreads) => {
    const k = jumlahKhusus[b.grId];
    if (k !== undefined && k !== "") return Math.max(0, Math.min(10000, Math.floor(Number(k) || 0)));
    return b.dimiliki > 0 ? b.dimiliki : bawaan;
  };

  const kata = cari.trim().toLowerCase();
  const tampil = buku.filter(
    (b) =>
      rakDipilih.has(b.rak) &&
      (!kata || b.judul.toLowerCase().includes(kata) || (b.pengarang ?? "").toLowerCase().includes(kata) || (b.isbn ?? "").includes(kata)),
  );
  const akanDiimpor = buku.filter((b) => rakDipilih.has(b.rak) && !sudahAda(b) && !tidakDipilih.has(b.grId));
  const jumlahAda = buku.filter(sudahAda).length;
  const data = JSON.stringify(akanDiimpor.map((b) => ({ ...b, jumlah: jumlahUntuk(b) })));

  function ubahRak(rak: string, aktif: boolean) {
    const s = new Set(rakDipilih);
    if (aktif) s.add(rak);
    else s.delete(rak);
    setRakDipilih(s);
  }
  function centangSemua(aktif: boolean) {
    const s = new Set(tidakDipilih);
    for (const b of tampil) {
      if (aktif) s.delete(b.grId);
      else s.add(b.grId);
    }
    setTidakDipilih(s);
  }

  return (
    <div className="space-y-6">
      {/* ---------- Langkah 1: pilih file ---------- */}
      <section className="kartu space-y-3 p-5">
        <h2 className="font-semibold">1. Pilih file ekspor Goodreads (.csv)</h2>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => pilihFile(e.target.files?.[0])}
          className="input file:mr-3 file:rounded file:border-0 file:bg-kertas-2 file:px-2 file:py-1"
        />
        {error && <p className="text-sm text-bahaya">{error}</p>}
        {buku.length > 0 && (
          <p className="text-sm text-tinta-2">
            <strong className="text-tinta">{namaFile}</strong>: {buku.length} buku terbaca
            {jumlahAda > 0 && `, ${jumlahAda} sudah ada di koleksi (otomatis dilewati)`}.
          </p>
        )}
      </section>

      {buku.length > 0 && (
        <form action={imporGoodreads} className="space-y-6">
          <input type="hidden" name="data" value={data} />
          <input type="hidden" name="rapikan_judul" value={rapikan ? "1" : "0"} />

          {/* ---------- Langkah 2: pengaturan ---------- */}
          <section className="kartu grid gap-5 p-5 md:grid-cols-3">
            <div>
              <h2 className="mb-2 font-semibold">2. Rak yang diimpor</h2>
              {daftarRak.map(([rak, n]) => (
                <label key={rak} className="flex items-center gap-2 py-0.5 text-sm">
                  <input type="checkbox" checked={rakDipilih.has(rak)} onChange={(e) => ubahRak(rak, e.target.checked)} />
                  {NAMA_RAK[rak] ?? rak} <span className="text-tinta-2">({n})</span>
                </label>
              ))}
              <p className="mt-2 text-xs text-tinta-2">Pilih rak berisi buku yang benar-benar dimiliki TBM.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Jumlah eksemplar bawaan</label>
                <input type="number" min={0} value={jumlahBawaan} onChange={(e) => setJumlahBawaan(e.target.value)} className="input w-28" />
                <p className="mt-1 text-xs text-tinta-2">
                  Dipakai jika kolom “Owned Copies” di Goodreads kosong. Isi 0 bila ingin mengisi manual nanti.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={rapikan} onChange={(e) => setRapikan(e.target.checked)} />
                Hapus keterangan seri, mis. “(Tetralogi Buru, #1)”
              </label>
            </div>
            <div>
              <label className="label">Kategori</label>
              <select name="kategori_cadangan" defaultValue="0" className="input">
                <option value="0">Cocokkan lewat ISBN; sisanya tanpa kategori</option>
                {kategori.map((k) => (
                  <option key={k.id} value={k.id}>Cocokkan lewat ISBN; sisanya: {k.nama}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-tinta-2">
                Kategori diambil dari data API Buku Indonesia bila ISBN-nya cocok. Cover diisi link Open Library berdasarkan
                ISBN; buku tanpa cover memakai sampul otomatis.
              </p>
            </div>
          </section>

          {/* ---------- Langkah 3: pratinjau ---------- */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">3. Periksa daftar buku</h2>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Saring judul / pengarang / ISBN" className="input w-64 py-1.5" />
                <button type="button" onClick={() => centangSemua(true)} className="btn-garis btn-kecil">Centang semua</button>
                <button type="button" onClick={() => centangSemua(false)} className="btn-garis btn-kecil">Kosongkan</button>
              </div>
            </div>

            <div className="kartu max-h-[560px] overflow-auto">
              <table className="tabel">
                <thead className="sticky top-0">
                  <tr><th className="w-10"></th><th>Judul</th><th>Pengarang</th><th>Tahun</th><th>ISBN</th><th>Rak</th><th className="w-28">Jumlah eks.</th></tr>
                </thead>
                <tbody>
                  {tampil.map((b) => {
                    const ada = sudahAda(b);
                    return (
                      <tr key={b.grId} className={ada ? "opacity-50" : ""}>
                        <td>
                          {ada ? (
                            <span title="Sudah ada di koleksi">✓</span>
                          ) : (
                            <input
                              type="checkbox"
                              aria-label={`Impor ${b.judul}`}
                              checked={!tidakDipilih.has(b.grId)}
                              onChange={(e) => {
                                const s = new Set(tidakDipilih);
                                if (e.target.checked) s.delete(b.grId);
                                else s.add(b.grId);
                                setTidakDipilih(s);
                              }}
                            />
                          )}
                        </td>
                        <td>
                          <span className="font-medium">{rapikan ? rapikanJudul(b.judul) : b.judul}</span>
                          {ada && <span className="ml-2 rounded bg-utama-muda px-1.5 text-xs text-utama">sudah di koleksi</span>}
                          <div className="text-xs text-tinta-2">{b.penerbit ?? ""}</div>
                        </td>
                        <td className="text-sm">{b.pengarang ?? "-"}</td>
                        <td>{b.tahun ?? "-"}</td>
                        <td className="font-mono text-xs">{b.isbn ?? <span className="text-tinta-2">tanpa ISBN</span>}</td>
                        <td className="text-xs">{b.rak}</td>
                        <td>
                          {!ada && (
                            <input
                              type="number"
                              min={0}
                              aria-label={`Jumlah eksemplar ${b.judul}`}
                              value={jumlahKhusus[b.grId] ?? ""}
                              placeholder={String(b.dimiliki > 0 ? b.dimiliki : bawaan)}
                              onChange={(e) => setJumlahKhusus({ ...jumlahKhusus, [b.grId]: e.target.value })}
                              className="input w-24 py-1"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {tampil.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-tinta-2">Tidak ada buku pada rak/saringan ini.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ---------- Langkah 4: impor ---------- */}
          <div className="kartu flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-sm">
              <strong className="text-lg">{akanDiimpor.length}</strong> buku akan diimpor, total{" "}
              <strong>{akanDiimpor.reduce((s, b) => s + jumlahUntuk(b), 0)}</strong> eksemplar.
            </p>
            {akanDiimpor.length > 0 ? (
              <Tombol teksProses="Mengimpor… (bisa ±1 menit)" konfirmasi={`Impor ${akanDiimpor.length} buku ke koleksi?`}>
                4. Impor ke Koleksi
              </Tombol>
            ) : (
              <span className="text-sm text-tinta-2">Tidak ada buku baru untuk diimpor.</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
