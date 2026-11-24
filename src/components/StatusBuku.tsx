import { tanggal } from "@/lib/format";
import type { BukuStatus } from "@/lib/types";

/** Label status ketersediaan buku untuk publik */
export default function StatusBuku({ buku, lengkap = false }: { buku: BukuStatus; lengkap?: boolean }) {
  if (buku.jumlah === 0) {
    return <span className="inline-flex rounded-full bg-kertas-2 px-2.5 py-1 text-xs font-medium text-tinta-2">Belum ada eksemplar</span>;
  }

  if (buku.tersedia > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sukses-muda px-2.5 py-1 text-xs font-semibold text-sukses">
        <span className="h-1.5 w-1.5 rounded-full bg-sukses" />
        Tersedia {buku.tersedia} dari {buku.jumlah}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-aksen-muda px-2.5 py-1 text-xs font-semibold text-aksen">
        <span className="h-1.5 w-1.5 rounded-full bg-aksen" />
        Sedang dipinjam
      </span>
      <p className="text-xs text-tinta-2">
        {buku.kembali_terdekat && <>Perkiraan kembali {tanggal(buku.kembali_terdekat)}</>}
        {buku.kembali_terdekat && buku.antrian > 0 && " · "}
        {buku.antrian > 0 ? `${buku.antrian} orang mengantre` : lengkap ? "Belum ada antrian" : ""}
        {buku.dipesan > 0 && lengkap && ` · ${buku.dipesan} disiapkan untuk antrian`}
      </p>
    </div>
  );
}
