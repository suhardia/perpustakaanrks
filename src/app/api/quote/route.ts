import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/quote?sumber=acak|id|en
 * Mengambil quote acak dari:
 *  - "id": https://quotes.liupurnomo.com/api/quotes/random  (bahasa Indonesia)
 *  - "en": https://recite-flax.vercel.app/api/v1/random      (kutipan dari buku, bahasa Inggris)
 * Jika sumber pertama gagal, otomatis mencoba sumber lainnya.
 * Diproksikan lewat server agar tidak terkena masalah CORS dan bisa diganti sumbernya di satu tempat.
 */

export interface Quote {
  teks: string;
  penulis: string;
  keterangan: string | null; // kategori (ID) atau judul buku (EN)
  sumber: string;
  sumberUrl: string;
  bahasa: "id" | "en";
}

async function liupurnomo(): Promise<Quote> {
  const res = await fetch("https://quotes.liupurnomo.com/api/quotes/random", {
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`liupurnomo ${res.status}`);
  const j = await res.json();
  const d = j?.data;
  if (!d?.text) throw new Error("liupurnomo: format tidak dikenal");
  return {
    teks: String(d.text),
    penulis: String(d.author ?? "Anonim"),
    keterangan: d.category ? String(d.category) : null,
    sumber: "Quotes Indonesia",
    sumberUrl: "https://quotes.liupurnomo.com",
    bahasa: "id",
  };
}

async function recite(): Promise<Quote> {
  const res = await fetch("https://recite-flax.vercel.app/api/v1/random", {
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`recite ${res.status}`);
  const j = await res.json();
  const d = Array.isArray(j) ? j[0] : (j?.data ?? j);
  if (!d?.quote) throw new Error("recite: format tidak dikenal");
  return {
    teks: String(d.quote),
    penulis: String(d.author ?? "Anonim"),
    keterangan: d.book ? String(d.book) : null,
    sumber: "Recite",
    sumberUrl: "https://recite-flax.vercel.app",
    bahasa: "en",
  };
}

export async function GET(request: NextRequest) {
  const pilihan = request.nextUrl.searchParams.get("sumber") ?? "acak";
  const urutan =
    pilihan === "id" ? [liupurnomo, recite]
    : pilihan === "en" ? [recite, liupurnomo]
    : Math.random() < 0.5 ? [liupurnomo, recite] : [recite, liupurnomo];

  for (const ambil of urutan) {
    try {
      const quote = await ambil();
      return NextResponse.json(quote, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      console.warn("Gagal mengambil quote:", e instanceof Error ? e.message : e);
    }
  }
  return NextResponse.json({ error: "Quote sedang tidak tersedia" }, { status: 503 });
}
