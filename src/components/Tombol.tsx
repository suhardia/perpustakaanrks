"use client";

import { useFormStatus } from "react-dom";

/**
 * Tombol submit untuk form Server Action:
 * - menampilkan status "Memproses…" saat dikirim
 * - opsional meminta konfirmasi terlebih dahulu
 */
export default function Tombol({
  children,
  className = "btn-utama",
  konfirmasi,
  teksProses = "Memproses…",
}: {
  children: React.ReactNode;
  className?: string;
  konfirmasi?: string;
  teksProses?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (konfirmasi && !window.confirm(konfirmasi)) e.preventDefault();
      }}
    >
      {pending ? teksProses : children}
    </button>
  );
}
