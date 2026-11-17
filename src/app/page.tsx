'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react'
import { Columns2, LayoutGrid, NotebookPen, Type } from 'lucide-react'
import BentoGrid from '@/components/landing/bento-grid'
import DailyCards from '@/components/landing/daily-cards'
import SplitScreen from '@/components/landing/split-screen'
import TypographyDriven from '@/components/landing/typography-driven'

const STYLES = [
  {
    id: 'cards',
    label: 'Kartu Harian',
    short: 'Kartu',
    icon: NotebookPen,
    Component: DailyCards,
  },
  { id: 'split', label: 'Split Screen', short: 'Split', icon: Columns2, Component: SplitScreen },
  { id: 'bento', label: 'Bento Grid', short: 'Bento', icon: LayoutGrid, Component: BentoGrid },
  { id: 'type', label: 'Tipografi', short: 'Tipe', icon: Type, Component: TypographyDriven },
]

export default function Home() {
  const [active, setActive] = useState(0)
  const { scrollY } = useScroll()
  const hintOpacity = useTransform(scrollY, [0, 64], [1, 0])

  const goTo = useCallback((i: number) => {
    setActive(((i % STYLES.length) + STYLES.length) % STYLES.length)
    window.scrollTo(0, 0)
  }, [])

  // Pintasan keyboard: 1–4 untuk lompat, panah kiri/kanan untuk berpindah
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= String(STYLES.length)) goTo(Number(e.key) - 1)
      if (e.key === 'ArrowRight') goTo(active + 1)
      if (e.key === 'ArrowLeft') goTo(active - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, goTo])

  // Jembatan dari CTA di dalam gaya (mis. "Jelajahi gaya lain" -> pindah gaya)
  useEffect(() => {
    const handler = (e: Event) => goTo((e as CustomEvent<number>).detail)
    window.addEventListener('rutina:goto', handler)
    return () => window.removeEventListener('rutina:goto', handler)
  }, [goTo])

  const Current = STYLES[active].Component

  return (
    <main className="relative min-h-screen bg-[#F5F3EE]">
      {/* Switcher gaya */}
      <nav
        aria-label="Pilih gaya landing page"
        className="fixed inset-x-0 top-3 z-50 flex justify-center overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="mx-auto flex w-max items-center gap-1 rounded-full border border-[#E9E5DC] bg-white/90 p-1 shadow-lg shadow-[#4A3B32]/10 backdrop-blur">
          {STYLES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              className={`relative flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
                i === active ? 'text-white' : 'text-[#8A7D72] hover:text-[#231F1E]'
              }`}
            >
              {i === active && (
                <motion.span
                  layoutId="style-pill"
                  className="absolute inset-0 rounded-full bg-[#749B58]"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <s.icon className="relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10 hidden sm:inline">{s.label}</span>
              <span className="relative z-10 sm:hidden">{s.short}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Petunjuk keyboard — memudar saat halaman digulir */}
      <motion.p
        style={{ opacity: hintOpacity }}
        className="pointer-events-none fixed inset-x-0 top-[60px] z-40 hidden justify-center text-center font-mono text-[9px] font-medium uppercase tracking-[0.24em] text-white mix-blend-difference sm:flex"
      >
        Tekan 1–{STYLES.length} atau panah kiri/kanan untuk pindah gaya
      </motion.p>

      {/* Konten gaya aktif */}
      <AnimatePresence mode="wait">
        <motion.div
          key={STYLES[active].id}
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        >
          <Current />
        </motion.div>
      </AnimatePresence>

      {/* HUD penanda gaya aktif */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 hidden font-mono text-[9px] font-medium uppercase tracking-[0.24em] text-white mix-blend-difference sm:block">
        {String(active + 1).padStart(2, '0')} / {String(STYLES.length).padStart(2, '0')} —{' '}
        {STYLES[active].label}
      </div>
    </main>
  )
}
