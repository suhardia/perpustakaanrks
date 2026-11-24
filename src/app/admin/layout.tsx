import Link from "next/link";
import { wajibAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const MENU = [
  ["/admin", "Dashboard"],
  ["/admin/sirkulasi", "Sirkulasi"],
  ["/admin/antrian", "Antrian"],
  ["/admin/buku", "Buku"],
  ["/admin/kategori", "Kategori"],
  ["/admin/anggota", "Anggota"],
  ["/admin/laporan", "Laporan"],
  ["/admin/pengaturan", "Pengaturan"],
] as const;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await wajibAdmin();

  // Antrian "siap diambil" yang lewat batas otomatis dialihkan ke antrian berikutnya
  const supabase = await createClient();
  await supabase.rpc("proses_kedaluwarsa");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-1 rounded-xl border border-garis bg-white p-1.5 text-sm">
        <span className="px-3 py-1.5 text-xs font-semibold tracking-widest text-aksen uppercase">Pustakawan</span>
        {MENU.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-lg px-3 py-1.5 hover:bg-kertas-2">
            {label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
