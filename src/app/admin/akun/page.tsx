import Flash from "@/components/Flash";
import Tombol from "@/components/Tombol";
import { aturUsername, gantiPassword, ubahNamaAdmin } from "@/app/actions/admin";
import { wajibAdmin } from "@/lib/auth";

export const metadata = { title: "Akun Pustakawan" };

export default async function AkunAdmin(props: PageProps<"/admin/akun">) {
  const sp = await props.searchParams;
  const saya = await wajibAdmin();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Akun Pustakawan</h1>
        <p className="text-sm text-tinta-2">Atur nama pengguna dan password untuk masuk ke aplikasi.</p>
      </div>
      <Flash pesan={sp.pesan} error={sp.error} />

      {!saya.username && (
        <div className="rounded-lg border border-aksen/30 bg-aksen-muda px-4 py-3 text-sm text-aksen">
          Anda belum punya nama pengguna. Buat di bawah ini agar bisa masuk dengan <strong>nama pengguna + password</strong>.
        </div>
      )}

      <section className="kartu space-y-4 p-6">
        <h2 className="font-semibold">Nama pengguna (untuk login)</h2>
        <form action={aturUsername} className="flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="kembali" value="/admin/akun" />
          <input
            name="username"
            defaultValue={saya.username ?? ""}
            placeholder="mis. admin atau kepala.perpus"
            pattern="[A-Za-z0-9_.]{3,30}"
            title="3–30 karakter: huruf, angka, titik, atau garis bawah (tanpa spasi)"
            autoCapitalize="none"
            spellCheck={false}
            className="input font-mono"
          />
          <Tombol>Simpan</Tombol>
        </form>
        <p className="text-xs text-tinta-2">
          3–30 karakter: huruf, angka, titik, atau garis bawah, tanpa spasi. Huruf besar/kecil dianggap sama.
          Email akun ({saya.email}) tetap bisa dipakai untuk masuk.
        </p>
      </section>

      <section className="kartu space-y-4 p-6">
        <h2 className="font-semibold">Nama tampilan</h2>
        <form action={ubahNamaAdmin} className="flex flex-col gap-2 sm:flex-row">
          <input name="nama" defaultValue={saya.nama} required className="input" />
          <Tombol className="btn-garis">Simpan</Tombol>
        </form>
      </section>

      <section className="kartu space-y-4 p-6">
        <h2 className="font-semibold">Ganti password</h2>
        <form action={gantiPassword} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Password baru</label>
              <input name="password" type="password" minLength={8} required autoComplete="new-password" className="input" />
            </div>
            <div>
              <label className="label">Ulangi password baru</label>
              <input name="ulangi" type="password" minLength={8} required autoComplete="new-password" className="input" />
            </div>
          </div>
          <Tombol konfirmasi="Ganti password akun ini?">Ganti Password</Tombol>
        </form>
      </section>
    </div>
  );
}
