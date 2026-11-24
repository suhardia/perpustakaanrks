/** Menampilkan pesan sukses/error yang dikirim lewat query ?pesan= / ?error= */
export default function Flash({ pesan, error }: { pesan?: string | string[]; error?: string | string[] }) {
  const p = Array.isArray(pesan) ? pesan[0] : pesan;
  const e = Array.isArray(error) ? error[0] : error;
  if (!p && !e) return null;
  return (
    <div
      role="status"
      className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
        e ? "border-bahaya/30 bg-bahaya-muda text-bahaya" : "border-sukses/30 bg-sukses-muda text-sukses"
      }`}
    >
      {e ?? p}
    </div>
  );
}
