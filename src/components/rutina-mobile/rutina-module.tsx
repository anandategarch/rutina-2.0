'use client'

/* v2.49 (audit): import HTMLAttributes & cn tidak terpakai setelah
   RutinaModuleShell dihapus (nol konsumen). */

/**
 * RutinaModuleShell — penanda domain warna sebuah layar/bagian.
 *
 * Color System 2.0 (Earth-Tone Editorial Bento): setiap modul punya warna
 * domain sendiri — Bugar Eucalyptus Teal, Keuangan Antique Bronze, Jurnal
 * Dusty Mauve, Statistik Mineral Slate, Kebiasaan Rose Clay, Profil Cocoa
 * Gold. Beranda memakai identitas matcha (default, tanpa module).
 *
 * Shell ini hanya memasang atribut `data-module` pada akar wilayah; seluruh
 * utilitas kontekstual `*-module-accent` (bg-module-accent/15,
 * text-module-accent-strong, bg-module-accent-soft, dst.) di dalamnya
 * otomatis mewarisi warna domain — kelas sama, tampilan berbeda per modul,
 * terang & gelap. Warna status (success/warning/danger) dan interaksi utama
 * tetap memakai token semantic agar maknanya konsisten lintas layar.
 */
export type RutinaModule =
  | 'bugar'
  | 'finance'
  | 'journal'
  | 'stats'
  | 'kebiasaan'
  | 'profil'

/* v2.49 (audit): RutinaModuleShell & MODULE_BORDER dihapus — nol
 *  konsumen sejak Color System 2.0 memakai utilitas kontekstual. */

/* ---- Peta kelas eksplisit (non-kontekstual) ----------------------------
   Dipakai saat komponen perlu warna domain SPESIFIK yang tidak bergantung
   pada layar tempat ia dirender (mis. ikon Bugar di ContextRail Beranda). */
export const MODULE_SOFT_BG: Record<RutinaModule, string> = {
  bugar: 'bg-module-bugar-soft',
  finance: 'bg-module-finance-soft',
  journal: 'bg-module-journal-soft',
  stats: 'bg-module-stats-soft',
  kebiasaan: 'bg-module-kebiasaan-soft',
  profil: 'bg-module-profil-soft',
}

export const MODULE_TEXT: Record<RutinaModule, string> = {
  bugar: 'text-module-bugar-strong',
  finance: 'text-module-finance-strong',
  journal: 'text-module-journal-strong',
  stats: 'text-module-stats-strong',
  kebiasaan: 'text-module-kebiasaan-strong',
  profil: 'text-module-profil-strong',
}

export const MODULE_TINT: Record<RutinaModule, string> = {
  bugar: 'bg-module-bugar/15 text-module-bugar-strong',
  finance: 'bg-module-finance/15 text-module-finance-strong',
  journal: 'bg-module-journal/15 text-module-journal-strong',
  stats: 'bg-module-stats/15 text-module-stats-strong',
  kebiasaan: 'bg-module-kebiasaan/15 text-module-kebiasaan-strong',
  profil: 'bg-module-profil/15 text-module-profil-strong',
}
