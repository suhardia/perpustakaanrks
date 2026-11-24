import Link from "next/link";

export default function TidakDitemukan() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-5xl">📖</p>
      <h1 className="mt-4 text-2xl font-semibold">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-tinta-2">Mungkin buku ini sudah dipindahkan dari rak.</p>
      <Link href="/" className="btn-utama mt-6">Kembali ke koleksi</Link>
    </div>
  );
}
