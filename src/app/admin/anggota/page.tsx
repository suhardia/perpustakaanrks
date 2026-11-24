import Link from "next/link";
import Flash from "@/components/Flash";
import Tombol from "@/components/Tombol";
import { ubahRole } from "@/app/actions/admin";
import { createClient } from "@/lib/supabase/server";
import { wajibAdmin } from "@/lib/auth";
import { bersihkanCari, tanggal } from "@/lib/format";
import type { Profil } from "@/lib/types";

export const metadata = { title: "Anggota" };

export default async function AnggotaPage(props: PageProps<"/admin/anggota">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const saya = await wajibAdmin();
  const supabase = await createClient();

  let query = supabase.from("profiles").select("*").order("role").order("nama");
  const kata = bersihkanCari(q);
  if (kata) query = query.or(`nama.ilike.%${kata}%,email.ilike.%${kata}%,no_anggota.ilike.%${kata}%`);
  const [{ data }, { data: aktif }] = await Promise.all([
    query.limit(300),
    supabase.from("peminjaman").select("anggota_id").eq("status", "dipinjam"),
  ]);
  const profil = (data ?? []) as Profil[];
  const jumlahAktif = new Map<string, number>();
  for (const r of (aktif ?? []) as { anggota_id: string }[]) jumlahAktif.set(r.anggota_id, (jumlahAktif.get(r.anggota_id) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Anggota &amp; Pengguna</h1>
        <p className="text-sm text-tinta-2">
          Anggota mendaftar sendiri melalui halaman <strong>Daftar Anggota</strong>. Di sini Anda bisa melihat riwayat dan
          menjadikan seseorang pustakawan.
        </p>
      </div>
      <Flash pesan={sp.pesan} error={sp.error} />

      <form className="flex max-w-lg gap-2">
        <input name="q" defaultValue={q} placeholder="Cari nama, email, no. anggota…" className="input" />
        <button className="btn-garis">Cari</button>
      </form>

      <div className="kartu overflow-x-auto">
        <table className="tabel">
          <thead><tr><th>No. Anggota</th><th>Nama</th><th>Kontak</th><th>Peran</th><th>Pinjaman aktif</th><th>Terdaftar</th><th></th></tr></thead>
          <tbody>
            {profil.map((p) => (
              <tr key={p.id}>
                <td className="font-mono text-xs">{p.no_anggota}</td>
                <td>
                  <Link href={`/admin/anggota/${p.id}`} className="font-semibold hover:text-utama">{p.nama}</Link>
                </td>
                <td className="text-xs">{p.email}<br /><span className="text-tinta-2">{p.no_hp ?? ""}</span></td>
                <td>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.role === "admin" ? "bg-utama-muda text-utama" : "bg-kertas-2 text-tinta-2"}`}>
                    {p.role === "admin" ? "Pustakawan" : "Anggota"}
                  </span>
                </td>
                <td>{jumlahAktif.get(p.id) ?? 0}</td>
                <td className="text-xs text-tinta-2">{tanggal(p.created_at)}</td>
                <td className="text-right">
                  {p.id !== saya.id && (
                    <form action={ubahRole}>
                      <input type="hidden" name="user_id" value={p.id} />
                      <input type="hidden" name="role" value={p.role === "admin" ? "anggota" : "admin"} />
                      <Tombol
                        className="btn-garis btn-kecil"
                        konfirmasi={p.role === "admin" ? `Jadikan ${p.nama} anggota biasa?` : `Jadikan ${p.nama} pustakawan? Ia akan bisa mengelola seluruh data.`}
                      >
                        {p.role === "admin" ? "Jadikan anggota" : "Jadikan pustakawan"}
                      </Tombol>
                    </form>
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
