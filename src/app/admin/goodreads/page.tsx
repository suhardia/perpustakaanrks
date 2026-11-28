import Flash from "@/components/Flash";
import ImporGoodreads from "@/components/ImporGoodreads";
import { createClient } from "@/lib/supabase/server";
import type { Kategori } from "@/lib/types";

export const metadata = { title: "Impor Goodreads" };

export default async function ImporGoodreadsPage(props: PageProps<"/admin/goodreads">) {
  const sp = await props.searchParams;
  const supabase = await createClient();

  // Daftar ISBN & ID sumber yang sudah ada, untuk menandai buku ganda di pratinjau (dibaca per 1.000 baris)
  const isbnAda: string[] = [];
  const sumberAda: string[] = [];
  for (let dari = 0; ; dari += 1000) {
    const { data } = await supabase.from("buku").select("isbn, sumber_id").order("id").range(dari, dari + 999);
    const baris = (data ?? []) as { isbn: string | null; sumber_id: string | null }[];
    for (const r of baris) {
      if (r.isbn) isbnAda.push(r.isbn);
      if (r.sumber_id) sumberAda.push(r.sumber_id);
    }
    if (baris.length < 1000) break;
  }
  const { data: kategori } = await supabase.from("kategori").select("id, nama").order("nama");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Impor dari Goodreads</h1>
        <p className="mt-1 max-w-3xl text-sm text-tinta-2">
          Unduh file dari Goodreads: <strong>My Books → Import and export → Export Library</strong>, lalu pilih file{" "}
          <code>goodreads_library_export.csv</code> di bawah. Yang diambil <strong>hanya data buku</strong> (judul,
          pengarang, penerbit, tahun, ISBN, halaman, jumlah dimiliki). Rating, ulasan, dan tanggal baca diabaikan. Buku yang
          sudah ada dilewati, jadi file yang diperbarui aman diimpor ulang kapan saja.
        </p>
      </div>
      <Flash pesan={sp.pesan} error={sp.error} />
      <ImporGoodreads isbnAda={isbnAda} sumberAda={sumberAda} kategori={(kategori ?? []) as Kategori[]} />
    </div>
  );
}
