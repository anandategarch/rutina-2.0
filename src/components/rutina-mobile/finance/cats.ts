import {
  ArrowLeftRight,
  Briefcase,
  Bus,
  ChefHat,
  CircleDollarSign,
  CircleParking,
  Coffee,
  Cookie,
  Droplet,
  Fuel,
  Gamepad2,
  GraduationCap,
  HandCoins,
  Heart,
  HeartPulse,
  Landmark,
  MoreHorizontal,
  PartyPopper,
  Palette,
  PlugZap,
  Receipt,
  Scissors,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Users,
  Utensils,
  UtensilsCrossed,
  Volleyball,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { FinCat, TxType } from '../store'

/** Nama tampilan + ikon lucide untuk tiap kategori transaksi.
 *  Blok "Impor Rutina 1.0" (v2.15) mempertahankan label persis seperti
 *  aplikasi lama — termasuk ejaan khas pengguna ("Cathering",
 *  "Loundry") — agar data hasil impor Turso terasa seperti milik
 *  sendiri, bukan hasil terjemahan. */
export const CAT_META: Record<FinCat, { label: string; icon: LucideIcon }> = {
  /* ===== Bawaan 2.0 ===== */
  makan: { label: 'Makan & Minum', icon: UtensilsCrossed },
  transport: { label: 'Transportasi', icon: Bus },
  belanja: { label: 'Belanja', icon: ShoppingBag },
  hiburan: { label: 'Hiburan', icon: Gamepad2 },
  tagihan: { label: 'Tagihan', icon: Receipt },
  kesehatan: { label: 'Kesehatan', icon: HeartPulse },
  lainnya: { label: 'Lainnya', icon: MoreHorizontal },
  gaji: { label: 'Gaji', icon: Briefcase },
  bonus: { label: 'Bonus', icon: Palette },
  proyek: { label: 'Proyek', icon: Palette },
  transfer: { label: 'Transfer', icon: ArrowLeftRight },
  /* ===== Impor Rutina 1.0 (Turso) — v2.15 ===== */
  kopi: { label: 'Kopi', icon: Coffee },
  'makanan-berat': { label: 'Makanan Berat', icon: Utensils },
  jajan: { label: 'Jajan', icon: Cookie },
  cathering: { label: 'Cathering', icon: ChefHat },
  bensin: { label: 'Bensin', icon: Fuel },
  parkir: { label: 'Parkir', icon: CircleParking },
  'pajak-motor': { label: 'Pajak Motor', icon: Landmark },
  'servis-motor': { label: 'Servis Motor', icon: Wrench },
  loundry: { label: 'Loundry', icon: Shirt },
  dating: { label: 'Dating', icon: Heart },
  badminton: { label: 'Badminton', icon: Volleyball },
  'tagihan-utilitas': { label: 'Tagihan & Utilitas', icon: PlugZap },
  'tagihan-air': { label: 'Tagihan Air', icon: Droplet },
  'tagihan-listrik': { label: 'Tagihan Listrik', icon: Zap },
  'pulsa-data': { label: 'Pulsa & Paket Data', icon: Smartphone },
  'skin-care': { label: 'Skin Care', icon: Sparkles },
  'potong-rambut': { label: 'Potong Rambut', icon: Scissors },
  hutang: { label: 'Hutang', icon: HandCoins },
  'iuran-kas': { label: 'Iuran Kas', icon: Users },
  'tak-terduga': { label: 'Tak Terduga', icon: TriangleAlert },
  pendidikan: { label: 'Pendidikan', icon: GraduationCap },
  lifestyle: { label: 'Lifestyle', icon: PartyPopper },
  investasi: { label: 'Investasi', icon: TrendingUp },
  penghasilan: { label: 'Penghasilan', icon: CircleDollarSign },
}

/** Kategori bawaan 2.0 — urutan pada pemilih di lembar tambah transaksi. */
export const PRIMARY_CATS_BY_TYPE: Record<TxType, FinCat[]> = {
  keluar: ['makan', 'transport', 'belanja', 'hiburan', 'tagihan', 'kesehatan', 'lainnya'],
  masuk: ['gaji', 'bonus', 'proyek', 'lainnya'],
  transfer: [],
}

/** Kategori hasil impor Rutina 1.0 (Turso) — v2.15.
 *  Daftar ini adalah kategori asli yang benar-benar dipakai pengguna di
 *  aplikasi lama (disarikan dari tabel `transactions` + templat berulang
 *  `workspace_modules.finance.recurring`). Ditampilkan terpisah di UI
 *  dengan penanda "Dari Rutina 1.0". */
export const LEGACY_CATS_BY_TYPE: Record<TxType, FinCat[]> = {
  keluar: [
    'kopi',
    'makanan-berat',
    'jajan',
    'cathering',
    'bensin',
    'parkir',
    'pajak-motor',
    'servis-motor',
    'loundry',
    'dating',
    'badminton',
    'tagihan-utilitas',
    'tagihan-air',
    'tagihan-listrik',
    'pulsa-data',
    'skin-care',
    'potong-rambut',
    'hutang',
    'iuran-kas',
    'tak-terduga',
    'pendidikan',
    'lifestyle',
  ],
  masuk: ['investasi', 'penghasilan'],
  transfer: [],
}

/** Seluruh kategori yang bisa dipilih per arus — bawaan + impor 1.0.
 *  Elemen pertama tiap daftar selalu kategori bawaan (default lembar
 *  tambah transaksi saat berganti arah). */
export const CATS_BY_TYPE: Record<TxType, FinCat[]> = {
  keluar: [...PRIMARY_CATS_BY_TYPE.keluar, ...LEGACY_CATS_BY_TYPE.keluar],
  masuk: [...PRIMARY_CATS_BY_TYPE.masuk, ...LEGACY_CATS_BY_TYPE.masuk],
  transfer: [],
}

/** Kategori pengeluaran yang bisa dianggarkan — bawaan + subkategori
 *  impor 1.0 yang paling sering dikendalikan pengguna di aplikasi lama
 *  (makanan, bensin/parkir, cicilan tagihan, kebersihan pakaian). */
export const BUDGETABLE_CATS: FinCat[] = [
  'makan',
  'transport',
  'belanja',
  'hiburan',
  'tagihan',
  'kesehatan',
  /* impor 1.0 */
  'kopi',
  'makanan-berat',
  'jajan',
  'bensin',
  'parkir',
  'loundry',
  'tagihan-air',
  'tagihan-listrik',
  'pulsa-data',
]

/** Warna semantik arus uang (dipakai di seluruh tab Keuangan).
 *  Nilai var() mengikuti token semantic agar siap mode gelap. */
export const INCOME = 'var(--success)'
export const EXPENSE = 'var(--destructive)'
