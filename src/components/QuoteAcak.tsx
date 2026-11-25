"use client";

import { useCallback, useEffect, useState } from "react";
import type { Quote } from "@/app/api/quote/route";

/** Kartu quote acak di halaman depan; bisa diganti dengan tombol "Quote lain". */
export default function QuoteAcak() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [gagal, setGagal] = useState(false);

  const ambil = useCallback(async () => {
    try {
      const res = await fetch("/api/quote", { cache: "no-store" });
      if (!res.ok) throw new Error();
      return (await res.json()) as Quote;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let batal = false;
    ambil().then((q) => {
      if (batal) return;
      setQuote(q);
      setGagal(!q);
      setMemuat(false);
    });
    return () => {
      batal = true;
    };
  }, [ambil]);

  async function gantiQuote() {
    setMemuat(true);
    const q = await ambil();
    if (q) setQuote(q);
    setGagal(!q && !quote);
    setMemuat(false);
  }

  if (gagal) return null; // API quote mati: kartu disembunyikan, halaman tetap normal

  return (
    <figure className="kartu relative flex h-full flex-col justify-between overflow-hidden p-6">
      <span aria-hidden className="judul-serif pointer-events-none absolute -top-6 left-3 text-[7rem] leading-none text-aksen/15">
        “
      </span>
      {quote ? (
        <>
          <blockquote className={`judul-serif relative text-lg leading-relaxed transition-opacity ${memuat ? "opacity-40" : ""}`}>
            {quote.teks}
          </blockquote>
          <figcaption className="relative mt-4 text-sm">
            <span className="font-semibold">— {quote.penulis}</span>
            {quote.keterangan && (
              <span className="text-tinta-2">{quote.bahasa === "en" ? `, ${quote.keterangan}` : ` · ${quote.keterangan}`}</span>
            )}
          </figcaption>
        </>
      ) : (
        <div className="space-y-2" aria-label="Memuat quote">
          <div className="h-4 w-full animate-pulse rounded bg-kertas-2" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-kertas-2" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-kertas-2" />
        </div>
      )}
      <div className="relative mt-5 flex items-center justify-between text-xs text-tinta-2">
        <span>
          {quote && (
            <>Sumber: <a href={quote.sumberUrl} target="_blank" rel="noreferrer" className="underline">{quote.sumber}</a></>
          )}
        </span>
        <button type="button" onClick={gantiQuote} disabled={memuat} className="btn-garis btn-kecil">
          {memuat ? "Memuat…" : "↻ Quote lain"}
        </button>
      </div>
    </figure>
  );
}
