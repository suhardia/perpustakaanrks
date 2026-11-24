import Link from "next/link";
import Flash from "@/components/Flash";
import Tombol from "@/components/Tombol";
import { batalkanAntrianAdmin, serahkanAntrian } from "@/app/actions/admin";
import { createClient } from "@/lib/supabase/server";
import { tanggal, waktu } from "@/lib/format";
import type { AntrianDetail } from "@/lib/types";

export const metadata = { title: "Antrian" };

const TAB = { siap: "Siap diambil", menunggu: "Menunggu", riwayat: "Riwayat" } as const;
type Tab = keyof typeof TAB;

const LABEL: Record<string, string> = {
  menunggu: "Menunggu",
  siap_diambil: "Siap diambil",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
  kedaluwarsa: "Kedaluwarsa",
};

export default async function Antrian(props: PageProps<"/admin/antrian">) {
  const sp = await props.searchParams;
  const tab: Tab = sp.tab === "menunggu" || sp.tab === "riwayat" ? sp.tab : "siap";
  const kembali = `/admin/antrian?tab=${tab}`;
  const supabase = await createClient();

  let query = supabase.from("antrian_detail").select("*");
  if (tab === "siap") query = query.eq("status", "siap_diambil").order("batas_ambil");
  if (tab === "menunggu") query = query.eq("status", "menunggu").order("judul").order("created_at");
  if (tab === "riwayat") query = query.in("status", ["selesai", "dibatalkan", "kedaluwarsa"]).order("selesai_at", { ascending: false });
  const { data } = await query.limit(200);
  const list = (data ?? []) as AntrianDetail[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Antrian Peminjaman</h1>
        <p className="text-sm text-tinta-2">
          Saat buku dikembalikan, antrian terdepan otomatis berstatus “siap diambil” dan eksemplarnya disisihkan.
          Serahkan buku ketika anggota datang. Jika tidak diambil sampai batas waktu, giliran pindah ke antrian berikutnya.
        </p>
      </div>
      <Flash pesan={sp.pesan} error={sp.error} />

      <div className="flex w-fit gap-1 rounded-lg bg-kertas-2 p-1 text-sm">
        {(Object.keys(TAB) as Tab[]).map((t) => (
          <Link
            key={t}
            href={`/admin/antrian?tab=${t}`}
            className={`rounded-md px-3 py-1.5 ${tab === t ? "bg-white font-semibold shadow-sm" : "text-tinta-2"}`}
          >
            {TAB[t]}
          </Link>
        ))}
      </div>

      <div className="kartu overflow-x-auto">
        <table className="tabel">
          <thead>
            <tr>
              <th>Buku</th><th>Anggota</th><th>Diajukan</th>
              {tab === "siap" && <th>Batas ambil</th>}
              {tab === "menunggu" && <th>Posisi</th>}
              {tab === "riwayat" && <th>Status</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-tinta-2">Tidak ada data.</td></tr>}
            {list.map((a) => (
              <tr key={a.id}>
                <td className="font-medium">{a.judul}</td>
                <td>{a.anggota_nama}<br /><span className="text-xs text-tinta-2">{a.no_anggota}</span></td>
                <td className="text-tinta-2">{waktu(a.created_at)}</td>
                {tab === "siap" && <td className="font-semibold">{tanggal(a.batas_ambil)}</td>}
                {tab === "menunggu" && <td>ke-{a.posisi}</td>}
                {tab === "riwayat" && <td>{LABEL[a.status]}</td>}
                <td className="text-right whitespace-nowrap">
                  {tab !== "riwayat" && (
                    <div className="flex justify-end gap-2">
                      {tab === "siap" && (
                        <form action={serahkanAntrian}>
                          <input type="hidden" name="antrian_id" value={a.id} />
                          <input type="hidden" name="kembali" value={kembali} />
                          <Tombol className="btn-utama btn-kecil">Serahkan buku</Tombol>
                        </form>
                      )}
                      <form action={batalkanAntrianAdmin}>
                        <input type="hidden" name="antrian_id" value={a.id} />
                        <input type="hidden" name="kembali" value={kembali} />
                        <Tombol className="btn-bahaya btn-kecil" konfirmasi={`Batalkan antrian ${a.anggota_nama} untuk "${a.judul}"?`}>
                          Batalkan
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
