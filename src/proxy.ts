import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, supabaseSiap } from "@/lib/supabase/env";

/**
 * Berjalan sebelum setiap halaman:
 * 1. Memperbarui cookie sesi Supabase agar pengguna tetap masuk.
 * 2. Mengarahkan tamu yang membuka /akun atau /admin ke halaman masuk.
 * (Pemeriksaan peran admin dilakukan lagi di src/app/admin/layout.tsx.)
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!supabaseSiap) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Jangan menaruh kode lain di antara createServerClient dan getClaims()
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const path = request.nextUrl.pathname;
  if (!user && (path.startsWith("/akun") || path.startsWith("/admin"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/masuk";
    url.search = `?lanjut=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
