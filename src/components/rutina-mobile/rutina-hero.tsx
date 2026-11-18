'use client'

import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { playfair } from './serif'
import type { RutinaModule } from './rutina-module'

/**
 * RutinaHero — standar komposisi hero card tiap modul.
 *
 * Earth-Tone Editorial Bento: setiap layar memiliki SATU hero dominan yang
 * menjelaskan tujuan layar itu. Komposisi wajib (aturan design system):
 *   1. eyebrow      — konteks layar (mis. "KEUANGAN · TOTAL SALDO")
 *   2. headline     — judul serif / metrik paling penting
 *   3. children     — visual / progres (cincin, bar, grafik mini)
 *   4. action       — SATU aksi utama (tombol glass putih)
 *   5. secondary    — info sekunder yang tidak mengulang bagian lain
 *
 * Aturan visual: hero berwarna maksimal SATU per layar; gradien hanya di
 * hero; radius 24px. Varian `brand` = identitas espresso + emas + parchment
 * (hero yang tidak terbalik dark mode). Varian module = gradasi warna
 * domain (strong → base), teks putih.
 */

/** Gradasi hero per identitas — hanya hero yang boleh bergradien. */
const HERO_GRADIENT: Record<RutinaModule | 'brand', string> = {
  brand:
    'bg-[linear-gradient(135deg,var(--hero-surface)_0%,var(--hero-surface-raised)_46%,var(--hero-surface)_100%)]',
  bugar:
    'bg-[linear-gradient(135deg,var(--module-bugar-strong)_0%,var(--module-bugar)_100%)]',
  finance:
    'bg-[linear-gradient(135deg,var(--module-finance-strong)_0%,var(--module-finance)_100%)]',
  journal:
    'bg-[linear-gradient(135deg,var(--module-journal-strong)_0%,var(--module-journal)_100%)]',
  stats: 'bg-[linear-gradient(135deg,var(--module-stats-strong)_0%,var(--module-stats)_100%)]',
  kebiasaan:
    'bg-[linear-gradient(135deg,var(--module-kebiasaan-strong)_0%,var(--module-kebiasaan)_100%)]',
  profil:
    'bg-[linear-gradient(135deg,var(--module-profil-strong)_0%,var(--module-profil)_100%)]',
}

export interface RutinaHeroProps
  extends HTMLAttributes<HTMLElement> {
  /** Identitas warna hero — 'brand' (espresso+emas) atau domain modul. */
  module?: RutinaModule | 'brand'
  /** Konteks layar — label kecil huruf kapital di paling atas. */
  eyebrow: ReactNode
  /** Judul / metrik paling penting — dirender serif Playfair. */
  headline: ReactNode
  /** Area visual / progres (cincin, bar, mini-chart). */
  children?: ReactNode
  /** SATU aksi utama (tombol glass putih, lihat kelas contoh di dok). */
  action?: ReactNode
  /** Info sekunder (chip, caption) — tidak boleh mengulang isi lain. */
  secondary?: ReactNode
}

export function RutinaHero({
  module: mod = 'brand',
  eyebrow,
  headline,
  children,
  action,
  secondary,
  className,
  ...props
}: RutinaHeroProps) {
  const isBrand = mod === 'brand'
  return (
    <section
      data-module={isBrand ? undefined : mod}
      className={cn(
        'relative overflow-hidden rounded-[24px] p-6 shadow-ink-deep',
        HERO_GRADIENT[mod],
        className,
      )}
      {...props}
    >
      {/* Tekstur butiran halus khas hero Rutina */}
      <span
        aria-hidden="true"
        className="grain pointer-events-none absolute inset-0"
      />
      <p
        className={cn(
          'relative z-10 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.26em]',
          isBrand ? 'text-hero-accent' : 'text-white/85',
        )}
      >
        {eyebrow}
      </p>
      <div
        className={cn(
          'relative z-10 mt-2.5 font-semibold leading-[1.08] tracking-tight text-fluid-title',
          isBrand ? 'text-hero-content' : 'text-white',
          playfair.className,
        )}
      >
        {headline}
      </div>
      {children && <div className="relative z-10 mt-5">{children}</div>}
      {secondary && (
        <div className="relative z-10 mt-4">{secondary}</div>
      )}
      {action && <div className="relative z-10 mt-5">{action}</div>}
    </section>
  )
}

/**
 * Kelas tombol aksi utama di dalam hero — kaca putih di atas gradasi gelap;
 * kontras aman untuk hero brand maupun module. Pakai di elemen <button>.
 */
export const heroActionClass =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white/15 px-5 text-[13px] font-bold text-white backdrop-blur transition-colors hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
