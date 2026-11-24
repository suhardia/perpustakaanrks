import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Tujuan tautan konfirmasi email dari Supabase.
 * Mendukung dua format: ?code=... (PKCE) dan ?token_hash=...&type=...
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const lanjutRaw = url.searchParams.get("lanjut") ?? "/akun";
  const lanjut = lanjutRaw.startsWith("/") && !lanjutRaw.startsWith("//") ? lanjutRaw : "/akun";

  const supabase = await createClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  const tujuan = new URL(ok ? lanjut : "/masuk", url.origin);
  tujuan.searchParams.set(
    ok ? "pesan" : "error",
    ok ? "Email terkonfirmasi. Selamat datang!" : "Tautan konfirmasi tidak valid atau kedaluwarsa. Silakan masuk atau daftar ulang.",
  );
  return NextResponse.redirect(tujuan);
}
