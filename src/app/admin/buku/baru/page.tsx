import Flash from "@/components/Flash";
import FormBuku from "@/components/FormBuku";
import { createClient } from "@/lib/supabase/server";
import type { Kategori } from "@/lib/types";

export const metadata = { title: "Tambah Buku" };

export default async function BukuBaru(props: PageProps<"/admin/buku/baru">) {
  const sp = await props.searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("kategori").select("id, nama").order("nama");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tambah Buku</h1>
      <Flash pesan={sp.pesan} error={sp.error} />
      <FormBuku kategori={(data ?? []) as Kategori[]} />
    </div>
  );
}
