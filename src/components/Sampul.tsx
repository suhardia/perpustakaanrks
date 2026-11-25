"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

// Warna punggung buku untuk sampul otomatis (jika belum ada foto cover)
const PALET = [
  ["#1d5c63", "#2f7f87"],
  ["#7a3e2b", "#a5583f"],
  ["#3b4a7a", "#5565a0"],
  ["#4d6b3a", "#6a8f52"],
  ["#6b3f6b", "#8f5a8f"],
  ["#8a6a1f", "#b38c2e"],
  ["#2f4858", "#46677c"],
];

/** Sampul buku: foto cover jika ada (dan berhasil dimuat), jika tidak dibuat otomatis dari judul & pengarang. */
export default function Sampul({
  judul,
  pengarang,
  coverUrl,
  id,
  className = "",
  kecil = false,
}: {
  judul: string;
  pengarang?: string | null;
  coverUrl?: string | null;
  id: number;
  className?: string;
  /** true untuk thumbnail kecil (tanpa teks judul) */
  kecil?: boolean;
}) {
  const [rusak, setRusak] = useState(false);
  if (coverUrl && !rusak) {
    return (
      <img
        src={coverUrl}
        onError={() => setRusak(true)}
        alt={`Sampul ${judul}`}
        loading="lazy"
        className={`aspect-[2/3] w-full rounded-md object-cover shadow-md ${className}`}
      />
    );
  }
  const [a, b] = PALET[id % PALET.length];
  return (
    <div
      aria-label={`Sampul ${judul}`}
      className={`relative flex aspect-[2/3] w-full flex-col justify-between overflow-hidden rounded-md p-3 text-white shadow-md ${className}`}
      style={{ background: `linear-gradient(150deg, ${a}, ${b})` }}
    >
      <div className={`absolute inset-y-0 left-0 bg-black/15 ${kecil ? "w-1" : "w-2"}`} />
      {kecil ? null : (
        <>
      <div className="h-px w-10 bg-white/60" />
      <p className="judul-serif line-clamp-4 text-[0.95rem] leading-snug font-semibold">{judul}</p>
      <p className="line-clamp-2 text-[0.7rem] tracking-wide text-white/80 uppercase">{pengarang ?? ""}</p>
        </>
      )}
    </div>
  );
}
