// Variabel lingkungan Supabase (diisi di .env.local dan di Vercel → Settings → Environment Variables)
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// Supabase versi baru memakai "publishable key"; proyek lama memakai "anon key". Keduanya didukung.
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseSiap = Boolean(SUPABASE_URL && SUPABASE_KEY);
