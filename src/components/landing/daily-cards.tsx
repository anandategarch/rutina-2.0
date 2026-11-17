'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'
import { animate, stagger } from 'animejs'
import {
  BatteryLow,
  BookOpen,
  BookmarkPlus,
  Briefcase,
  Check,
  Flame,
  Heart,
  Laugh,
  Leaf,
  Lightbulb,
  Meh,
  PenLine,
  Pin,
  Plus,
  Quote,
  Smile,
  TrendingUp,
} from 'lucide-react'
import { Playfair_Display } from 'next/font/google'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Counter, goToStyle } from './bits'

const playfair = Playfair_Display({
  subsets: ['latin'],
  style: ['normal', 'italic'],
})

/* ===== Data demo (deterministik, tanpa Math.random) ===== */

type Task = { id: string; title: string; cat?: string; streak?: number }

const TASKS: Task[] = [
  { id: 't1', title: 'Meditasi 10 menit', streak: 5 },
  { id: 't2', title: 'Review laporan mingguan', cat: 'Kerja' },
  { id: 't3', title: 'Baca 20 halaman buku', streak: 12 },
  { id: 't4', title: 'Jalan pagi 30 menit', cat: 'Kesehatan' },
  { id: 't5', title: 'Belajar kosakata baru', streak: 21 },
  { id: 't6', title: 'Rapikan meja kerja', cat: 'Pribadi' },
]

const INITIAL_DONE = [true, false, true, false, false, false]

type Note = {
  id: string
  title: string
  body: string
  date: string
  pinned: boolean
  tone: number
}

/** Variasi latar kartu jurnal: putih bergaris tipis, pistachio, warm sand gelap. */
const NOTE_TONES = [
  'border border-[#4A3B321F] bg-white',
  'bg-[#E4EFE0]',
  'bg-[#EAE5D9]',
]

const SEED_NOTES: Note[] = [
  {
    id: 'n1',
    title: 'Ritual Pagi yang Tenang',
    body: 'Bangun jam 5.30 tanpa langsung membuka ponsel. Air putih, peregangan singkat, lalu menulis tiga hal yang disyukuri.',
    date: '15 Jun',
    pinned: true,
    tone: 1,
  },
  {
    id: 'n2',
    title: 'Ide Fitur Rutina 2.0',
    body: 'Mode fokus dengan timer pomodoro, laporan mingguan yang bisa diekspor, dan widget streak di layar utama.',
    date: '13 Jun',
    pinned: false,
    tone: 0,
  },
  {
    id: 'n3',
    title: 'Refleksi: Pekan ke-3',
    body: 'Konsistensi mulai terasa. Meditasi jadi lebih mudah dan otak tidak lagi menolak saat bangun pagi.',
    date: '12 Jun',
    pinned: false,
    tone: 2,
  },
  {
    id: 'n4',
    title: 'Bahan Bacaan Bulan Ini',
    body: 'Atomic Habits (ulang bab 3), Deep Work, dan artikel tentang kebiasaan digital minimalis.',
    date: '10 Jun',
    pinned: false,
    tone: 1,
  },
  {
    id: 'n5',
    title: 'Yang Aku Syukuri Hari Ini',
    body: 'Es kopi di warung pojok, obrolan singkat dengan Ibu, dan hujan sore yang tepat waktu.',
    date: '9 Jun',
    pinned: true,
    tone: 0,
  },
  {
    id: 'n6',
    title: 'Rencana Proyek Desain',
    body: 'Kumpulkan referensi moodboard earth tone, sketsa tiga arah layout, lalu uji kontras warna.',
    date: '7 Jun',
    pinned: false,
    tone: 2,
  },
]

const FOLDERS = [
  { name: 'Kerja', count: 12, icon: Briefcase },
  { name: 'Ide & Gagasan', count: 8, icon: Lightbulb },
  { name: 'Bacaan', count: 5, icon: BookOpen },
  { name: 'Pribadi', count: 9, icon: Heart },
]

const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
/** Jam fokus Senin–Minggu; total 14,5 jam. */
const FOCUS = [1.5, 2.2, 1.8, 2.0, 2.4, 2.0, 2.6]

const MOODS = [
  { label: 'Ceria', icon: Laugh },
  { label: 'Baik', icon: Smile },
  { label: 'Biasa', icon: Meh },
  { label: 'Lelah', icon: BatteryLow },
]

const QUOTE_TEXT =
  'Kebiasaan kecil yang konsisten akan mengalahkan motivasi besar yang sesaat.'
const QUOTE_AUTHOR = 'James Clear, Atomic Habits'

/* ===== Potongan kecil ===== */

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#4A3B32]">
        {title}
      </h2>
      {hint ? (
        <span className="text-xs font-medium text-[#4A3B32]/70">{hint}</span>
      ) : null}
    </div>
  )
}

/** Ilustrasi garis minimalis: matahari, bukit, dan tunas. */
function HeroIllustration() {
  return (
    <motion.svg
      viewBox="0 0 140 140"
      aria-hidden="true"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      className="pointer-events-none absolute -bottom-2 -right-2 h-32 w-32 text-[#FAF9F6]/40"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="98" cy="34" r="12" />
      <path d="M98 14v5M98 49v5M78 34h5M113 34h5" />
      <path d="M4 106q34-36 68 0" />
      <path d="M52 120q30-28 60 0" />
      <path d="M26 122v-10" />
      <path d="M26 112c-8-1-12-6-12-13 8 1 12 6 12 13z" />
      <path d="M26 112c8-1 12-6 12-13-8 1-12 6-12 13z" />
    </motion.svg>
  )
}

/* ===== Komponen utama ===== */

export default function DailyCards() {
  const [done, setDone] = useState<boolean[]>(INITIAL_DONE)
  const [mood, setMood] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[]>(SEED_NOTES)
  const [quoteSaved, setQuoteSaved] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draft, setDraft] = useState({ title: '', body: '' })

  const taskListRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInView = useInView(chartRef, { once: true, margin: '-40px' })

  //anime.js — orkestrasi masuk daftar tugas
  useEffect(() => {
    if (!taskListRef.current) return
    const anim = animate(taskListRef.current.querySelectorAll(':scope > div'), {
      translateY: [18, 0],
      opacity: [0, 1],
      delay: stagger(70),
      duration: 720,
      ease: 'outExpo',
    })
    return () => {
      anim.revert()
    }
  }, [])

  // anime.js — batang grafik tumbuh saat terlihat
  useEffect(() => {
    if (!chartInView || !chartRef.current) return
    const anim = animate(chartRef.current.querySelectorAll('[data-bar]'), {
      scaleY: [0, 1],
      delay: stagger(55),
      duration: 850,
      ease: 'outBack(1.3)',
    })
    return () => {
      anim.revert()
    }
  }, [chartInView])

  const doneCount = done.filter(Boolean).length
  const pct = Math.round((doneCount / TASKS.length) * 100)

  const toggleTask = (i: number) => {
    const next = done.map((d, j) => (j === i ? !d : d))
    setDone(next)
    if (next.every(Boolean)) {
      toast.success('Semua tugas selesai — hari yang produktif!')
    }
  }

  const addNote = () => {
    const title = draft.title.trim()
    if (!title) {
      toast.warning('Judul catatan masih kosong')
      return
    }
    setNotes((prev) => [
      {
        id: `note-${Date.now()}`,
        title,
        body: draft.body.trim() || 'Catatan kosong — lanjutkan menulis nanti.',
        date: '15 Jun',
        pinned: false,
        tone: 0,
      },
      ...prev,
    ])
    setDialogOpen(false)
    setDraft({ title: '', body: '' })
    toast.success('Catatan baru ditambahkan ke jurnal')
  }

  const saveQuote = () => {
    if (quoteSaved) return
    setNotes((prev) => [
      {
        id: `quote-${Date.now()}`,
        title: 'Kutipan Hari Ini',
        body: `"${QUOTE_TEXT}" — ${QUOTE_AUTHOR}`,
        date: '15 Jun',
        pinned: true,
        tone: 1,
      },
      ...prev,
    ])
    setQuoteSaved(true)
    toast.success('Kutipan disimpan ke jurnal')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-md px-4 pt-24">
        {/* Header aplikasi */}
        <header className="mb-5 flex items-center justify-between">
          <p className="text-[19px] font-bold tracking-tight text-[#231F1E]">
            rutina<span className="text-[#749B58]">.</span>
          </p>
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4A3B32] text-[11px] font-bold tracking-widest text-[#FAF9F6]"
          >
            AN
          </span>
        </header>

        {/* 1 — Kartu Ringkasan Utama (Daily Focus & Hero Summary) */}
        <motion.section
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          aria-label="Ringkasan harian"
          className="relative overflow-hidden rounded-[24px] bg-[#749B58] p-6 pb-7 text-[#FAF9F6]"
        >
          <HeroIllustration />
          <div className="relative z-10">
            <p className="text-[13px] font-medium text-[#FAF9F6]/75">
              Minggu, 15 Juni
            </p>
            <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight">
              Selamat pagi, Ananda
            </h1>

            <div className="mt-6">
              <p className="text-[12px] font-medium text-[#FAF9F6]/75">
                Tugas selesai
              </p>
              <p className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-[56px] font-semibold leading-none tracking-tight">
                  <Counter to={pct} />
                </span>
                <span className="text-lg font-medium text-[#FAF9F6]/80">%</span>
              </p>
              <p className="mt-1.5 text-xs font-medium text-[#FAF9F6]/70">
                {doneCount} dari {TASKS.length} tugas •{' '}
                {TASKS.length - doneCount} tersisa
              </p>
            </div>

            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#FAF9F6]/25">
              <motion.div
                initial={false}
                className="h-full rounded-full bg-[#FAF9F6]"
                animate={{ width: `${pct}%` }}
                transition={{ type: 'spring', stiffness: 130, damping: 22 }}
              />
            </div>

            <Button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="mt-5 h-11 w-full rounded-full bg-[#FAF9F6] text-[15px] font-semibold text-[#231F1E] shadow-[0_8px_20px_rgba(35,31,30,0.16)] hover:bg-white hover:shadow-[0_10px_26px_rgba(35,31,30,0.22)]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Catatan Baru
            </Button>
          </div>
        </motion.section>

        {/* 2 — Kartu Daftar Tugas & Kebiasaan */}
        <section className="mt-8" aria-label="Daftar tugas harian">
          <SectionTitle
            title="Fokus Hari Ini"
            hint={`${doneCount}/${TASKS.length} selesai`}
          />
          <div ref={taskListRef} className="space-y-2.5">
            {TASKS.map((t, i) => (
              <div
                key={t.id}
                className={`flex items-center gap-3 rounded-[16px] border p-3.5 transition-colors duration-300 ${
                  done[i]
                    ? 'border-[#749B5833] bg-[#E4EFE0]'
                    : 'border-[#4A3B321F] bg-white'
                }`}
              >
                <motion.button
                  type="button"
                  role="checkbox"
                  aria-checked={done[i]}
                  aria-label={`Tandai selesai: ${t.title}`}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => toggleTask(i)}
                  className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] ${
                    done[i]
                      ? 'border-[#749B58] bg-[#749B58] text-white'
                      : 'border-[#4A3B3240] bg-transparent text-transparent hover:border-[#749B58]/60'
                  }`}
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                </motion.button>

                <span
                  className={`min-w-0 flex-1 truncate text-left text-[15px] font-medium transition-colors duration-300 ${
                    done[i]
                      ? 'text-[#231F1E]/45 line-through decoration-[#231F1E]/30'
                      : 'text-[#231F1E]'
                  }`}
                >
                  {t.title}
                </span>

                {t.streak ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#EAE5D9] px-2.5 py-1 text-[11px] font-bold text-[#4A3B32]">
                    <Flame className="h-3.5 w-3.5" />
                    {t.streak} hari
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-[#E4EFE0] px-2.5 py-1 text-[11px] font-bold text-[#4A3B32]">
                    {t.cat}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 6 — Kartu Kutipan & Pengingat (pembatas visual) */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          aria-label="Refleksi hari ini"
          className="mt-8 rounded-[20px] bg-[#4A3B32] p-6 text-[#F5F3EE]"
        >
          <div className="flex items-start justify-between gap-3">
            <Quote className="h-6 w-6 shrink-0 text-[#F5F3EE]/45" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F5F3EE]/60">
              Refleksi Hari Ini
            </span>
          </div>
          <p className={`${playfair.className} mt-4 text-[17px] italic leading-relaxed text-[#F5F3EE]`}>
            &ldquo;{QUOTE_TEXT}&rdquo;
          </p>
          <p className="mt-3 text-xs font-medium text-[#F5F3EE]/70">
            — {QUOTE_AUTHOR}
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={saveQuote}
            disabled={quoteSaved}
            className="mt-5 h-9 rounded-full border border-[#F5F3EE]/35 px-4 text-[13px] font-semibold text-[#F5F3EE] hover:bg-[#F5F3EE]/10 hover:text-[#F5F3EE] disabled:opacity-60"
          >
            {quoteSaved ? (
              <Check className="h-4 w-4" strokeWidth={2.5} />
            ) : (
              <BookmarkPlus className="h-4 w-4" />
            )}
            {quoteSaved ? 'Tersimpan di Jurnal' : 'Simpan ke Jurnal'}
          </Button>
        </motion.section>

        {/* 4 — Widget Statistik & Suasana Hati */}
        <section className="mt-8" aria-label="Statistik dan suasana hati">
          <SectionTitle title="Ringkasan Pekan" />
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[16px] border border-[#4A3B321F] bg-white p-4"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4A3B32]/65">
                Suasana Hati
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    aria-pressed={mood === m.label}
                    aria-label={`Catat suasana hati: ${m.label}`}
                    onClick={() => setMood(mood === m.label ? null : m.label)}
                    className={`flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] ${
                      mood === m.label
                        ? 'border-[#749B58] bg-[#749B58] text-white'
                        : 'border-[#4A3B321F] bg-[#F5F3EE] text-[#4A3B32] hover:bg-[#E4EFE0]'
                    }`}
                  >
                    <m.icon className="h-4 w-4" />
                    <span className="text-[11px] font-bold">{m.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] font-medium text-[#4A3B32]/70">
                {mood
                  ? `Kamu merasa ${mood.toLowerCase()} hari ini`
                  : 'Bagaimana perasaanmu?'}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={{
                duration: 0.5,
                delay: 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex flex-col rounded-[16px] border border-[#4A3B321F] bg-white p-4"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4A3B32]/65">
                Streak Terpanjang
              </p>
              <div className="mt-2 flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-baseline gap-1">
                    <span className="text-[44px] font-semibold leading-none tracking-tight text-[#749B58]">
                      <Counter to={21} />
                    </span>
                    <span className="text-sm font-medium text-[#4A3B32]/60">
                      hari
                    </span>
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-[#4A3B32]/70">
                    Belajar kosakata baru
                  </p>
                </div>
                <Flame
                  className="h-9 w-9 shrink-0 text-[#4A3B32]/15"
                  strokeWidth={1.5}
                />
              </div>
              <p className="mt-auto pt-3 text-[11px] font-medium text-[#4A3B32]/70">
                Rekor pribadi: 34 hari
              </p>
            </motion.div>

            <motion.div
              ref={chartRef}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={{
                duration: 0.5,
                delay: 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="col-span-2 rounded-[16px] border border-[#4A3B321F] bg-white p-5"
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4A3B32]/65">
                    Fokus Minggu Ini
                  </p>
                  <p className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-[40px] font-semibold leading-none tracking-tight text-[#231F1E]">
                      <Counter to={14.5} decimals={1} />
                    </span>
                    <span className="text-sm font-medium text-[#4A3B32]/60">
                      jam total
                    </span>
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#E4EFE0] px-2.5 py-1 text-[11px] font-bold text-[#4A3B32]">
                  <TrendingUp className="h-3.5 w-3.5" />
                  +2,1 jam
                </span>
              </div>
              <div
                className="mt-5 flex items-end justify-between gap-2"
                role="img"
                aria-label="Grafik batang waktu fokus tujuh hari terakhir, hari ini paling tinggi"
              >
                {FOCUS.map((f, i) => {
                  const isToday = i === FOCUS.length - 1
                  return (
                    <div
                      key={i}
                      className="flex flex-1 flex-col items-center gap-1.5"
                    >
                      <div
                        data-bar
                        className={`w-full origin-bottom rounded-full ${
                          isToday ? 'bg-[#749B58]' : 'bg-[#E4EFE0]'
                        }`}
                        style={{ height: `${Math.round((f / 2.6) * 84)}px` }}
                      />
                      <span
                        className={`text-[10px] font-bold ${
                          isToday ? 'text-[#749B58]' : 'text-[#4A3B32]/55'
                        }`}
                      >
                        {DAYS[i]}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 text-[11px] font-medium text-[#4A3B32]/70">
                Hari ini kamu fokus 2,6 jam — tertinggi minggu ini.
              </p>
            </motion.div>
          </div>
        </section>

        {/* 5 — Kartu Kategori / Folder */}
        <section className="mt-8" aria-label="Koleksi folder catatan">
          <SectionTitle title="Koleksi" hint="4 folder" />
          <div className="grid grid-cols-2 gap-3">
            {FOLDERS.map((folder, i) => (
              <motion.div
                key={folder.name}
                role="button"
                tabIndex={0}
                aria-label={`Buka folder ${folder.name}, ${folder.count} catatan`}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{
                  duration: 0.45,
                  delay: i * 0.05,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() =>
                  toast(
                    `Folder “${folder.name}” dibuka — ${folder.count} catatan`,
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toast(
                      `Folder “${folder.name}” dibuka — ${folder.count} catatan`,
                    )
                  }
                }}
                className="flex aspect-square cursor-pointer flex-col justify-between rounded-[20px] bg-[#E4EFE0] p-4 transition-shadow duration-300 hover:shadow-[0_10px_24px_rgba(74,59,50,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#4A3B32]">
                    <folder.icon
                      className="h-[18px] w-[18px]"
                      strokeWidth={1.8}
                    />
                  </span>
                  <button
                    type="button"
                    aria-label={`Buat catatan baru di folder ${folder.name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      toast(`Catatan baru di folder “${folder.name}”`)
                    }}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/70 text-[#4A3B32] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                </div>
                <span>
                  <span className="block text-[15px] font-semibold leading-tight text-[#231F1E]">
                    {folder.name}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-[#4A3B32]/70">
                    {folder.count} Catatan
                  </span>
                </span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 3 — Kartu Catatan Tempel / Jurnal (masonry) */}
        <section className="mt-8" aria-label="Jurnal catatan">
          <SectionTitle title="Jurnal" hint={`${notes.length} catatan`} />
          <div className="columns-2 gap-3">
            {notes.map((n, i) => (
              <motion.article
                key={n.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-16px' }}
                transition={{
                  duration: 0.5,
                  delay: (i % 2) * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`mb-3 break-inside-avoid rounded-[14px] p-4 ${NOTE_TONES[n.tone]}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`${playfair.className} text-[15px] font-semibold leading-snug text-[#231F1E]`}>
                    {n.title}
                  </h3>
                  {n.pinned ? (
                    <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4A3B32]/55" />
                  ) : null}
                </div>
                <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-[#231F1E]/65">
                  {n.body}
                </p>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#4A3B32]/75">
                  {n.date}
                </p>
              </motion.article>
            ))}
          </div>
        </section>
      </main>

      {/* Footer aplikasi */}
      <footer className="mt-auto">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-1.5 px-4 pb-10 pt-10 text-center">
          <p className="flex items-center gap-1.5 text-[15px] font-bold tracking-tight text-[#4A3B32]">
            <Leaf className="h-4 w-4 text-[#749B58]" />
            rutina
          </p>
          <p className="text-xs font-medium text-[#4A3B32]/70">
            Kebiasaan kecil, perubahan besar.
          </p>
          <button
            type="button"
            onClick={() => goToStyle(1)}
            className="mt-2 cursor-pointer rounded-full border border-[#4A3B32]/15 px-3.5 py-1.5 text-[11px] font-bold text-[#4A3B32] transition-colors hover:border-[#749B58]/40 hover:text-[#231F1E]"
          >
            Jelajahi 3 gaya lainnya
          </button>
          <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.18em] text-[#4A3B32]/50">
            Earth Tone Edition — 2025
          </p>
        </div>
      </footer>

      {/* Dialog catatan baru */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm rounded-[24px] border-[#4A3B321F] p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-semibold tracking-tight text-[#231F1E]">
              Catatan Baru
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[#4A3B32]/70">
              Simpan pikiran atau ide hari ini ke jurnal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="note-title"
                className="text-[13px] font-semibold text-[#4A3B32]"
              >
                Judul
              </Label>
              <Input
                id="note-title"
                value={draft.title}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
                placeholder="mis. Ide pagi ini"
                className="h-11 rounded-xl border-[#4A3B3233] bg-[#F5F3EE] text-[#231F1E] placeholder:text-[#4A3B32]/40 focus-visible:border-[#749B58] focus-visible:ring-[#749B58]/25"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="note-body"
                className="text-[13px] font-semibold text-[#4A3B32]"
              >
                Isi catatan
              </Label>
              <Textarea
                id="note-body"
                value={draft.body}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                placeholder="Tulis apa pun yang ada di kepalamu..."
                className="min-h-[96px] resize-none rounded-xl border-[#4A3B3233] bg-[#F5F3EE] text-[#231F1E] placeholder:text-[#4A3B32]/40 focus-visible:border-[#749B58] focus-visible:ring-[#749B58]/25"
              />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="flex-1 rounded-full font-semibold text-[#4A3B32] hover:bg-[#EAE5D9] hover:text-[#231F1E]"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={addNote}
              className="flex-1 rounded-full bg-[#749B58] font-semibold text-white hover:bg-[#658A4C]"
            >
              <PenLine className="h-4 w-4" />
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
