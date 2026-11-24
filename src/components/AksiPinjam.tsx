import Link from "next/link";
import Tombol from "@/components/Tombol";
import { ajukanAntrian, batalkanAntrian } from "@/app/actions/anggota";
import { tanggal } from "@/lib/format";
import type { AntrianDetail, BukuStatus, PeminjamanDetail, Profil } from "@/lib/types";

/**
 * Tombol / informasi peminjaman di kartu buku, disesuaikan dengan siapa yang melihat:
 * tamu, pustakawan, atau anggota (dengan status pinjaman/antriannya sendiri).
 */
export default function AksiPinjam({
  buku,
  profil,
  antrian,
  pinjaman,
  kembali,
}: {
  buku: BukuStatus;
  profil: Profil | null;
  antrian?: AntrianDetail;
  pinjaman?: PeminjamanDetail;
  kembali: string;
}) {
  if (buku.jumlah === 0) return null;

  if (!profil) {
    return (
      <Link href={`/masuk?lanjut=${encodeURIComponent(kembali)}`} className="btn-garis btn-kecil w-full">
        Masuk untuk {buku.tersedia > 0 ? "meminjam" : "mengantre"}
      </Link>
    );
  }

  if (profil.role === "admin") {
    return (
      <Link href={`/admin/buku/${buku.id}`} className="btn-garis btn-kecil w-full">
        Kelola buku
      </Link>
    );
  }

  if (pinjaman) {
    return (
      <p className="rounded-lg bg-utama-muda px-3 py-2 text-xs font-medium text-utama">
        Sedang Anda pinjam · kembalikan {tanggal(pinjaman.tgl_jatuh_tempo)}
      </p>
    );
  }

  if (antrian?.status === "siap_diambil") {
    return (
      <p className="rounded-lg bg-sukses-muda px-3 py-2 text-xs font-semibold text-sukses">
        ✓ Siap diambil di meja pustakawan sampai {tanggal(antrian.batas_ambil)}
      </p>
    );
  }

  if (antrian?.status === "menunggu") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg bg-aksen-muda px-3 py-2">
        <span className="text-xs font-semibold text-aksen">Antrian Anda: ke-{antrian.posisi}</span>
        <form action={batalkanAntrian}>
          <input type="hidden" name="antrian_id" value={antrian.id} />
          <input type="hidden" name="kembali" value={kembali} />
          <Tombol className="text-xs text-tinta-2 underline hover:text-bahaya" konfirmasi="Batalkan antrian buku ini?" teksProses="…">
            Batal
          </Tombol>
        </form>
      </div>
    );
  }

  const bisaLangsung = buku.tersedia > 0;
  return (
    <form action={ajukanAntrian}>
      <input type="hidden" name="buku_id" value={buku.id} />
      <input type="hidden" name="kembali" value={kembali} />
      <Tombol
        className={`${bisaLangsung ? "btn-utama" : "btn-aksen"} btn-kecil w-full`}
        konfirmasi={
          bisaLangsung
            ? `Ajukan peminjaman "${buku.judul}"? Buku akan disiapkan dan bisa Anda ambil di meja pustakawan.`
            : `Masuk antrian "${buku.judul}"? Anda akan mendapat giliran setelah buku dikembalikan.`
        }
      >
        {bisaLangsung ? "Ajukan Pinjam" : `Masuk Antrian${buku.antrian > 0 ? ` (ke-${buku.antrian + 1})` : ""}`}
      </Tombol>
    </form>
  );
}
