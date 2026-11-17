'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { animate, stagger } from 'animejs'
import { toast } from 'sonner'
import { ArrowRight, Check, CheckCheck, Flame, MoveHorizontal, Play } from 'lucide-react'
import { Counter, goToStyle } from './bits'

const TICKER_TEXT = 'KONSISTENSI // STREAK // FOKUS // DISIPLIN // RUTINITAS // '

type Habit = { id: number; name: string; tag: string; tagBg: string; done: boolean }

const INITIAL_HABITS: Habit[] = [
  { id: 1, name: 'Minum 8 gelas air', tag: 'Kesehatan', tagBg: 'bg-[#E4EFE0]', done: true },
  { id: 2, name: 'Baca 20 halaman', tag: 'Belajar', tagBg: 'bg-[#EFE9DA]', done: false },
  { id: 3, name: 'Lari pagi 3 km', tag: 'Kebugaran', tagBg: 'bg-[#DCE9D4]', done: false },
  { id: 4, name: 'Meditasi 10 menit', tag: 'Pikiran', tagBg: 'bg-[#E8E0D5]', done: false },
  { id: 5, name: 'Tidur sebelum 23.00', tag: 'Istirahat', tagBg: 'bg-[#E4EFE0]', done: false },
]

const STATS = [
  { bg: 'bg-[#E4EFE0]', rotate: '-rotate-1', value: 27, suffix: '', label: 'Hari streak terpanjang' },
  { bg: 'bg-[#EFE9DA]', rotate: 'rotate-1', value: 82, suffix: '%', label: 'Tingkat konsistensi' },
  { bg: 'bg-[#DCE9D4]', rotate: '-rotate-1', value: 1248, suffix: '', label: 'Total check-in' },
]

const ctaToast = () =>
  toast.info('Ini contoh gaya Neubrutalism', {
    description: 'Di produksi, tombol ini membuka pendaftaran.',
  })

/** Doodle SVG dekoratif yang mengambang pelan di sekitar kartu streak. */
function Bobber({
  className,
  floatDuration,
  delay,
  children,
}: {
  className: string
  floatDuration: number
  delay: number
  children: ReactNode
}) {
  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute ${className}`}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 220, damping: 14 }}
    >
      <motion.div
        animate={{ y: [0, -7, 0], rotate: [0, 5, 0] }}
        transition={{ duration: floatDuration, repeat: Infinity, ease: 'easeInOut', delay }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

export default function Neobrutalism() {
  const heroRightRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const gridInView = useInView(gridRef, { once: true, margin: '-60px' })
  const [habits, setHabits] = useState(INITIAL_HABITS)

  // Kartu kebiasaan masuk bergelombang saat masuk viewport (anime.js stagger)
  useEffect(() => {
    if (!gridInView || !gridRef.current) return
    const anim = animate(Array.from(gridRef.current.children) as HTMLElement[], {
      opacity: [0, 1],
      y: [26, 0],
      duration: 550,
      delay: stagger(70),
      ease: 'outExpo',
    })
    return () => anim.revert()
  }, [gridInView])

  const done = habits.filter((h) => h.done).length

  const toggle = (id: number) => {
    const prev = habits
    const next = prev.map((h) => (h.id === id ? { ...h, done: !h.done } : h))
    setHabits(next)
    if (next.every((h) => h.done) && !prev.every((h) => h.done)) {
      toast.success('CEKLIS PENUH! Hari yang brutal-productive.')
    }
  }

  return (
    <section className="w-full overflow-hidden bg-[#F5F3EE] pb-0 pt-20 text-[#231F1E]">
      {/* ===================== NAV ===================== */}
      <nav aria-label="Navigasi utama" className="w-full border-b-[2.5px] border-[#4A3B32] bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="flex items-center gap-2.5"
            aria-label="Rutina — kembali ke atas"
          >
            <span className="flex size-9 items-center justify-center bg-[#231F1E]">
              <CheckCheck className="size-5 text-white" strokeWidth={2.5} />
            </span>
            <span className="text-lg font-black uppercase tracking-tight">Rutina</span>
          </a>
          <div className="hidden items-center gap-6 sm:flex">
            {['Fitur', 'Cara kerja', 'Cerita'].map((l) => (
              <a
                key={l}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-xs font-bold uppercase tracking-wide decoration-[2.5px] underline-offset-4 hover:underline"
              >
                {l}
              </a>
            ))}
          </div>
          <button
            type="button"
            onClick={ctaToast}
            className="inline-flex h-10 items-center border-[2.5px] border-[#4A3B32] bg-[#E4EFE0] px-4 text-xs font-bold uppercase tracking-wide text-[#231F1E] shadow-[4px_4px_0_0_#4A3B32] transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
          >
            Daftar gratis
          </button>
        </div>
      </nav>

      {/* ===================== HERO ===================== */}
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:items-center">
        {/* Kiri: copy */}
        <div>
          <motion.span
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.45 }}
            className="inline-block -rotate-2 border-[2.5px] border-[#4A3B32] bg-[#E4EFE0] px-3 py-1 text-xs font-black uppercase tracking-wide shadow-[3px_3px_0_0_#4A3B32]"
          >
            Gratis 30 hari
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-7xl"
          >
            <span className="block">Bangun</span>
            <span className="block">kebiasaan.</span>
            <span className="mt-1 block">
              <span className="box-decoration-clone bg-[#A3C48E] px-2 py-[0.14em]">Tanpa basa-basi.</span>
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.5 }}
            className="mt-5 max-w-md text-sm font-medium leading-relaxed text-[#4A3B32] sm:text-base"
          >
            Rutina itu lugas: centang yang selesai, jaga streak tetap menyala, ulangi besok.
            Tanpa fitur ribet, tanpa notifikasi culun.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.5 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <button
              type="button"
              onClick={ctaToast}
              className="inline-flex h-12 w-full items-center justify-center gap-2 border-[2.5px] border-[#4A3B32] bg-[#749B58] px-6 text-sm font-black uppercase tracking-wide text-white shadow-[5px_5px_0_0_#4A3B32] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#5E7F47] hover:shadow-[6px_6px_0_0_#4A3B32] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none sm:w-auto"
            >
              Mulai sekarang <ArrowRight className="size-4" strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={() => goToStyle(2)}
              className="inline-flex h-12 w-full items-center justify-center gap-2 border-[2.5px] border-[#4A3B32] bg-white px-6 text-sm font-black uppercase tracking-wide shadow-[5px_5px_0_0_#4A3B32] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#4A3B32] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none sm:w-auto"
            >
              <Play className="size-4" strokeWidth={3} /> Lihat demo
            </button>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.42, duration: 0.5 }}
            className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A7D72]"
          >
            Tanpa kartu kredit — batalkan kapan saja
          </motion.p>
        </div>

        {/* Kanan: stiker yang bisa digeser */}
        <div
          ref={heroRightRef}
          className="relative flex min-h-[26rem] items-center justify-center py-8 md:min-h-[32rem]"
        >
          <Bobber className="-top-1 left-3 sm:left-8" floatDuration={4.2} delay={0.5}>
            <svg viewBox="0 0 24 24" className="size-9 rotate-12" fill="none">
              <path
                d="M12 1.5 14.6 9.4 22.5 12 14.6 14.6 12 22.5 9.4 14.6 1.5 12 9.4 9.4Z"
                fill="#A3C48E"
                stroke="#4A3B32"
                strokeWidth="1.6"
              />
            </svg>
          </Bobber>
          <Bobber className="bottom-10 left-4 sm:left-0" floatDuration={5.1} delay={0.62}>
            <svg viewBox="0 0 36 16" className="w-11 -rotate-6" fill="none">
              <path
                d="M2 13 9 3l7 10 7-10 7 10"
                stroke="#749B58"
                strokeWidth="4"
                strokeLinecap="square"
              />
            </svg>
          </Bobber>
          <Bobber className="right-2 top-6 sm:-right-4" floatDuration={4.7} delay={0.74}>
            <svg viewBox="0 0 24 24" className="size-8" fill="none">
              <path
                d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17"
                stroke="#4A3B32"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
            </svg>
          </Bobber>

          <motion.div
            drag
            dragConstraints={heroRightRef}
            dragElastic={0.2}
            whileHover={{ scale: 1.02 }}
            whileDrag={{ scale: 1.05, rotate: 2 }}
            initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 190, damping: 15 }}
            className="relative z-10 rotate-3 cursor-grab touch-none active:cursor-grabbing"
          >
            <div className="w-full max-w-xs rounded-2xl border-[2.5px] border-[#4A3B32] bg-white p-6 text-center shadow-[6px_6px_0_0_#4A3B32] sm:p-7">
              <div className="mx-auto flex size-24 items-center justify-center rounded-2xl border-[2.5px] border-[#4A3B32] bg-[#EFE9DA]">
                <Flame className="size-12 text-[#4A3B32]" strokeWidth={2.5} />
              </div>
              <p className="mt-5 text-3xl font-black uppercase leading-none tracking-tight">
                27 hari streak!
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#4A3B32]">
                Jangan biarkan apinya padam
              </p>
              <p className="mt-5 flex items-center justify-center gap-1.5 border-t-[2.5px] border-dashed border-[#4A3B32] pt-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#8A7D72]">
                <MoveHorizontal className="size-4" /> Geser aku
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ===================== TICKER ===================== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.5 }}
        className="-ml-[1%] w-[102%] -rotate-1 overflow-hidden border-y-[2.5px] border-[#4A3B32] bg-white"
      >
        <p className="whitespace-nowrap py-2.5 text-sm font-black uppercase tracking-wide text-[#231F1E]">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} aria-hidden={i > 0}>
              {TICKER_TEXT}
            </span>
          ))}
        </p>
      </motion.div>

      {/* ===================== CEKLIS HARI INI ===================== */}
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
                Ceklis hari ini
              </h2>
              <span className="rotate-2 border-2 border-[#4A3B32] bg-[#EFE9DA] px-1.5 py-0.5 text-[9px] font-black uppercase shadow-[2px_2px_0_0_#4A3B32]">
                Interaktif
              </span>
            </div>
            <p className="mt-2 max-w-sm text-sm font-medium text-[#4A3B32]">
              Lima kebiasaan, satu misi: jangan bolong. Sentil kotaknya.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full sm:w-72"
          >
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-wide">
              <span>Progres</span>
              <span className="tabular-nums">{done}/5 selesai</span>
            </div>
            <div className="h-5 overflow-hidden rounded-full border-[2.5px] border-[#4A3B32] bg-white">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(done / 5) * 100}%` }}
                transition={{ type: 'spring', stiffness: 160, damping: 22 }}
                className={`h-full rounded-full ${done === 5 ? 'bg-[#A3C48E]' : 'bg-[#749B58]'}`}
              />
            </div>
          </motion.div>
        </div>

        <div ref={gridRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {habits.map((h) => (
            <div key={h.id} className="opacity-0">
              <div className="flex h-full items-center gap-3 rounded-xl border-[2.5px] border-[#4A3B32] bg-white p-4 shadow-[5px_5px_0_0_#4A3B32] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#4A3B32]">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={h.done}
                  aria-label={h.name}
                  onClick={() => toggle(h.id)}
                  className={`flex size-9 shrink-0 items-center justify-center border-[2.5px] border-[#4A3B32] transition-colors ${
                    h.done ? 'bg-[#749B58]' : 'bg-white hover:bg-[#F5F3EE]'
                  }`}
                >
                  <AnimatePresence initial={false}>
                    {h.done && (
                      <motion.span
                        key="check"
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 30 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        className="flex"
                      >
                        <Check className="size-5 text-white" strokeWidth={3.5} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
                <p
                  className={`min-w-0 flex-1 text-sm font-bold uppercase leading-snug ${
                    h.done ? 'text-[#A99C90] line-through' : ''
                  }`}
                >
                  {h.name}
                </p>
                <span
                  className={`-rotate-1 shrink-0 border-2 border-[#4A3B32] px-1.5 py-0.5 text-[9px] font-black uppercase ${h.tagBg}`}
                >
                  {h.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===================== STATISTIK ===================== */}
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.09, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className={`flex h-full flex-col items-center justify-center rounded-xl border-[2.5px] border-[#4A3B32] p-4 text-center shadow-[6px_6px_0_0_#4A3B32] transition-transform hover:rotate-0 sm:p-6 ${s.bg} ${s.rotate}`}
              >
                <p className="text-2xl font-black tabular-nums tracking-tight sm:text-5xl">
                  <Counter to={s.value} />
                  {s.suffix}
                </p>
                <p className="mt-2 text-[9px] font-black uppercase tracking-wide sm:text-[10px]">
                  {s.label}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ===================== TIKET CTA ===================== */}
      <div className="mx-auto my-14 max-w-3xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ type: 'spring', stiffness: 140, damping: 17 }}
        >
          <div className="relative flex flex-col rounded-2xl border-[2.5px] border-[#4A3B32] bg-white shadow-[8px_8px_0_0_#4A3B32] sm:flex-row">
            {/* Setengah kiri */}
            <div className="flex-1 p-6 sm:p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8A7D72]">
                Tiket masuk
              </p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-tight sm:text-3xl">
                Klaim mode percobaanmu
              </h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-[#4A3B32]">
                30 hari akses penuh. Tanpa kartu kredit, tanpa komitmen, tanpa drama.
              </p>
              <button
                type="button"
                onClick={() => toast.success('Tiket percobaan 30 hari diklaim! (demo)')}
                className="mt-6 inline-flex h-11 items-center border-[2.5px] border-[#4A3B32] bg-[#231F1E] px-5 text-xs font-black uppercase tracking-wide text-white shadow-[5px_5px_0_0_rgba(74,59,50,0.25)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-[5px] active:translate-y-[5px] active:shadow-none"
              >
                Ambil tiketmu
              </button>
            </div>
            {/* Setengah kanan + lubang sobekan */}
            <div className="relative flex flex-1 flex-col items-center justify-center border-t-[2.5px] border-dashed border-[#4A3B32] p-6 sm:border-l-[2.5px] sm:border-t-0">
              <span
                aria-hidden
                className="absolute -top-3 left-5 size-6 rounded-full border-[2.5px] border-[#4A3B32] bg-[#F5F3EE] sm:hidden"
              />
              <span
                aria-hidden
                className="absolute -top-3 right-5 size-6 rounded-full border-[2.5px] border-[#4A3B32] bg-[#F5F3EE] sm:hidden"
              />
              <span
                aria-hidden
                className="absolute -top-3.5 left-0 hidden size-6 -translate-x-1/2 rounded-full border-[2.5px] border-[#4A3B32] bg-[#F5F3EE] sm:block"
              />
              <span
                aria-hidden
                className="absolute -bottom-3.5 left-0 hidden size-6 -translate-x-1/2 rounded-full border-[2.5px] border-[#4A3B32] bg-[#F5F3EE] sm:block"
              />
              <p className="text-3xl font-black uppercase tracking-tight">30 hari</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#8A7D72]">
                Percobaan penuh
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ===================== FOOTER ===================== */}
      <footer className="bg-[#231F1E] px-4 py-8 text-[#F5F3EE] sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
          <span className="text-lg font-black uppercase tracking-tight">Rutina</span>
          <nav aria-label="Navigasi footer" className="flex items-center gap-5 text-xs font-bold uppercase text-[#E9E5DC]">
            {['Tentang', 'Bantuan', 'Privasi'].map((l) => (
              <a
                key={l}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="transition-colors hover:text-white"
              >
                {l}
              </a>
            ))}
          </nav>
          <p className="text-xs text-[#A99C90]">© 2025 — dibangun tanpa basa-basi.</p>
        </div>
      </footer>
    </section>
  )
}
