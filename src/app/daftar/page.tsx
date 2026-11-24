import Link from "next/link";
import Flash from "@/components/Flash";
import Tombol from "@/components/Tombol";
import { daftar } from "@/app/actions/auth";

export const metadata = { title: "Daftar Anggota" };

export default async function HalamanDaftar(props: PageProps<"/daftar">) {
  const sp = await props.searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-center text-3xl font-semibold">Daftar Anggota</h1>
      <p className="mt-2 text-center text-sm text-tinta-2">Gratis. Nomor anggota dibuat otomatis.</p>

      <div className="kartu mt-6 p-6">
        <Flash pesan={sp.pesan} error={sp.error} />
        <form action={daftar} className="space-y-4">
          <div>
            <label className="label" htmlFor="nama">Nama lengkap</label>
            <input id="nama" name="nama" required className="input" autoComplete="name" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="no_hp">No. HP / WhatsApp <span className="font-normal">(opsional)</span></label>
            <input id="no_hp" name="no_hp" type="tel" className="input" autoComplete="tel" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" minLength={6} required className="input" autoComplete="new-password" />
            </div>
            <div>
              <label className="label" htmlFor="ulangi">Ulangi</label>
              <input id="ulangi" name="ulangi" type="password" minLength={6} required className="input" autoComplete="new-password" />
            </div>
          </div>
          <Tombol className="btn-utama w-full py-2.5">Daftar</Tombol>
        </form>
      </div>
      <p className="mt-4 text-center text-sm text-tinta-2">
        Sudah punya akun? <Link href="/masuk" className="font-semibold text-utama hover:underline">Masuk</Link>
      </p>
    </div>
  );
}
