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
  Tag,
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
import type { CustomCat, FinCat, Tx, TxType } from '../store'

/** Nama tampilan + ikon lucide untuk tiap kategori transaksi.
 *  Blok "Impor Rutina 1.0" (v2.15) mempertahankan label persis seperti
 *  aplikasi lama — termasuk ejaan khas pengguna ("Cathering",
 *  "Loundry") — agar data hasil impor Turso terasa seperti milik
 *  sendiri, bukan hasil terjemahan.
 *
 *  v2.17: SATU SISTEM KATEGORI — kategori bawaan 2.0 dan impor 1.0
 *  hidup berdampingan dalam satu daftar tanpa penanda asal; kategori
 *  buatan pengguna (CustomCat) menyatu lewat catMetaOf(). */
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

/** Slug → label seluruh kategori bawaan — dipakai validasi anti-duplikat
 *  kategori buatan (store.addCustomCat). Tipe longgar (string) agar
 *  bisa dipetakan tanpa cast. */
export const CATS_UNIFIED_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(CAT_META).map(([slug, meta]) => [slug, meta.label]),
)

/** Kategori bawaan 2.0 — default lembar transaksi & urutan pertama. */
export const PRIMARY_CATS_BY_TYPE: Record<TxType, FinCat[]> = {
  keluar: ['makan', 'transport', 'belanja', 'hiburan', 'tagihan', 'kesehatan', 'lainnya'],
  masuk: ['gaji', 'bonus', 'proyek', 'lainnya'],
  transfer: [],
}

/** Kategori hasil impor Rutina 1.0 (Turso) — v2.15. Daftar asli yang
 *  benar-benar dipakai pengguna di aplikasi lama (tabel `transactions`
 *  + templat berulang). v2.17: tidak lagi ditampilkan TERPISAH —
 *  menyatu di CATS_BY_TYPE tanpa penanda asal. */
const LEGACY_CATS_BY_TYPE: Record<TxType, FinCat[]> = {
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

/** SATU DAFTAR KATEGORI per arus (v2.17): bawaan 2.0 di depan sebagai
 *  default, menyusul kategori Rutina 1.0 diurutkan abjad — tanpa
 *  penanda asal, tanpa duplikat. Kategori buatan pengguna digabungkan
 *  saat runtime lewat allCatsOf(). */
export const CATS_BY_TYPE: Record<TxType, FinCat[]> = {
  keluar: [
    ...PRIMARY_CATS_BY_TYPE.keluar,
    ...LEGACY_CATS_BY_TYPE.keluar,
  ],
  masuk: [...PRIMARY_CATS_BY_TYPE.masuk, ...LEGACY_CATS_BY_TYPE.masuk],
  transfer: [],
}

/** Subkategori bawaan (v2.17) — rincian opsional DI BAWAH kategori
 *  induk; hanya untuk kategori bawaan 2.0 dan sengaja tidak menabrak
 *  nama kategori impor 1.0 yang sudah berdiri sendiri (mis. Bensin,
 *  Parkir, Tagihan Air). Kategori buatan bisa punya subkategori
 *  sendiri lewat CustomCat.parentKey. */
export const BUILT_IN_SUBCATS: Partial<Record<FinCat, string[]>> = {
  makan: ['Sarapan', 'Makan Siang', 'Makan Malam', 'Camilan'],
  transport: ['Ojek Online', 'KRL/MRT', 'Bus', 'Taksi'],
  belanja: ['Kebutuhan Rumah', 'Pakaian', 'Elektronik', 'Hadiah'],
  hiburan: ['Streaming', 'Game', 'Bioskop', 'Buku'],
  tagihan: ['Internet', 'Langganan', 'Sewa'],
  kesehatan: ['Obat', 'Dokter', 'Vitamin', 'Lab'],
}

/** Ikon kategori buatan & fallback (slug tak dikenal). */
export const CUSTOM_CAT_ICON = Tag

export interface CatMeta {
  label: string
  icon: LucideIcon
}

/** Meta kategori AMAN untuk slug apa pun (v2.17): kategori bawaan →
 *  CAT_META; kategori buatan → nama pengguna + ikon tag; slug asing
 *  (mis. data luar) → label kapitalisasi. UI tidak lagi perlu
 *  CAT_META[cat] langsung yang bisa melempar undefined. */
export function catMetaOf(cat: string, customCats: CustomCat[] = []): CatMeta {
  const builtin = (CAT_META as Record<string, CatMeta | undefined>)[cat]
  if (builtin) return builtin
  const custom = customCats.find((c) => c.id === cat)
  if (custom) return { label: custom.name, icon: CUSTOM_CAT_ICON }
  const pretty = cat
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  return { label: pretty, icon: CUSTOM_CAT_ICON }
}

/** Seluruh kategori utama untuk satu arus — bawaan + buatan (v2.17). */
export function allCatsOf(type: TxType, customCats: CustomCat[]): string[] {
  const custom = customCats
    .filter((c) => c.type === type && !c.parentKey)
    .map((c) => c.id)
  return [...CATS_BY_TYPE[type], ...custom]
}

/** Subkategori yang tersedia untuk satu kategori: bawaan (curated)
 *  + buatan dengan parentKey kategori tersebut. */
export function subcatsOf(cat: string, customCats: CustomCat[]): string[] {
  const builtin = (BUILT_IN_SUBCATS as Record<string, string[] | undefined>)[cat] ?? []
  const custom = customCats
    .filter((c) => c.parentKey === cat)
    .map((c) => c.name)
  return [...builtin, ...custom]
}

/** Kategori yang sering dipakai (v2.17) — dihitung dari frekuensi
 *  transaksi nyata arus tersebut; dipakai bagian "Sering dipakai"
 *  pemilih kategori. */
export function frequentCats(
  txs: Tx[],
  type: TxType,
  limit = 6,
): { cat: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const t of txs) {
    if (t.type !== type) continue
    counts.set(t.cat, (counts.get(t.cat) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([cat, count]) => ({ cat, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/** Kategori pengeluaran yang bisa dianggarkan — bawaan + impor 1.0
 *  yang paling sering dikendalikan + kategori buatan arus keluar
 *  (digabung saat runtime oleh layar anggaran). */
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
