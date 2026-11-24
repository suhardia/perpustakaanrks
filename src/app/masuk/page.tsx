import Link from "next/link";
import Flash from "@/components/Flash";
import Tombol from "@/components/Tombol";
import { masuk } from "@/app/actions/auth";

export const metadata = { title: "Masuk" };

export default async function HalamanMasuk(props: PageProps<"/masuk">) {
  const sp = await props.searchParams;
  const lanjut = typeof sp.lanjut === "string" ? sp.lanjut : "/";

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-center text-3xl font-semibold">Masuk</h1>
      <p className="mt-2 text-center text-sm text-tinta-2">Untuk anggota dan pustakawan</p>

      <div className="kartu mt-6 p-6">
        <Flash pesan={sp.pesan} error={sp.error} />
        <form action={masuk} className="space-y-4">
          <input type="hidden" name="lanjut" value={lanjut} />
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
          </div>
          <Tombol className="btn-utama w-full py-2.5">Masuk</Tombol>
        </form>
      </div>
      <p className="mt-4 text-center text-sm text-tinta-2">
        Belum jadi anggota?{" "}
        <Link href="/daftar" className="font-semibold text-utama hover:underline">Daftar di sini</Link>
      </p>
    </div>
  );
}
