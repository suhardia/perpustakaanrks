// Bentuk data sesuai tabel & view di supabase/schema.sql

export type Role = "admin" | "anggota";

export interface Profil {
  id: string;
  email: string | null;
  nama: string;
  role: Role;
  no_anggota: string | null;
  /** nama pengguna untuk login pustakawan */
  username: string | null;
  no_hp: string | null;
  alamat: string | null;
  created_at: string;
}

export interface Kategori {
  id: number;
  nama: string;
}

export interface Buku {
  id: number;
  kategori_id: number | null;
  judul: string;
  pengarang: string | null;
  penerbit: string | null;
  tahun_terbit: number | null;
  isbn: string | null;
  rak: string | null;
  jumlah: number;
  sinopsis: string | null;
  cover_url: string | null;
  halaman?: number | null;
  sumber_id?: string | null;
  created_at: string;
}

/** View buku_status: buku + ringkasan ketersediaan */
export interface BukuStatus extends Buku {
  kategori_nama: string | null;
  dipinjam: number;
  dipesan: number;
  antrian: number;
  tersedia: number;
  kembali_terdekat: string | null;
}

export type StatusPeminjaman = "dipinjam" | "dikembalikan";

export interface PeminjamanDetail {
  id: number;
  anggota_id: string;
  buku_id: number;
  tgl_pinjam: string;
  tgl_jatuh_tempo: string;
  tgl_kembali: string | null;
  status: StatusPeminjaman;
  jumlah_perpanjang: number;
  denda: number;
  created_at: string;
  judul: string;
  cover_url: string | null;
  isbn: string | null;
  anggota_nama: string;
  no_anggota: string | null;
  anggota_email: string | null;
  hari_terlambat: number;
  denda_berjalan: number;
}

export type StatusAntrian = "menunggu" | "siap_diambil" | "selesai" | "dibatalkan" | "kedaluwarsa";

export interface AntrianDetail {
  id: number;
  anggota_id: string;
  buku_id: number;
  status: StatusAntrian;
  created_at: string;
  siap_at: string | null;
  batas_ambil: string | null;
  selesai_at: string | null;
  judul: string;
  cover_url: string | null;
  anggota_nama: string;
  no_anggota: string | null;
  anggota_email: string | null;
  posisi: number | null;
}

export interface Pengaturan {
  id: number;
  nama_perpustakaan: string;
  lama_pinjam: number;
  denda_per_hari: number;
  maks_pinjam: number;
  maks_antrian: number;
  maks_perpanjang: number;
  batas_ambil_hari: number;
  zona_waktu: string;
}
