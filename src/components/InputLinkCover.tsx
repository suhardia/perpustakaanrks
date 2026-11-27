"use client";

import { useState } from "react";
import Sampul from "@/components/Sampul";
import { rapikanLinkCover } from "@/lib/cover";

/** Kolom link cover dengan pratinjau langsung (hanya teks link yang disimpan). */
export default function InputLinkCover({ awal, judul, id }: { awal: string | null; judul: string; id: number }) {
  const [link, setLink] = useState(awal ?? "");
  const cek = rapikanLinkCover(link);
  const pratinjau = cek.ok ? cek.link : null;

  return (
    <div className="space-y-2">
      <input
        name="cover_link"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="https://drive.google.com/file/d/…/view?usp=sharing"
        className="input"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
      />
      {!cek.ok && <p className="text-xs text-bahaya">{cek.pesan}</p>}
      <div className="flex items-start gap-3">
        <div className="w-24 shrink-0">
          <Sampul key={pratinjau ?? "kosong"} id={id} judul={judul || "Judul buku"} coverUrl={pratinjau} />
        </div>
        <p className="text-xs leading-relaxed text-tinta-2">
          Google Drive: klik kanan file gambar → <strong>Bagikan</strong> → Akses umum{" "}
          <strong>“Siapa saja yang memiliki link”</strong> → <strong>Salin link</strong>, lalu tempel di atas.
          Jika pratinjau tetap berupa sampul berwarna, berarti gambar belum dibagikan untuk umum.
          {link && (
            <button type="button" onClick={() => setLink("")} className="mt-1 block text-bahaya underline">
              Hapus cover
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
