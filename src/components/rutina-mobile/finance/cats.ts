import {
  Briefcase,
  Bus,
  Gamepad2,
  Gift,
  HeartPulse,
  MoreHorizontal,
  Palette,
  Receipt,
  ShoppingBag,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import type { FinCat, TxType } from '../store'

/** Nama tampilan + ikon lucide untuk tiap kategori transaksi. */
export const CAT_META: Record<FinCat, { label: string; icon: LucideIcon }> = {
  makan: { label: 'Makan & Minum', icon: UtensilsCrossed },
  transport: { label: 'Transportasi', icon: Bus },
  belanja: { label: 'Belanja', icon: ShoppingBag },
  hiburan: { label: 'Hiburan', icon: Gamepad2 },
  tagihan: { label: 'Tagihan', icon: Receipt },
  kesehatan: { label: 'Kesehatan', icon: HeartPulse },
  lainnya: { label: 'Lainnya', icon: MoreHorizontal },
  gaji: { label: 'Gaji', icon: Briefcase },
  bonus: { label: 'Bonus', icon: Gift },
  proyek: { label: 'Proyek', icon: Palette },
}

/** Urutan kategori pada pemilih di lembar tambah transaksi. */
export const CATS_BY_TYPE: Record<TxType, FinCat[]> = {
  keluar: ['makan', 'transport', 'belanja', 'hiburan', 'tagihan', 'kesehatan', 'lainnya'],
  masuk: ['gaji', 'bonus', 'proyek', 'lainnya'],
}

/** Warna semantik arus uang (dipakai di seluruh tab Keuangan). */
export const INCOME = '#A3C489'
export const EXPENSE = '#E08A6D'
