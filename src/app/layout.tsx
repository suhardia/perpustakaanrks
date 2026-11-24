import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getPengaturan, getProfil } from "@/lib/auth";
import { keluar } from "@/app/actions/auth";
import { supabaseSiap } from "@/lib/supabase/env";

export async function generateMetadata(): Promise<Metadata> {
  const p = await getPengaturan();
  return {
    title: { default: p.nama_perpustakaan, template: `%s · ${p.nama_perpustakaan}` },
    description: "Katalog koleksi buku, status peminjaman, dan antrian peminjaman online.",
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [profil, pengaturan] = await Promise.all([getProfil(), getPengaturan()]);

  return (
    <html lang="id" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-30 border-b border-garis bg-kertas/90 backdrop-blur">
          <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-utama text-lg text-white">📚</span>
              <span className="judul-serif text-lg font-semibold">{pengaturan.nama_perpustakaan}</span>
            </Link>
            <div className="flex flex-1 items-center gap-1 text-sm">
              <Link href="/" className="rounded-md px-3 py-1.5 hover:bg-kertas-2">Koleksi</Link>
              {profil?.role === "anggota" && (
                <Link href="/akun" className="rounded-md px-3 py-1.5 hover:bg-kertas-2">Akun Saya</Link>
              )}
              {profil?.role === "admin" && (
                <Link href="/admin" className="rounded-md px-3 py-1.5 font-medium text-utama hover:bg-kertas-2">
                  Panel Pustakawan
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              {profil ? (
                <>
                  <span className="hidden text-tinta-2 sm:inline">
                    Halo, <strong className="text-tinta">{profil.nama.split(" ")[0]}</strong>
                  </span>
                  <form action={keluar}>
                    <button className="btn-garis btn-kecil">Keluar</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/masuk" className="btn-garis btn-kecil">Masuk</Link>
                  <Link href="/daftar" className="btn-utama btn-kecil">Daftar Anggota</Link>
                </>
              )}
            </div>
          </nav>
        </header>

        {!supabaseSiap && (
          <div className="bg-aksen-muda px-4 py-2 text-center text-sm text-aksen">
            Supabase belum dihubungkan. Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
            <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> di <code>.env.local</code> atau di Vercel.
          </div>
        )}

        <main className="flex-1">{children}</main>

        <footer className="border-t border-garis py-6 text-center text-xs text-tinta-2">
          © {new Date().getFullYear()} {pengaturan.nama_perpustakaan} · Dibangun dengan Next.js, Supabase &amp; Vercel
        </footer>
      </body>
    </html>
  );
}
