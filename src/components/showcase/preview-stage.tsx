'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

import { RutinaApp } from '@/components/rutina-mobile/rutina-app'
import GamifiedHero from '@/components/rutina-mobile/variants/gamified-hero'
import CleanTypography from '@/components/rutina-mobile/variants/clean-typography'

/* ===== Daftar varian desain ===== */

type VariantId = 'bento' | 'gamified' | 'clean'

const VARIANTS: {
  id: VariantId
  short: string
  name: string
  dot: string
  active: string
  caption: string
}[] = [
  {
    id: 'bento',
    short: 'Bento',
    name: 'Bento Grid Dashboard',
    dot: '#F5F3EE',
    active: 'bg-[#F5F3EE] text-[#231F1E] ring-1 ring-[#4A3B321F]',
    caption:
      '01 · Bento Grid — dasbor klasik: hero matcha, task row, dan widget di atas kanvas Warm Sand.',
  },
  {
    id: 'gamified',
    short: 'Gamified',
    name: 'Gamified & Interactive Hero',
    dot: '#4A3B32',
    active: 'bg-[#4A3B32] text-[#FAF9F6]',
    caption:
      '02 · Gamified & Interactive Hero — kanvas dibalik: Espresso menjadi latar, misi berhadiah XP.',
  },
  {
    id: 'clean',
    short: 'Clean',
    name: 'Clean Centered / Typography + Floating Widgets',
    dot: '#749B58',
    active: 'bg-[#749B58] text-[#FAF9F6]',
    caption:
      '03 · Clean Centered Typography — kanvas dibalik: Matcha menjadi latar, serif editorial + widget melayang.',
  },
]

/** Warna cahaya ambien panel kanan mengikuti varian aktif. */
const AMBIENT: Record<VariantId, [string, string, string]> = {
  bento: ['rgba(228,239,224,0.70)', 'rgba(116,155,88,0.15)', 'rgba(234,229,217,0.50)'],
  gamified: ['rgba(74,59,50,0.20)', 'rgba(116,155,88,0.22)', 'rgba(35,31,30,0.14)'],
  clean: ['rgba(116,155,88,0.24)', 'rgba(228,239,224,0.85)', 'rgba(163,196,137,0.30)'],
}

/* ===== Sakelar varian — pil tab dengan warna kanvas masing-masing ===== */

function VariantSwitcher({
  variant,
  onChange,
}: {
  variant: VariantId
  onChange: (v: VariantId) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Pilih varian desain"
      className="flex items-center gap-1 rounded-full border border-[#4A3B3214] bg-white/85 p-1.5 shadow-sm backdrop-blur"
    >
      {VARIANTS.map((v) => {
        const active = variant === v.id
        return (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={v.name}
            onClick={() => onChange(v.id)}
            className="relative flex h-9 cursor-pointer items-center gap-2 rounded-full px-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] sm:px-4"
          >
            {active && (
              <motion.span
                layoutId="variant-pill"
                aria-hidden="true"
                className={`absolute inset-0 rounded-full ${v.active}`}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span
              aria-hidden="true"
              className="relative z-10 h-2.5 w-2.5 rounded-full ring-1 ring-[#231F1E]/15"
              style={{ backgroundColor: v.dot }}
            />
            <span
              className={`relative z-10 text-[12px] font-bold tracking-wide transition-colors ${
                active ? '' : 'text-[#4A3B32]/65'
              }`}
            >
              {v.short}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ===== Panel kanan — panggung preview dengan penjelajah varian ===== */

export function PreviewStage() {
  const [variant, setVariant] = useState<VariantId>('bento')
  // Splash hanya diputar sekali di boot pertama; pergantian varian
  // berikutnya langsung masuk aplikasi tanpa mengulang pembuka.
  const [booted, setBooted] = useState(false)

  const change = (v: VariantId) => {
    setBooted(true)
    setVariant(v)
  }

  const caption = VARIANTS.find((v) => v.id === variant)?.caption
  const ambient = AMBIENT[variant]

  return (
    <main className="relative flex min-h-dvh w-full flex-col overflow-y-auto bg-[#F5F3EE] no-scrollbar lg:h-dvh lg:min-h-0 lg:w-1/2">
      {/* Cahaya ambien lembut di latar — warnanya mengikuti varian */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full blur-3xl transition-colors duration-700"
        style={{ backgroundColor: ambient[0] }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full blur-3xl transition-colors duration-700"
        style={{ backgroundColor: ambient[1] }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-colors duration-700"
        style={{ backgroundColor: ambient[2] }}
      />

      {/* m-auto: memusatkan saat muat, tetap bisa digulir saat viewport pendek */}
      <div className="relative m-auto flex w-full flex-col items-center gap-5 sm:px-8 sm:py-8">
        {/* Petunjuk + sakelar varian — alur normal (sm+) */}
        <div className="hidden flex-col items-center gap-3 sm:flex">
          <p className="flex items-center gap-2.5 rounded-full border border-[#4A3B3214] bg-white/80 px-4 py-2 text-xs font-semibold text-[#4A3B32] shadow-sm backdrop-blur">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#749B58] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#749B58]" />
            </span>
            Preview interaktif — centang tugas, buka jurnal, coba fiturnya
          </p>
          <VariantSwitcher variant={variant} onChange={change} />
          <p className="hidden max-w-[400px] text-center text-[11px] font-medium leading-relaxed text-[#4A3B32]/60 lg:block">
            {caption}
          </p>
        </div>

        {/* Sakelar varian mengambang — hanya mobile (<640px) */}
        <div className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-[max(env(safe-area-inset-top),10px)] sm:hidden">
          <VariantSwitcher variant={variant} onChange={change} />
        </div>

        {/* Bingkai ponsel di desktop; layar penuh di perangkat mobile.
            Tinggi di sm+ mengompensasi sakelar + caption di atasnya agar
            ponsel tetap utuh terlihat tanpa harus menggulir panel. */}
        <div className="relative h-dvh w-full overflow-hidden bg-[#F5F3EE] pt-[58px] sm:h-[min(840px,calc(100dvh-235px))] sm:w-[400px] sm:rounded-[3rem] sm:border-[10px] sm:border-[#14100D] sm:pt-0 sm:shadow-[0_60px_120px_-40px_rgba(35,31,30,0.5)]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={variant}
              className="h-full"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {variant === 'bento' && <RutinaApp skipSplash={booted} />}
              {variant === 'gamified' && <GamifiedHero />}
              {variant === 'clean' && <CleanTypography />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}
