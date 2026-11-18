'use client'

import { useEffect, useRef, useState } from 'react'
import * as m from 'motion/react-m'
import {
  ArrowLeft,
  ChevronRight,
  Cloud,
  Globe,
  HardDrive,
  Info,
  Leaf,
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
import { RutinaSectionHeader } from '../rutina-section-header'
import { slideInRow, staggerRows } from '@/lib/motion/variants'
import { playfair } from '../serif'
import { motionTokens } from '@/lib/motion/tokens'
import { syncStatus } from '../sync-engine'
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
    a: 'Ya. Setiap perubahan tersinkron otomatis ke cloud pribadimu (Turso) dan tetap tersimpan di perangkat sebagai cadangan offline — tanpa perlu akun, lanjut bekerja bahkan tanpa internet.',
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
  const setScreen = useRutina((s) => s.setScreen)
  const [lang, setLang] = useState('id')

  /* Status sinkronisasi cloud — dibaca dari meta engine (bukan state
     React) lalu disegarkan berkala agar stempel waktu tetap hangat. */
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  useEffect(() => {
    const refresh = () => setLastSyncedAt(syncStatus().lastSyncedAt)
    refresh()
    const timer = setInterval(refresh, 15_000)
    return () => clearInterval(timer)
  }, [])

  /* Easter egg developer: teks versi di footer diketuk 5× (rentang antar
     ketukan ≤ 2 detik) → buka papan sistem desain. Terlihat sebagai teks
     versi biasa; penghitung hidup di useRef agar tidak memicu render. */
  const versionTapsRef = useRef(0)
  const versionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleVersionTap = () => {
    versionTapsRef.current += 1
    if (versionTimerRef.current) clearTimeout(versionTimerRef.current)
    if (versionTapsRef.current >= 5) {
      versionTapsRef.current = 0
      versionTimerRef.current = null
      openBoard()
      toast('Papan sistem desain diaktifkan')
      return
    }
    versionTimerRef.current = setTimeout(() => {
      versionTapsRef.current = 0
    }, 2000)
  }
  // Bersihkan timer saat unmount.
  useEffect(
    () => () => {
      if (versionTimerRef.current) clearTimeout(versionTimerRef.current)
    },
    [],
  )

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
    <div className="h-full overflow-y-auto no-scrollbar px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))] text-content-primary">
      {/* Tombol kembali — Profil bukan tab, orientasi via Beranda */}
      <m.button
        type="button"
        onClick={() => setScreen('beranda')}
        aria-label="Kembali ke Beranda"
        whileTap={{ scale: 0.92 }}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: motionTokens.easing.standard }}
        className="-ml-1 flex h-10 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface-primary pl-3 pr-4 text-[13px] font-semibold text-content-secondary shadow-soft transition-colors hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <ArrowLeft className="h-4.5 w-4.5" />
        Kembali
      </m.button>

      {/* Header editorial */}
      <header className="mt-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-content-danger">
          <Leaf className="h-3.5 w-3.5 text-content-danger" />
          Akun & preferensi
        </p>
        <h1
          className={`${playfair.className} mt-1.5 text-balance text-[38px] font-semibold leading-none tracking-tight text-content-primary`}
        >
          <SplitText text="Profil" inView />
          <span className="text-content-danger">.</span>
        </h1>
      </header>

      {/* Judul seksi: identitas pengguna */}
      <BlurFade delay={0.04} className="mt-5">
        <RutinaSectionHeader title="Profil" />
      </BlurFade>

      {/* Kartu profil + progres level (shadcn Progress & Badge) */}
      <m.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: motionTokens.easing.standard }}
        className="mt-3 flex flex-col items-center rounded-[20px] border border-border bg-surface-primary p-5 text-center shadow-card"
      >
        <Avatar className="h-16 w-16 border-4 border-surface-primary shadow-card">
          <AvatarFallback className="bg-cocoa text-lg font-bold text-parchment">
            AN
          </AvatarFallback>
        </Avatar>
        <h2 className="mt-3 text-lg font-bold tracking-tight text-content-primary">
          Ananda
        </h2>
        <p className="mt-0.5 text-xs font-medium text-content-muted">
          Profil pribadi · tersinkron cloud
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1.5 rounded-full border-primary/40 bg-secondary px-3 py-1 text-[11px] font-bold text-success"
          >
            <Sparkles className="h-3 w-3" />
            Level {level}
          </Badge>
          <Badge
            variant="outline"
            className="rounded-full border-border bg-surface-sunken px-3 py-1 text-[11px] font-bold text-content-secondary"
          >
            {memberBadge}
          </Badge>
        </div>

        {/* Progres XP menuju level berikutnya */}
        <div className="mt-5 w-full">
          <div className="flex items-baseline justify-between px-0.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-content-muted">
              Progres Level
            </span>
            <span className="text-[11px] font-bold tabular-nums text-success">
              <Counter to={xp} /> / {XP_TARGET} XP
            </span>
          </div>
          <Progress
            value={xpPct}
            className="mt-2 h-2.5 rounded-full bg-secondary"
            aria-label="Progres XP menuju level berikutnya"
          />
          <p className="mt-2 text-[11px] font-medium text-content-muted">
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
              ease: motionTokens.easing.standard,
            }}
            className="flex flex-col items-center rounded-[16px] border border-border bg-surface-primary p-3.5 shadow-soft"
          >
            <p className="flex items-baseline">
              <span className="text-[22px] font-semibold leading-none tracking-tight text-content-primary">
                <Counter to={s.value} />
              </span>
              {s.percent ? (
                <span className="text-sm font-semibold text-content-primary">%</span>
              ) : null}
            </p>
            <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-content-muted">
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
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface-primary px-3.5 py-1.5 text-[11px] font-bold text-content-secondary"
            >
              <Leaf className="h-3 w-3 text-content-danger" aria-hidden="true" />
              {w}
            </span>
          ))}
        </div>
      </BlurFade>

      {/* Pemisah halus di atas kanvas Warm Sand (shadcn Separator) */}
      <Separator className="mt-5 bg-border" />

      {/* Pengaturan — koreografi stagger Motion (satu pemilik animasi) */}
      <m.div
        variants={staggerRows}
        initial="hidden"
        animate="show"
        className="mt-5 space-y-3"
      >
        {/* Judul seksi: preferensi aplikasi */}
        <m.div variants={slideInRow} className="pt-2.5">
          <RutinaSectionHeader title="Preferensi" />
        </m.div>

        {/* Target harian (shadcn Slider) */}
        <m.section
          variants={slideInRow}
          className="rounded-[20px] border border-border bg-surface-primary p-5 shadow-soft"
          aria-label="Target misi harian"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary">
              <Target className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-content-primary">
                Target Misi Harian
              </p>
              <p className="text-[11px] font-medium text-content-muted">
                Berapa misi yang ingin kamu selesaikan tiap hari?
              </p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold tabular-nums text-primary-foreground">
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
            className="mt-4 [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-range]]:bg-primary [&_[data-slot=slider-thumb]]:border-primary [&_[data-slot=slider-thumb]]:bg-surface-primary"
          />
          <div className="mt-2 flex justify-between text-[11px] font-bold text-content-muted">
            <span>Santai (1)</span>
            <span>Seimbang (6)</span>
            <span>Produktif (12)</span>
          </div>
        </m.section>

        {/* Pemilih bahasa — DropdownMenu radio (shadcn); English masih
            disematkan "segera" — jujur soal ketersediaan. */}
        <m.div
          variants={slideInRow}
          className="overflow-hidden rounded-[20px] border border-border bg-surface-primary shadow-soft"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Pilih bahasa aplikasi"
                className="flex min-h-[54px] w-full cursor-pointer items-center gap-3 px-4 text-left transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary">
                  <Globe className="h-4 w-4" />
                </span>
                <span className="flex-1 text-[14px] font-medium text-content-primary">
                  Bahasa
                </span>
                <span className="text-[13px] font-semibold text-content-muted">
                  {lang === 'id' ? 'Indonesia' : 'English'}
                </span>
                <ChevronRight className="h-4 w-4 text-content-muted" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              className="mr-2 min-w-[190px] rounded-2xl border-border"
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
                  <span className="ml-auto text-[11px] font-semibold uppercase tracking-wide text-content-muted">
                    segera
                  </span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </m.div>

        {/* Judul seksi: data & penyimpanan */}
        <m.div variants={slideInRow} className="pt-2.5">
          <RutinaSectionHeader title="Data & Penyimpanan" />
        </m.div>

        {/* Data & penyimpanan — status jujur + mulai dari awal */}
        <m.section
          variants={slideInRow}
          className="rounded-[20px] border border-border bg-surface-primary p-5 shadow-soft"
          aria-label="Data dan penyimpanan"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary">
              <HardDrive className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-content-primary">
                Data &amp; Penyimpanan
              </p>
              <p className="text-[11px] font-medium text-content-muted">
                {habits.length} kebiasaan · {notes.length} catatan ·{' '}
                {txs.length} transaksi — tersinkron otomatis ke cloud
              </p>
            </div>
            <span
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-secondary px-2.5 py-1 text-[10.5px] font-bold text-success"
              title={
                lastSyncedAt
                  ? `Terakhir tersinkron ${new Date(lastSyncedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Menunggu sinkronisasi pertama'
              }
            >
              <Cloud className="h-3 w-3" />
              {lastSyncedAt
                ? new Date(lastSyncedAt).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Sinkron'}
            </span>
          </div>
          <p className="mt-3 rounded-xl bg-surface-sunken px-3.5 py-2.5 text-[11.5px] leading-relaxed text-content-secondary">
            Rutina bekerja tanpa akun: setiap perubahan tersinkron otomatis
            ke cloud pribadimu (Turso) dan tetap tersimpan di perangkat
            sebagai cadangan offline — aplikasi tetap hidup tanpa internet.
            Mulai dari awal akan menghapus semuanya secara permanen, di
            perangkat maupun cloud.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="mt-3 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-surface-primary text-[13px] font-bold text-content-danger transition-all hover:bg-destructive/10 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
              >
                <RotateCcw className="h-4 w-4" />
                Mulai dari awal
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[320px] rounded-[24px] border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[16px] font-bold tracking-tight text-content-primary">
                  Hapus semua data?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[12.5px] leading-relaxed text-content-muted">
                  Seluruh kebiasaan, histori, catatan, transaksi, dan tujuan
                  tabungan akan dihapus permanen — dari perangkat ini dan
                  penyimpanan cloud. Tindakan ini tidak bisa dibatalkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row gap-2">
                <AlertDialogCancel className="mt-0 h-10 flex-1 rounded-full border-border-strong text-[12.5px] font-bold text-content-secondary">
                  Batal
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    useRutina.getState().startFresh()
                    toast.success('Aplikasi direset — mulailah dari nol.')
                  }}
                  className="h-10 flex-1 rounded-full border-none bg-destructive text-[12.5px] font-bold text-white hover:bg-destructive/90"
                >
                  Ya, hapus
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </m.section>

        {/* Judul seksi: bantuan & FAQ */}
        <m.div variants={slideInRow} className="pt-2.5">
          <RutinaSectionHeader title="Bantuan & FAQ" />
        </m.div>

        {/* Pertanyaan umum (shadcn Accordion) */}
        <m.section
          variants={slideInRow}
          className="rounded-[20px] border border-border bg-surface-primary px-4 shadow-soft"
          aria-label="Pertanyaan umum"
        >
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((f, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border-border"
              >
                <AccordionTrigger className="py-4 text-left text-[13.5px] font-semibold text-content-primary hover:no-underline [&>svg]:text-primary">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-[12.5px] leading-relaxed text-content-muted">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </m.section>

        {/* Tentang (shadcn Dialog) */}
        <m.div variants={slideInRow}>
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="flex min-h-[54px] w-full cursor-pointer items-center gap-3 rounded-[20px] border border-border bg-surface-primary px-4 text-left shadow-soft transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary">
                  <Info className="h-4 w-4" />
                </span>
                <span className="flex-1 text-[14px] font-medium text-content-primary">
                  Tentang Rutina
                </span>
                <ChevronRight className="h-4 w-4 text-content-muted" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[320px] rounded-[24px] border-border bg-surface-primary p-6 sm:max-w-[320px]">
              <DialogHeader>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                  <Leaf className="h-6 w-6 text-primary" />
                </div>
                <DialogTitle className="text-center text-lg font-bold tracking-tight text-content-primary">
                  Rutina 2.0
                </DialogTitle>
                <DialogDescription className="text-center text-[12.5px] leading-relaxed text-content-muted">
                  Aplikasi kebiasaan &amp; jurnal dengan palet earth tone.
                  Dibangun dengan Next.js, Tailwind CSS 4, shadcn/ui, Motion,
                  dan anime.js.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-center gap-2">
                <Badge className="rounded-full bg-secondary text-[11px] font-bold text-success hover:bg-secondary">
                  Earth Tone
                </Badge>
                <Badge className="rounded-full bg-secondary text-[11px] font-bold text-success hover:bg-secondary">
                  Gamified
                </Badge>
                <Badge className="rounded-full bg-secondary text-[11px] font-bold text-success hover:bg-secondary">
                  Editorial
                </Badge>
              </div>
              <DialogFooter className="sm:justify-center">
                <DialogClose asChild>
                  <Button
                    type="button"
                    className="h-9 rounded-full bg-primary px-6 text-[13px] font-bold text-primary-foreground hover:bg-action-hover"
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

      {/* Penutup — teks versi, sekaligus pemicu easter egg developer
          (ketuk 5× dalam 2 detik untuk membuka papan sistem desain). */}
      <button
        type="button"
        onClick={handleVersionTap}
        aria-label="Rutina 2.0 Kebun Kebiasaan"
        className="mt-6 block w-full cursor-pointer text-center text-[11px] font-medium uppercase tracking-[0.18em] text-content-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Rutina 2.0 · Kebun Kebiasaan
      </button>
    </div>
  )
}
