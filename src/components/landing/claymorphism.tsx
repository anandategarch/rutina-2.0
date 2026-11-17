'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { motion, useInView } from 'motion/react'
import { animate, stagger } from 'animejs'
import { toast } from 'sonner'
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarCheck,
  Check,
  CheckCheck,
  CloudUpload,
  Droplets,
  Flame,
  Moon,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
  WifiOff,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Counter, goToStyle } from './bits'

/* ===== Resep clay: bayangan jatuh lembut + cahaya dari atas + gelap dari bawah ===== */
const CLAY_BASE =
  'shadow-[0_14px_28px_rgba(74,59,50,0.18),inset_0_6px_10px_rgba(255,255,255,0.85),inset_0_-8px_14px_rgba(74,59,50,0.09)]'
const CLAY_PEACH =
  'shadow-[0_14px_28px_rgba(74,59,50,0.22),inset_0_6px_10px_rgba(255,255,255,0.75),inset_0_-8px_14px_rgba(74,59,50,0.16)]'
const CLAY_MINT =
  'shadow-[0_14px_28px_rgba(116,155,88,0.20),inset_0_6px_10px_rgba(255,255,255,0.75),inset_0_-8px_14px_rgba(116,155,88,0.14)]'
const CLAY_BUTTER =
  'shadow-[0_14px_28px_rgba(139,128,110,0.22),inset_0_6px_10px_rgba(255,255,255,0.80),inset_0_-8px_14px_rgba(139,128,110,0.14)]'
const CLAY_ROSE =
  'shadow-[0_14px_28px_rgba(120,105,92,0.18),inset_0_6px_10px_rgba(255,255,255,0.80),inset_0_-8px_14px_rgba(120,105,92,0.12)]'
const CLAY_CORAL =
  'shadow-[0_10px_22px_rgba(94,127,71,0.35),inset_0_4px_8px_rgba(255,255,255,0.40),inset_0_-6px_10px_rgba(94,127,71,0.28)]'

/* Resep squish: semua elemen clay membalas sentuhan seperti tanah liat */
const SQUISH = { type: 'spring', stiffness: 320, damping: 16 } as const

const NAV_LINKS = [
  { label: 'Fitur', id: 'clay-fitur' },
  { label: 'Cara kerja', id: 'clay-cara-kerja' },
  { label: 'Cerita', id: 'clay-cerita' },
]

const FOOTER_LINKS = ['Tentang', 'Bantuan', 'Privasi']

type MarqueeItem = { icon: LucideIcon; label: string }

const MARQUEE_ROW_1: MarqueeItem[] = [
  { icon: Bell, label: 'Pengingat pintar' },
  { icon: WifiOff, label: 'Mode offline' },
  { icon: BarChart3, label: 'Statistik mendalam' },
  { icon: CalendarCheck, label: 'Streak & kalender' },
  { icon: Moon, label: 'Mode malam' },
  { icon: Sparkles, label: 'Badge & reward' },
  { icon: Users, label: 'Komunitas' },
  { icon: Zap, label: 'Super ringan' },
  { icon: ShieldCheck, label: 'Tanpa iklan' },
  { icon: CloudUpload, label: 'Backup otomatis' },
]

/* Baris kedua: urutan digeser 5 (deterministik) supaya tidak identik */
const MARQUEE_ROW_2: MarqueeItem[] = [
  ...MARQUEE_ROW_1.slice(5),
  ...MARQUEE_ROW_1.slice(0, 5),
]

const PILL_COLORS = [
  { bg: 'bg-[#FFFFFF]', shadow: CLAY_BASE, icon: 'text-[#5E7F47]' },
  { bg: 'bg-[#E4EFE0]', shadow: CLAY_PEACH, icon: 'text-[#4A3B32]' },
  { bg: 'bg-[#DCE9D4]', shadow: CLAY_MINT, icon: 'text-[#5E7F47]' },
  { bg: 'bg-[#EFE9DA]', shadow: CLAY_BUTTER, icon: 'text-[#4A3B32]' },
  { bg: 'bg-[#E8E0D5]', shadow: CLAY_ROSE, icon: 'text-[#4A3B32]' },
]

const MOCK_CARDS = [
  {
    name: 'Minum 8 gelas air',
    time: 'Mulai 08.00 · tiap jam',
    icon: Droplets,
    bg: 'bg-[#E4EFE0]',
    shadow: CLAY_PEACH,
    iconClass: 'text-[#4A3B32]',
    rot: -6,
    done: false,
    note: 'Sisa 2 gelas',
  },
  {
    name: 'Meditasi 10 menit',
    time: 'Pukul 06.30',
    icon: Moon,
    bg: 'bg-[#DCE9D4]',
    shadow: CLAY_MINT,
    iconClass: 'text-[#5E7F47]',
    rot: 2,
    done: true,
    note: '',
  },
  {
    name: 'Lari pagi 3 km',
    time: 'Pukul 07.00',
    icon: Flame,
    bg: 'bg-[#EFE9DA]',
    shadow: CLAY_BUTTER,
    iconClass: 'text-[#4A3B32]',
    rot: -3,
    done: true,
    note: 'Streak 12 hari',
  },
]

const FEATURES = [
  {
    icon: Bell,
    title: 'Pengingat pintar',
    desc: 'Notifikasi lembut di jam yang paling pas dengan ritme harianmu.',
    bg: 'bg-[#E4EFE0]',
    shadow: CLAY_PEACH,
    iconClass: 'text-[#4A3B32]',
  },
  {
    icon: Flame,
    title: 'Streak & reward',
    desc: 'Api streak dan lencana yang bikin ogah bolong sehari pun.',
    bg: 'bg-[#DCE9D4]',
    shadow: CLAY_MINT,
    iconClass: 'text-[#5E7F47]',
  },
  {
    icon: BarChart3,
    title: 'Statistik hangat',
    desc: 'Grafik mingguan yang enak dibaca sekilas sambil ngopi.',
    bg: 'bg-[#EFE9DA]',
    shadow: CLAY_BUTTER,
    iconClass: 'text-[#4A3B32]',
  },
]

type Habit = { id: number; name: string; done: boolean }
const INITIAL_HABITS: Habit[] = [
  { id: 1, name: 'Minum 8 gelas air', done: true },
  { id: 2, name: 'Baca 20 halaman', done: false },
  { id: 3, name: 'Lari pagi 3 km', done: false },
  { id: 4, name: 'Meditasi 10 menit', done: false },
]

const WEEK = [
  { label: 'Sn', h: 42 },
  { label: 'Sl', h: 68 },
  { label: 'Rb', h: 50 },
  { label: 'Km', h: 85 },
  { label: 'Jm', h: 58 },
  { label: 'Sb', h: 92 },
  { label: 'Mn', h: 74 },
]

const BAR_CORAL =
  'bg-[#749B58] shadow-[0_8px_18px_rgba(94,127,71,0.30),inset_0_3px_5px_rgba(255,255,255,0.45),inset_0_-5px_9px_rgba(94,127,71,0.22)]'
const BAR_PEACH =
  'bg-[#E4EFE0] shadow-[0_8px_18px_rgba(74,59,50,0.20),inset_0_3px_5px_rgba(255,255,255,0.80),inset_0_-5px_9px_rgba(74,59,50,0.12)]'

const FOCUS_VISIBLE =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]'

/* ===== Sakelar clay: trek cekung saat mati, coral mengembang saat hidup ===== */
function ClayToggle({
  on,
  onToggle,
  label,
}: {
  on: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      transition={SQUISH}
      className={`relative h-8 w-14 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${FOCUS_VISIBLE} ${
        on
          ? 'bg-[#749B58] shadow-[0_6px_14px_rgba(94,127,71,0.35),inset_0_3px_6px_rgba(255,255,255,0.40),inset_0_-4px_8px_rgba(94,127,71,0.25)]'
          : 'bg-[#E9E5DC] shadow-[inset_0_3px_6px_rgba(74,59,50,0.25),inset_0_-2px_4px_rgba(255,255,255,0.7)]'
      }`}
    >
      <motion.span
        aria-hidden
        className="absolute top-1 left-0 size-6 rounded-full bg-white shadow-[0_3px_6px_rgba(74,59,50,0.3)]"
        animate={{ x: on ? 28 : 4 }}
        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      />
    </motion.button>
  )
}

/* ===== Satu baris marquee: track diduplikasi 2x untuk loop -50% yang mulus ===== */
function MarqueeRow({
  items,
  animation,
  colorOffset,
}: {
  items: MarqueeItem[]
  animation: string
  colorOffset: number
}) {
  return (
    <div className="group overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <div
        className={`flex w-max gap-3 pr-3 will-change-transform group-hover:[animation-play-state:paused] motion-reduce:animate-none ${animation}`}
      >
        {[0, 1].map((copy) =>
          items.map((item, i) => {
            const color = PILL_COLORS[(i + colorOffset) % PILL_COLORS.length]
            const Icon = item.icon
            return (
              <span
                key={`${copy}-${item.label}`}
                aria-hidden={copy === 1}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold text-[#4A3B32] ${color.bg} ${color.shadow}`}
              >
                <Icon className={`size-4 ${color.icon}`} />
                {item.label}
              </span>
            )
          }),
        )}
      </div>
    </div>
  )
}

export default function Claymorphism() {
  const featuresRef = useRef<HTMLDivElement>(null)
  const featuresInView = useInView(featuresRef, { once: true, margin: '-60px' })
  const barsRef = useRef<HTMLDivElement>(null)
  const barsInView = useInView(barsRef, { once: true, margin: '-40px' })
  const wordRef = useRef<HTMLDivElement>(null)
  const wordInView = useInView(wordRef, { once: true, margin: '-40px' })

  const [mockToggleOn, setMockToggleOn] = useState(true)
  const [habits, setHabits] = useState(INITIAL_HABITS)

  /* Kartu fitur masuk bergiliran (anime.js stagger) */
  useEffect(() => {
    if (!featuresInView || !featuresRef.current) return
    const anim = animate(Array.from(featuresRef.current.children) as HTMLElement[], {
      opacity: [0, 1],
      y: [24, 0],
      duration: 600,
      delay: stagger(90),
      ease: 'outExpo',
    })
    return () => {
      anim.revert()
    }
  }, [featuresInView])

  /* Batang mingguan tumbuh dari bawah dengan overshoot kenyal */
  useEffect(() => {
    if (!barsInView || !barsRef.current) return
    const anim = animate(Array.from(barsRef.current.children) as HTMLElement[], {
      scaleY: [0, 1],
      duration: 750,
      delay: stagger(70),
      ease: 'outBack(1.4)',
    })
    return () => {
      anim.revert()
    }
  }, [barsInView])

  /* Wordmark raksasa mengembang saat masuk layar */
  useEffect(() => {
    if (!wordInView || !wordRef.current) return
    const anim = animate(wordRef.current, {
      opacity: [0, 1],
      scale: [0.92, 1],
      duration: 900,
      ease: 'outBack(1.2)',
    })
    return () => {
      anim.revert()
    }
  }, [wordInView])

  const demoToast = () =>
    toast.info('Ini contoh gaya Claymorphism', {
      description: 'Di produksi, tombol ini membuka pendaftaran.',
    })

  const goToSection = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const toggleHabit = (id: number) => {
    const next = habits.map((h) => (h.id === id ? { ...h, done: !h.done } : h))
    setHabits(next)
    if (next.every((h) => h.done)) {
      toast.success('Sempurna! Semua kebiasaan hari ini tuntas.')
    }
  }

  const doneCount = habits.filter((h) => h.done).length

  return (
    <section className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#F5F3EE] pt-20">
      {/* Blob pastel penghias latar hero */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-28 top-14 size-72 rounded-full bg-[#E4EFE0] opacity-75 ${CLAY_PEACH}`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute -left-24 top-80 size-56 rounded-full bg-[#DCE9D4] opacity-75 ${CLAY_MINT}`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute right-[12%] top-[34rem] size-36 rounded-full bg-[#EFE9DA] opacity-80 ${CLAY_BUTTER}`}
      />

      {/* ===== Elemen 1: Pulau navbar melayang ===== */}
      <nav
        aria-label="Navigasi utama"
        className={`relative z-30 mx-auto mt-5 flex w-[calc(100%-2rem)] max-w-3xl items-center justify-between gap-3 rounded-full bg-[#FFFFFF] px-4 py-2.5 sm:px-5 ${CLAY_BASE}`}
      >
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          className={`flex items-center gap-2 rounded-full ${FOCUS_VISIBLE}`}
        >
          <span className={`flex size-9 items-center justify-center rounded-full bg-[#749B58] ${CLAY_CORAL}`}>
            <CheckCheck className="size-4 text-white" aria-hidden />
          </span>
          <span className="text-lg font-bold tracking-tight text-[#231F1E]">rutina</span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <motion.a
              key={l.id}
              href={`#${l.id}`}
              onClick={(e) => goToSection(e, l.id)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              transition={SQUISH}
              className={`rounded-full px-3 py-2.5 text-sm font-medium text-[#8A7D72] transition-colors hover:text-[#231F1E] ${FOCUS_VISIBLE}`}
            >
              {l.label}
            </motion.a>
          ))}
        </div>

        <motion.button
          type="button"
          onClick={demoToast}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          transition={SQUISH}
          className={`flex h-10 items-center gap-1.5 rounded-full bg-[#749B58] px-4 text-sm font-bold text-white ${CLAY_CORAL} ${FOCUS_VISIBLE}`}
        >
          Mulai <ArrowRight className="size-3.5" aria-hidden />
        </motion.button>
      </nav>

      <main className="relative z-10 flex-1">
        {/* ===== Hero ===== */}
        <div className="mx-auto mt-10 max-w-3xl px-4 text-center sm:mt-14">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className={`inline-flex items-center gap-1.5 rounded-full bg-[#DCE9D4] px-3.5 py-1.5 text-xs font-bold text-[#5E7F47] ${CLAY_MINT}`}
          >
            <Sparkles className="size-3.5" aria-hidden /> Baru — Mode Fokus
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 22, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 160, damping: 18 }}
            className="mt-5 text-4xl font-bold tracking-tight text-[#231F1E] sm:text-6xl"
          >
            Bentuk harimu seperti{' '}
            <span className="bg-gradient-to-b from-[#8FB47A] to-[#5E7F47] bg-clip-text text-transparent">
              tanah liat.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.5 }}
            className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#8A7D72] sm:text-lg"
          >
            rutina membantu kebiasaan kecil menempel setiap hari — lembut, membulat,
            dan menyenangkan disentuh.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, duration: 0.5 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <motion.button
              type="button"
              onClick={demoToast}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              transition={SQUISH}
              className={`flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#749B58] px-6 text-base font-bold text-white sm:w-auto ${CLAY_CORAL} ${FOCUS_VISIBLE}`}
            >
              Mulai gratis <ArrowRight className="size-4" aria-hidden />
            </motion.button>
            <motion.button
              type="button"
              onClick={() => goToStyle(2)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              transition={SQUISH}
              className={`flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#FFFFFF] px-6 text-base font-bold text-[#231F1E] sm:w-auto ${CLAY_BASE} ${FOCUS_VISIBLE}`}
            >
              <Play className="size-4 text-[#5E7F47]" aria-hidden /> Lihat demo
            </motion.button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.46, duration: 0.5 }}
            className="mt-4 text-[11px] font-medium text-[#A99C90]"
          >
            Gratis 30 hari · tanpa kartu kredit
          </motion.p>
        </div>

        {/* ===== Tumpukan kartu kebiasaan clay ===== */}
        <div className="mx-auto mt-12 flex max-w-3xl flex-col items-center gap-5 px-4 sm:mt-16 sm:flex-row sm:items-center sm:justify-center sm:gap-5">
          {MOCK_CARDS.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 44, scale: 0.88, rotate: 0 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: c.rot }}
              transition={{ delay: 0.5 + i * 0.12, type: 'spring', stiffness: 150, damping: 16 }}
            >
              <motion.div
                animate={{ y: [0, -9, 0] }}
                transition={{
                  duration: 3.4 + i * 0.7,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.8 + i * 0.5,
                }}
              >
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  transition={SQUISH}
                  className={`w-64 cursor-default rounded-[28px] p-4 sm:w-60 sm:p-5 ${c.bg} ${c.shadow}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex size-11 shrink-0 items-center justify-center rounded-full bg-[#FFFFFF] ${CLAY_BASE}`}
                    >
                      <c.icon className={`size-5 ${c.iconClass}`} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-snug text-[#231F1E]">{c.name}</p>
                      <p className="text-[11px] text-[#8A7D72]">{c.time}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    {i === 1 ? (
                      <>
                        <span className="text-[10px] font-semibold text-[#8A7D72]">
                          Tandai selesai
                        </span>
                        <ClayToggle
                          on={mockToggleOn}
                          onToggle={() => setMockToggleOn((v) => !v)}
                          label="Sakelar contoh: Meditasi 10 menit"
                        />
                      </>
                    ) : (
                      <>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${
                            c.done
                              ? `bg-[#DCE9D4] text-[#5E7F47] ${CLAY_MINT}`
                              : `bg-[#E8E0D5] text-[#6B5B50] ${CLAY_ROSE}`
                          }`}
                        >
                          {c.done ? <Check className="size-3" aria-hidden /> : null}
                          {c.done ? 'Selesai' : 'Belum'}
                        </span>
                        <span className="min-w-0 truncate text-[10px] font-semibold text-[#8A7D72]">
                          {c.note}
                        </span>
                      </>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* ===== Elemen 2: Marquee tak berujung ===== */}
        <div className="relative my-10 -rotate-1 sm:my-14">
          <MarqueeRow
            items={MARQUEE_ROW_1}
            animation="animate-[marquee-left_34s_linear_infinite]"
            colorOffset={0}
          />
          <div className="mt-3 sm:mt-4">
            <MarqueeRow
              items={MARQUEE_ROW_2}
              animation="animate-[marquee-right_46s_linear_infinite]"
              colorOffset={2}
            />
          </div>
        </div>

        {/* ===== Fitur ===== */}
        <section id="clay-fitur" className="mx-auto mt-16 w-full max-w-5xl px-4 sm:mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[#231F1E] sm:text-4xl">
              Semua terasa membulat
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#8A7D72] sm:text-base">
              Setiap sudut, tombol, dan kartu dibuat empuk — nyaman dilihat, lebih nyaman
              disentuh.
            </p>
          </div>
          <div ref={featuresRef} className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-3 sm:gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className={`rounded-[28px] p-5 opacity-0 sm:p-6 ${f.bg} ${f.shadow}`}>
                <span
                  className={`flex size-12 items-center justify-center rounded-full bg-[#FFFFFF] ${CLAY_BASE}`}
                >
                  <f.icon className={`size-5 ${f.iconClass}`} aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-bold text-[#231F1E]">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#8A7D72]">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Daftar kebiasaan interaktif ===== */}
        <section id="clay-cara-kerja" className="mx-auto mt-16 w-full max-w-md px-4 sm:mt-24">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[#231F1E] sm:text-3xl">
              Coba sentuh
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#8A7D72]">
              Geser sakelarnya pelan-pelan — semuanya empuk dan membalas.
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className={`mt-8 rounded-[28px] bg-[#FFFFFF] p-5 sm:p-6 ${CLAY_BASE}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#231F1E]">Kebiasaan hari ini</h3>
                <p className="text-xs text-[#8A7D72]">Selasa, 10 Juni</p>
              </div>
              <span
                className={`rounded-full bg-[#EFE9DA] px-3 py-1 text-xs font-bold tabular-nums text-[#8A7D72] ${CLAY_BUTTER}`}
              >
                {doneCount}/{habits.length} selesai
              </span>
            </div>
            <div className="mt-4 space-y-2.5">
              {habits.map((h) => (
                <div
                  key={h.id}
                  className={`flex items-center justify-between gap-3 rounded-[20px] px-3.5 py-2 transition-colors duration-200 ${
                    h.done ? 'bg-[#DCE9D4]/60' : 'bg-[#E9E5DC]/70'
                  }`}
                >
                  <span
                    className={`truncate text-sm font-semibold ${
                      h.done ? 'text-[#8A7D72] line-through' : 'text-[#231F1E]'
                    }`}
                  >
                    {h.name}
                  </span>
                  <ClayToggle
                    on={h.done}
                    onToggle={() => toggleHabit(h.id)}
                    label={`Tandai "${h.name}" selesai`}
                  />
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-[11px] text-[#A99C90]">
              Selesaikan semuanya — ada kejutan kecil menunggu.
            </p>
          </motion.div>
        </section>

        {/* ===== Batang konsistensi mingguan ===== */}
        <section className="mx-auto mt-16 w-full max-w-lg px-4 sm:mt-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[#231F1E] sm:text-3xl">
              Konsistensi mingguan
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#8A7D72]">
              Tujuh hari terakhir, membulat dan mudah dibaca.
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className={`mt-8 rounded-[28px] bg-[#FFFFFF] p-5 sm:p-7 ${CLAY_BASE}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex size-10 items-center justify-center rounded-full bg-[#E4EFE0] ${CLAY_PEACH}`}
                >
                  <CalendarCheck className="size-4 text-[#4A3B32]" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#231F1E]">Minggu ini</p>
                  <p className="text-[11px] text-[#8A7D72]">9–15 Juni</p>
                </div>
              </div>
              <span
                className={`rounded-full bg-[#DCE9D4] px-3 py-1.5 text-xs font-bold text-[#5E7F47] ${CLAY_MINT}`}
              >
                Rata-rata <Counter to={67} />%
              </span>
            </div>
            <div className="mt-6">
              <div
                ref={barsRef}
                role="img"
                aria-label="Grafik batang konsistensi mingguan dengan rata-rata 67 persen"
                className="flex h-40 items-end gap-2 sm:gap-3"
              >
                {WEEK.map((d, i) => (
                  <div
                    key={d.label}
                    className={`flex-1 rounded-full ${i % 2 === 0 ? BAR_CORAL : BAR_PEACH}`}
                    style={{ height: `${d.h}%`, transform: 'scaleY(0)', transformOrigin: 'bottom' }}
                  />
                ))}
              </div>
              <div className="mt-2.5 flex gap-2 sm:gap-3">
                {WEEK.map((d) => (
                  <span
                    key={d.label}
                    className="flex-1 text-center text-[10px] font-semibold text-[#8A7D72]"
                  >
                    {d.label}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ===== Elemen 3: Mega footer brand ===== */}
      <footer id="clay-cerita" className="relative mt-16 sm:mt-24">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4">
          {FOOTER_LINKS.map((label) => (
            <motion.a
              key={label}
              href="#"
              onClick={(e) => {
                e.preventDefault()
                toast.info('Ini contoh gaya Claymorphism', {
                  description: `Di produksi, tautan "${label}" membuka halamannya.`,
                })
              }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              transition={SQUISH}
              className={`rounded-full px-2 py-1.5 text-sm font-medium text-[#8A7D72] transition-colors hover:text-[#231F1E] ${FOCUS_VISIBLE}`}
            >
              {label}
            </motion.a>
          ))}
        </div>
        <p className="mt-3 px-4 text-center text-xs text-[#A99C90]">
          Kebiasaan baik, dibentuk pelan-pelan.
        </p>
        <div className="mt-3 overflow-hidden px-4 py-8 sm:py-10">
          <div
            ref={wordRef}
            aria-hidden
            className="select-none bg-gradient-to-b from-[#A3C48E] to-[#749B58] bg-clip-text text-center text-[24vw] font-black lowercase leading-[0.82] tracking-tighter text-transparent opacity-0 drop-shadow-[0_14px_18px_rgba(94,127,71,0.25)] sm:text-[20vw]"
          >
            rutina
          </div>
        </div>
        <p className="pb-6 pt-1 text-center text-[11px] text-[#A99C90]">
          © 2025 rutina — dibentuk dengan sabar.
        </p>
      </footer>
    </section>
  )
}
