'use client'

import { useState } from 'react'
import * as m from 'motion/react-m'
import {
  ChevronRight,
  Globe,
  HardDrive,
  Info,
  Leaf,
  Palette,
  RotateCcw,
  Sparkles,
  Target,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'

import { Counter } from '../counter'
import { BlurFade, SplitText } from '../motion-kit'
import { slideInRow, staggerRows } from '@/lib/motion/variants'
import { playfair } from '../serif'
import {
  activeSinceISO,
  bestStreak,
  computeLevel,
  computeXp,
  doneCountOn,
  fromISO,
  habitsOn,
  todayISO,
  useRutina,
  XP_TARGET,
} from '../store'

const FAQ_ITEMS = [
  {
    q: 'Bagaimana cara kerja XP dan level?',
    a: 'Setiap misi yang selesai bernilai 80 XP, bonus harian 120 XP. Kumpulkan cukup XP untuk naik level dan membuka lencana baru.',
  },
  {
    q: 'Apa itu streak dan bagaimana menjaganya?',
    a: 'Streak adalah jumlah hari berturut-turut kamu menyelesaikan kebiasaan. Cukup centang minimal satu misi setiap hari agar api streak tetap menyala.',
  },
  {
    q: 'Apakah data saya tersimpan otomatis?',
    a: 'Ya. Rutina menyimpan catatan dan progres secara lokal di perangkatmu — tanpa perlu akun, tanpa internet.',
  },
]

/* Chip kata kunci statis — tanpa animasi marquee (kejujuran interaksi). */
const FOCUS_WORDS = [
  'Konsisten',
  'Fokus',
  'Hemat',
  'Bergerak',
  'Tenang',
  'Baca Buku',
  'Tidur Cukup',
  'Syukur',
]

export default function ProfileScreen() {
  const notes = useRutina((s) => s.notes)
  const habits = useRutina((s) => s.habits)
  const txs = useRutina((s) => s.txs)
  const completions = useRutina((s) => s.completions)
  const bonusClaimed = useRutina((s) => s.bonusClaimed)
  const dailyGoal = useRutina((s) => s.dailyGoal)
  const setDailyGoal = useRutina((s) => s.setDailyGoal)
  const openBoard = useRutina((s) => s.openBoard)
  const [lang, setLang] = useState('id')

  /* Semua angka dihitung dari histori nyata — bukan demo statis. */
  const today = todayISO()
  const doneCount = doneCountOn(completions, today)
  const scheduledToday = habitsOn(habits, today).length
  const pct =
    scheduledToday === 0 ? 0 : Math.round((doneCount / scheduledToday) * 100)
  const xp = computeXp(doneCount, bonusClaimed)
  const level = computeLevel(xp)
  const xpPct = Math.min(Math.round((xp / XP_TARGET) * 100), 100)

  /* "Aktif sejak" — bulan aktivitas terawal dari completions. */
  const activeSince = activeSinceISO(completions)
  const memberBadge = activeSince
    ? `Aktif sejak ${new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
      }).format(fromISO(activeSince))}`
    : 'Belum ada aktivitas'

  const streak = bestStreak(habits, completions, today).streak

  /* ANIMATION OWNERSHIP RULE — sebelumnya anime.js menulis translateX+opacity
     pada [data-row] yang sebagian adalah motion.section dengan initial/animate
     opacity sendiri (dua pemilik properti yang sama). Kini seluruh koreografi
     baris dipegang Motion lewat variants staggerRows/slideInRow. */

  const stats = [
    { label: 'Catatan', value: notes.length, percent: false },
    { label: 'Streak (hari)', value: streak, percent: false },
    { label: 'Selesai', value: pct, percent: true },
  ]

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] text-[#231F1E]">
      {/* Header editorial */}
      <header>
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-[#B25E3F]">
          <Leaf className="h-3.5 w-3.5 text-[#B25E3F]" />
          Akun & preferensi
        </p>
        <h1
          className={`${playfair.className} mt-1.5 text-balance text-[38px] font-semibold leading-none tracking-tight text-[#231F1E]`}
        >
          <SplitText text="Profil" inView />
          <span className="text-[#B25E3F]">.</span>
        </h1>
      </header>

      {/* Kartu profil + progres level (shadcn Progress & Badge) */}
      <m.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4 flex flex-col items-center rounded-[20px] border border-[#4A3B3214] bg-white p-5 text-center shadow-card"
      >
        <Avatar className="h-16 w-16 border-4 border-white shadow-[0_6px_18px_rgba(74,59,50,0.18)]">
          <AvatarFallback className="bg-cocoa text-lg font-bold text-parchment">
            AN
          </AvatarFallback>
        </Avatar>
        <h2 className="mt-3 text-lg font-bold tracking-tight text-[#231F1E]">
          Ananda
        </h2>
        <p className="mt-0.5 text-xs font-medium text-[#4A3B32]/70">
          Profil lokal · data tersimpan di perangkat
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1.5 rounded-full border-[#749B58]/40 bg-[#E4EFE0] px-3 py-1 text-[11px] font-bold text-[#658A4C]"
          >
            <Sparkles className="h-3 w-3" />
            Level {level}
          </Badge>
          <Badge
            variant="outline"
            className="rounded-full border-[#4A3B32]/20 bg-[#F5F3EE] px-3 py-1 text-[11px] font-bold text-[#4A3B32]"
          >
            {memberBadge}
          </Badge>
        </div>

        {/* Progres XP menuju level berikutnya */}
        <div className="mt-5 w-full">
          <div className="flex items-baseline justify-between px-0.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4A3B32]/70">
              Progres Level
            </span>
            <span className="text-[11px] font-bold tabular-nums text-[#658A4C]">
              <Counter to={xp} /> / {XP_TARGET} XP
            </span>
          </div>
          <Progress
            value={xpPct}
            className="mt-2 h-2.5 rounded-full bg-[#E4EFE0]"
            aria-label="Progres XP menuju level berikutnya"
          />
          <p className="mt-2 text-[11px] font-medium text-[#4A3B32]/70">
            {level >= 8
              ? 'Level maksimal tercapai — petualang sejati!'
              : `${XP_TARGET - xp} XP lagi menuju Level ${level + 1}`}
          </p>
        </div>
      </m.div>

      {/* Baris statistik ringkas */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <m.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.06 + i * 0.06,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex flex-col items-center rounded-[16px] border border-[#4A3B3214] bg-white p-3.5 shadow-soft"
          >
            <p className="flex items-baseline">
              <span className="text-[22px] font-semibold leading-none tracking-tight text-[#231F1E]">
                <Counter to={s.value} />
              </span>
              {s.percent ? (
                <span className="text-sm font-semibold text-[#231F1E]">%</span>
              ) : null}
            </p>
            <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#4A3B32]/70">
              {s.label}
            </p>
          </m.div>
        ))}
      </div>

      {/* Chip kata kunci statis — tanpa marquee; ikon Leaf terracotta. */}
      <BlurFade delay={0.18} className="mt-4">
        <div className="flex flex-wrap gap-2">
          {FOCUS_WORDS.map((w) => (
            <span
              key={w}
              className="flex items-center gap-1.5 rounded-full border border-[#4A3B32]/15 bg-white px-3.5 py-1.5 text-[11px] font-bold text-[#4A3B32]/80"
            >
              <Leaf className="h-3 w-3 text-[#B25E3F]" aria-hidden="true" />
              {w}
            </span>
          ))}
        </div>
      </BlurFade>

      {/* Pemisah halus di atas kanvas Warm Sand (shadcn Separator) */}
      <Separator className="mt-5 bg-[#4A3B32]/15" />

      {/* Pengaturan — koreografi stagger Motion (satu pemilik animasi) */}
      <m.div
        variants={staggerRows}
        initial="hidden"
        animate="show"
        className="mt-5 space-y-3"
      >
        {/* Target harian (shadcn Slider) */}
        <m.section
          variants={slideInRow}
          className="rounded-[20px] border border-[#4A3B3214] bg-white p-5 shadow-soft"
          aria-label="Target misi harian"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E4EFE0] text-[#4A3B32]">
              <Target className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-[#231F1E]">
                Target Misi Harian
              </p>
              <p className="text-[11px] font-medium text-[#4A3B32]/70">
                Berapa misi yang ingin kamu selesaikan tiap hari?
              </p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#749B58] text-[13px] font-bold tabular-nums text-white">
              {dailyGoal}
            </span>
          </div>
          <Slider
            value={[dailyGoal]}
            onValueChange={(v) => setDailyGoal(v[0])}
            min={1}
            max={12}
            step={1}
            aria-label="Target misi harian"
            className="mt-4 [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-range]]:bg-[#749B58] [&_[data-slot=slider-thumb]]:border-[#749B58] [&_[data-slot=slider-thumb]]:bg-white"
          />
          <div className="mt-2 flex justify-between text-[11px] font-bold text-[#4A3B32]/70">
            <span>Santai (1)</span>
            <span>Seimbang (6)</span>
            <span>Produktif (12)</span>
          </div>
        </m.section>

        {/* Pemilih bahasa — DropdownMenu radio (shadcn); English masih
            disematkan "segera" — jujur soal ketersediaan. */}
        <m.div
          variants={slideInRow}
          className="overflow-hidden rounded-[20px] border border-[#4A3B3214] bg-white shadow-soft"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Pilih bahasa aplikasi"
                className="flex min-h-[54px] w-full cursor-pointer items-center gap-3 px-4 text-left transition-colors hover:bg-[#F5F3EE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E4EFE0] text-[#4A3B32]">
                  <Globe className="h-4 w-4" />
                </span>
                <span className="flex-1 text-[14px] font-medium text-[#231F1E]">
                  Bahasa
                </span>
                <span className="text-[13px] font-semibold text-[#4A3B32]/70">
                  {lang === 'id' ? 'Indonesia' : 'English'}
                </span>
                <ChevronRight className="h-4 w-4 text-[#4A3B32]/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              className="mr-2 min-w-[190px] rounded-2xl border-[#4A3B321F]"
            >
              <DropdownMenuRadioGroup
                value={lang}
                onValueChange={(v) => {
                  setLang(v)
                  toast.success(
                    v === 'id'
                      ? 'Bahasa Indonesia sudah aktif'
                      : 'Bahasa Inggris segera tersedia',
                  )
                }}
              >
                <DropdownMenuRadioItem value="id" className="rounded-lg">
                  Indonesia
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="en" disabled className="rounded-lg">
                  English
                  <span className="ml-auto text-[11px] font-semibold uppercase tracking-wide text-[#4A3B32]/70">
                    segera
                  </span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </m.div>

        {/* Data & penyimpanan — status jujur + mulai dari awal */}
        <m.section
          variants={slideInRow}
          className="rounded-[20px] border border-[#4A3B3214] bg-white p-5 shadow-soft"
          aria-label="Data dan penyimpanan"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E4EFE0] text-[#4A3B32]">
              <HardDrive className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-[#231F1E]">
                Data &amp; Penyimpanan
              </p>
              <p className="text-[11px] font-medium text-[#4A3B32]/70">
                {habits.length} kebiasaan · {notes.length} catatan ·{' '}
                {txs.length} transaksi — tersimpan lokal di perangkat ini
              </p>
            </div>
          </div>
          <p className="mt-3 rounded-xl bg-[#F5F3EE] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[#4A3B32]/80">
            Rutina bekerja tanpa akun dan tanpa server — seluruh catatanmu
            hidup di penyimpanan perangkat ini dan tetap ada meski aplikasi
            ditutup. Mulai dari awal akan menghapus semuanya secara permanen.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="mt-3 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#B25E3F]/40 bg-white text-[13px] font-bold text-[#B25E3F] transition-all hover:bg-[#B25E3F]/8 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B25E3F]"
              >
                <RotateCcw className="h-4 w-4" />
                Mulai dari awal
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[320px] rounded-[24px] border-[#4A3B3214]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[16px] font-bold tracking-tight text-[#231F1E]">
                  Hapus semua data?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[12.5px] leading-relaxed text-[#4A3B32]/75">
                  Seluruh kebiasaan, histori, catatan, transaksi, dan tujuan
                  tabungan akan dihapus permanen dari perangkat ini. Tindakan
                  ini tidak bisa dibatalkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row gap-2">
                <AlertDialogCancel className="mt-0 h-10 flex-1 rounded-full border-[#4A3B32]/25 text-[12.5px] font-bold text-[#4A3B32]">
                  Batal
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    useRutina.getState().startFresh()
                    toast.success('Aplikasi direset — mulailah dari nol.')
                  }}
                  className="h-10 flex-1 rounded-full border-none bg-[#B25E3F] text-[12.5px] font-bold text-white hover:bg-[#9E4E33]"
                >
                  Ya, hapus
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </m.section>

        {/* Pertanyaan umum (shadcn Accordion) */}
        <m.section
          variants={slideInRow}
          className="rounded-[20px] border border-[#4A3B3214] bg-white px-4 shadow-soft"
          aria-label="Pertanyaan umum"
        >
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((f, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border-[#4A3B3214]"
              >
                <AccordionTrigger className="py-4 text-left text-[13.5px] font-semibold text-[#231F1E] hover:no-underline [&>svg]:text-[#749B58]">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-[12.5px] leading-relaxed text-[#4A3B32]/75">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </m.section>

        {/* Papan sistem desain — spesifikasi visual Rutina 2.0 */}
        <m.div variants={slideInRow}>
          <button
            type="button"
            onClick={() => openBoard()}
            className="flex min-h-[54px] w-full cursor-pointer items-center gap-3 rounded-[20px] border border-[#749B58]/30 bg-[#E4EFE0] px-4 text-left shadow-soft transition-colors hover:bg-[#d9e8d2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#5E8347]">
              <Palette className="h-4 w-4" />
            </span>
            <span className="flex-1 text-[14px] font-medium text-[#231F1E]">
              Papan Sistem Desain
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wide text-[#658A4C]">
              tokens
            </span>
            <ChevronRight className="h-4 w-4 text-[#4A3B32]/40" />
          </button>
        </m.div>

        {/* Tentang (shadcn Dialog) */}
        <m.div variants={slideInRow}>
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="flex min-h-[54px] w-full cursor-pointer items-center gap-3 rounded-[20px] border border-[#4A3B3214] bg-white px-4 text-left shadow-soft transition-colors hover:bg-[#F5F3EE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E4EFE0] text-[#4A3B32]">
                  <Info className="h-4 w-4" />
                </span>
                <span className="flex-1 text-[14px] font-medium text-[#231F1E]">
                  Tentang Rutina
                </span>
                <ChevronRight className="h-4 w-4 text-[#4A3B32]/40" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[320px] rounded-[24px] border-[#4A3B3214] bg-white p-6 sm:max-w-[320px]">
              <DialogHeader>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E4EFE0]">
                  <Leaf className="h-6 w-6 text-[#749B58]" />
                </div>
                <DialogTitle className="text-center text-lg font-bold tracking-tight text-[#231F1E]">
                  Rutina 2.0
                </DialogTitle>
                <DialogDescription className="text-center text-[12.5px] leading-relaxed text-[#4A3B32]/70">
                  Aplikasi kebiasaan &amp; jurnal dengan palet earth tone.
                  Dibangun dengan Next.js, Tailwind CSS 4, shadcn/ui, Motion,
                  dan anime.js.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-center gap-2">
                <Badge className="rounded-full bg-[#E4EFE0] text-[11px] font-bold text-[#658A4C] hover:bg-[#E4EFE0]">
                  Earth Tone
                </Badge>
                <Badge className="rounded-full bg-[#E4EFE0] text-[11px] font-bold text-[#658A4C] hover:bg-[#E4EFE0]">
                  Gamified
                </Badge>
                <Badge className="rounded-full bg-[#E4EFE0] text-[11px] font-bold text-[#658A4C] hover:bg-[#E4EFE0]">
                  Editorial
                </Badge>
              </div>
              <DialogFooter className="sm:justify-center">
                <DialogClose asChild>
                  <Button
                    type="button"
                    className="h-9 rounded-full bg-[#749B58] px-6 text-[13px] font-bold text-white hover:bg-[#658A4C]"
                    onClick={() => toast('Terima kasih sudah memakai Rutina!')}
                  >
                    Mengerti
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </m.div>

      </m.div>

      <p className="mt-6 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-[#4A3B32]/60">
        Earth Tone Edition — 2025
      </p>
    </div>
  )
}
