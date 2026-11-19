'use client'

import { useEffect, useRef, useState } from 'react'
import * as m from 'motion/react-m'
import {
  Archive,
  ArrowLeft,
  BatteryLow,
  Check,
  ChevronRight,
  Cloud,
  CloudDownload,
  Download,
  FileJson,
  FileSpreadsheet,
  Fingerprint,
  Globe,
  HardDrive,
  HeartPulse,
  Info,
  Laugh,
  Leaf,
  Loader2,
  Meh,
  Minus,
  MonitorSmartphone,
  Pencil,
  Plus,
  RotateCcw,
  Smile,
  Sparkles,
  Target,
  TriangleAlert,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'

import { Counter } from '../counter'
import { MOOD_TONE } from '../journal-ui'
import { BlurFade, SplitText } from '../motion-kit'
import { useCheckInSheet } from '../checkin-sheet'
import { RutinaButton } from '../rutina-button'
import { RutinaDialog } from '../rutina-dialog'
import { RutinaEmptyState } from '../rutina-empty-state'
import { RutinaSectionHeader } from '../rutina-section-header'
import { slideInRow, staggerRows } from '@/lib/motion/variants'
import { playfair } from '../serif'
import { motionTokens } from '@/lib/motion/tokens'
import { exportBackup, forcePull, importBackup, syncStatus } from '../sync-engine'
import { catMetaOf } from '../finance/cats'
import {
  activeSinceISO,
  addDaysISO,
  bestStreak,
  computeLevel,
  computeXp,
  doneCountOn,
  fromISO,
  habitsOn,
  MOODS,
  shortDateLabel,
  todayISO,
  useRutina,
  WEEKDAY_MIN,
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

/* Ikon suasana hati — padanan MOODS di store (selaras lembar check-in
   & panel Statistik; MOOD_ICONS di checkin-sheet tidak diekspor). */
const MOOD_ICONS: Record<string, typeof Laugh> = {
  Ceria: Laugh,
  Baik: Smile,
  Biasa: Meh,
  Lelah: BatteryLow,
}

/* Tone ikon/label per mood — kelas teks + titik warna kini SATU sumber
   (MOOD_TONE di journal-ui.ts) bersama layar Jurnal; semua merujuk token
   --color-* earth-tone sehingga aman di mode gelap. */

export default function ProfileScreen() {
  const notes = useRutina((s) => s.notes)
  const habits = useRutina((s) => s.habits)
  const txs = useRutina((s) => s.txs)
  const wallets = useRutina((s) => s.wallets)
  const customCats = useRutina((s) => s.customCats)
  const catRenames = useRutina((s) => s.catRenames)
  const completions = useRutina((s) => s.completions)
  const bonusClaimed = useRutina((s) => s.bonusClaimed)
  const dailyGoal = useRutina((s) => s.dailyGoal)
  const setDailyGoal = useRutina((s) => s.setDailyGoal)
  const openBoard = useRutina((s) => s.openBoard)
  const setScreen = useRutina((s) => s.setScreen)
  const identityText = useRutina((s) => s.identityText)
  const setIdentityText = useRutina((s) => s.setIdentityText)
  const moodLogs = useRutina((s) => s.moodLogs)

  /* Draf penyuntingan Suara Identitas (audit #23) — draf terpisah agar
     teks tersimpan tetap utuh selama menyunting; dibatasi 600 karakter
     (store juga memangkas otomatis). */
  const [editingIdentity, setEditingIdentity] = useState(false)
  const [identityDraft, setIdentityDraft] = useState('')

  /* Dialog "Tentang Rutina" — memakai RutinaDialog agar tetap berada di
     dalam bingkai ponsel (shadcn Dialog di-portal ke body & lolos dari
     bingkai di desktop). */
  const [aboutOpen, setAboutOpen] = useState(false)

  const startEditIdentity = () => {
    setIdentityDraft(identityText)
    setEditingIdentity(true)
  }

  const saveIdentity = () => {
    setIdentityText(identityDraft.trim())
    setEditingIdentity(false)
    toast.success('Suara identitas tersimpan.')
  }

  /* Status sinkronisasi cloud — dibaca dari meta engine (bukan state
     React) lalu disegarkan berkala agar stempel waktu tetap hangat. */
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  useEffect(() => {
    const refresh = () => setLastSyncedAt(syncStatus().lastSyncedAt)
    refresh()
    const timer = setInterval(refresh, 15_000)
    return () => clearInterval(timer)
  }, [])

  /* Tarik paksa snapshot cloud (server-menang, lewati negosiasi stempel
     waktu) — alat pemulihan eksplisit, mis. setelah impor data Rutina 1.0
     di sisi server atau saat perangkat ini tertinggal. */
  const [pulling, setPulling] = useState(false)
  const handleForcePull = async () => {
    if (pulling) return
    setPulling(true)
    const ok = await forcePull()
    setPulling(false)
    if (ok) {
      setLastSyncedAt(syncStatus().lastSyncedAt)
      toast.success('Data cloud dimuat', {
        description: 'Snapshot terbaru dari Turso kini aktif di perangkat ini.',
      })
    } else {
      toast.error('Gagal menarik data cloud', {
        description: 'Periksa koneksi internet lalu coba lagi.',
      })
    }
  }

  /* ===== Ekspor & impor cadangan (v2.22) ===== */

  const stamp = todayISO().replace(/-/g, '')

  /* Unduh berkas dari string — jalur bersama JSON & CSV. */
  const downloadText = (filename: string, text: string, mime: string) => {
    const blob = new Blob([text], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  /* Cadangan JSON penuh — bentuk identik dengan snapshot /api/state. */
  const downloadJsonBackup = () => {
    const backup = exportBackup()
    downloadText(
      `rutina-cadangan-${stamp}.json`,
      JSON.stringify(backup, null, 2),
      'application/json',
    )
    toast.success('Cadangan JSON diunduh', {
      description: `${backup.habits.length} kebiasaan · ${backup.txs.length} transaksi · ${backup.notes.length} catatan.`,
    })
  }

  /* CSV transaksi — kolom tanggal/arus/kategori/nominal/dompet/catatan. */
  const downloadCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const rows = [
      ['Tanggal', 'Arus', 'Kategori', 'Nominal', 'Dompet', 'Catatan'].join(','),
      ...[...txs]
        .sort((a, b) => (a.ts === b.ts ? a.id.localeCompare(b.id) : a.ts < b.ts ? -1 : 1))
        .map((t) => {
          const w = wallets.find((x) => x.id === t.walletId)
          return [
            t.ts,
            t.type,
            esc(catMetaOf(t.cat, customCats, catRenames).label),
            String(t.amount),
            esc(w?.name ?? ''),
            esc(t.note),
          ].join(',')
        }),
    ]
    downloadText(
      `rutina-transaksi-${stamp}.csv`,
      '\uFEFF' + rows.join('\n'),
      'text/csv;charset=utf-8',
    )
    toast.success(`CSV ${txs.length} transaksi diunduh`)
  }

  /* Pulihkan cadangan JSON — validasi bentuk lalu terapkan + push. */
  const [importing, setImporting] = useState(false)
  const handleImportFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || importing) return
    setImporting(true)
    try {
      const text = await file.text()
      const error = await importBackup(text)
      if (error) {
        toast.error('Impor gagal', { description: error })
      } else {
        toast.success('Cadangan dipulihkan', {
          description: 'Data kini aktif di perangkat dan tersinkron ke cloud.',
        })
      }
    } catch {
      toast.error('Impor gagal', {
        description: 'Berkas tidak bisa dibaca.',
      })
    } finally {
      setImporting(false)
    }
  }

  /* PWA — tangkap tawaran instal dari browser (Chrome/Edge/Android).
     iOS Safari tidak mengirim beforeinstallprompt → tombol tetap tampil
     dan memberi panduan "Tambahkan ke Layar Utama" saat diketuk. */
  const [installPrompt, setInstallPrompt] = useState<
    (Event & {
      prompt: () => Promise<void>
      userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>
    }) | null
  >(null)
  const [appInstalled, setAppInstalled] = useState(false)
  useEffect(() => {
    /* Baca status "sudah terpasang" lewat fungsi bernama (bukan setState
       langsung di tubuh efek — selaras pola refresh() di atas). */
    const readInstalled = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean })
          .standalone === true
      setAppInstalled(standalone)
    }
    readInstalled()
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(
        e as Event & {
          prompt: () => Promise<void>
          userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>
        },
      )
    }
    const onInstalled = () => {
      setAppInstalled(true)
      setInstallPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])
  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice?.outcome === 'accepted') {
        toast.success('Rutina terpasang', {
          description: 'Buka dari layar utama — bekerja penuh bahkan offline.',
        })
      }
      setInstallPrompt(null)
      return
    }
    toast.info('Cara memasang Rutina', {
      description:
        'Android/Chrome: menu ⋮ → "Pasang aplikasi". iPhone/iPad: tombol Bagikan → "Tambahkan ke Layar Utama".',
      duration: 6000,
    })
  }

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

  /* Jendela mood 14 hari (terlama → terbaru) untuk kartu Riwayat
     Mood (audit #25) + rekap jumlah per mood pada periode itu. */
  const moodDays = Array.from({ length: 14 }, (_, idx) => {
    const back = 13 - idx
    const iso = addDaysISO(today, -back)
    return {
      iso,
      label: WEEKDAY_MIN[fromISO(iso).getDay()],
      mood: moodLogs[iso],
      isToday: back === 0,
    }
  })
  const moodCounts = MOODS.map((name) => ({
    name,
    count: moodDays.filter((d) => d.mood === name).length,
  }))
  const moodLogged = moodCounts.some((c) => c.count > 0)
  const todayMood = moodDays[13].mood

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
    <div
      data-module="profil"
      className="h-full overflow-y-auto no-scrollbar px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))] text-content-primary"
    >
      {/* Tombol kembali — Profil bukan tab, orientasi via Beranda */}
      <m.button
        type="button"
        onClick={() => setScreen('beranda')}
        aria-label="Kembali ke Beranda"
        whileTap={{ scale: 0.92 }}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: motionTokens.easing.standard }}
        className="-ml-1 flex h-10 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface-primary pl-3 pr-4 text-note font-semibold text-content-secondary shadow-soft transition-colors hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <ArrowLeft className="h-4.5 w-4.5" />
        Kembali
      </m.button>

      {/* Header editorial — eyebrow & titik memakai aksen Cocoa Gold
          (identitas kamar preferensi; sebelumnya terracotta danger). */}
      <header className="mt-2">
        <p className="flex items-center gap-1.5 text-eyebrow font-semibold uppercase tracking-[0.14em] text-module-accent-strong">
          <Leaf className="h-3.5 w-3.5 text-module-accent-strong" />
          Akun & preferensi
        </p>
        <h1
          className={`${playfair.className} mt-1.5 text-balance text-fluid-editorial font-semibold leading-none tracking-tight text-content-primary`}
        >
          <SplitText text="Profil" inView />
          <span className="text-module-accent">.</span>
        </h1>
      </header>

      {/* Kartu profil + progres level — permukaan hero identitas (espresso
          + emas + parchment): satu-satunya kartu hero di layar ini, kartu
          pengaturan lain tetap tenang. (shadcn Progress & Badge) */}
      <m.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: motionTokens.easing.standard }}
        className="mt-4 flex flex-col items-center rounded-2xl border border-border bg-hero-surface p-5 text-center text-hero-content shadow-soft"
      >
        {/* HoverCard avatar — alami desktop-only (butuh kursor); kartu kecil
            identitas pengguna dengan aksen matcha. */}
        <HoverCard>
          <HoverCardTrigger asChild>
            <Avatar className="h-16 w-16 border-4 border-hero-surface shadow-card ring-2 ring-hero-accent/40">
              <AvatarFallback className="bg-cocoa text-lead font-bold text-parchment">
                AN
              </AvatarFallback>
            </Avatar>
          </HoverCardTrigger>
          <HoverCardContent
            side="bottom"
            className="w-56 rounded-xl border-border bg-surface-primary p-4"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
              >
                <Leaf className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-note font-semibold leading-tight text-content-primary">
                  Ananda
                </p>
                <p className="mt-0.5 text-eyebrow font-medium leading-snug text-content-muted">
                  Pengguna Rutina
                </p>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
        <h2 className="mt-3 text-lead font-bold tracking-tight text-hero-content">
          Ananda
        </h2>
        <p className="mt-0.5 text-meta font-medium text-hero-content-muted">
          Profil pribadi · tersinkron cloud
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1.5 rounded-full border-hero-accent/40 bg-hero-surface-raised px-3 py-1 text-eyebrow font-semibold text-hero-accent"
          >
            <Sparkles className="h-3 w-3" />
            Level {level}
          </Badge>
          <Badge
            variant="outline"
            className="rounded-full border-hero-content/20 bg-hero-surface-raised px-3 py-1 text-eyebrow font-semibold text-hero-content-muted"
          >
            {memberBadge}
          </Badge>
        </div>

        {/* Progres XP menuju level berikutnya */}
        <div className="mt-5 w-full">
          <div className="flex items-baseline justify-between px-0.5">
            <span className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-hero-content-muted">
              Progres Level
            </span>
            <span className="text-eyebrow font-semibold tabular-nums text-hero-accent">
              <Counter to={xp} /> / {XP_TARGET} XP
            </span>
          </div>
          <Progress
            value={xpPct}
            className="mt-2 h-2.5 rounded-full bg-hero-surface-raised [&_[data-slot=progress-indicator]]:bg-hero-accent"
            aria-label="Progres XP menuju level berikutnya"
          />
          <p className="mt-2 text-eyebrow font-medium text-hero-content-muted">
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
            className="flex flex-col items-center rounded-lg border border-border bg-surface-primary p-3.5 shadow-soft"
          >
            <p className="flex items-baseline">
              <span className="text-kpi-sm font-semibold leading-none tracking-tight text-content-primary">
                <Counter to={s.value} />
              </span>
              {s.percent ? (
                <span className="text-body font-semibold text-content-primary">%</span>
              ) : null}
            </p>
            <p className="mt-1.5 text-eyebrow font-semibold uppercase tracking-[0.12em] text-content-muted">
              {s.label}
            </p>
          </m.div>
        ))}
      </div>

      {/* Suara Identitas (audit #23) — pernyataan editorial "aku menjadi
          orang yang…": tampil sebagai kutipan serif italic, disunting
          lewat textarea dengan pembatas 600 karakter. */}
      <m.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: motionTokens.easing.standard }}
        className="mt-3 rounded-xl border border-border bg-surface-primary p-5 shadow-soft"
        aria-label="Suara identitas"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary">
            <Fingerprint className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-body font-semibold text-content-primary">
              Suara Identitas
            </p>
            <p className="text-eyebrow font-medium text-content-muted">
              Deklarasi siapa dirimu, bukan sekadar target
            </p>
          </div>
          {identityText !== '' && !editingIdentity && (
            <button
              type="button"
              onClick={startEditIdentity}
              aria-label="Ubah suara identitas"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-sunken text-content-secondary transition-colors hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>

        {editingIdentity ? (
          <div className="mt-4">
            <textarea
              value={identityDraft}
              onChange={(e) => setIdentityDraft(e.target.value.slice(0, 600))}
              placeholder="Aku menjadi orang yang…"
              rows={4}
              aria-label="Teks suara identitas"
              className="w-full resize-none rounded-xl border border-border bg-surface-sunken px-3.5 py-3 text-body leading-relaxed text-content-primary outline-none transition-colors placeholder:text-content-muted focus-visible:border-primary"
            />
            <p className="mt-2 text-eyebrow font-medium leading-relaxed text-content-muted">
              Tulis identitas yang ingin kamu bangun — bukan target,
              melainkan siapa dirimu.
            </p>
            <div className="mt-2.5 flex items-center justify-between gap-3">
              <span className="text-eyebrow font-semibold tabular-nums text-content-muted">
                {identityDraft.length}/600
              </span>
              <div className="flex gap-2">
                <RutinaButton
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingIdentity(false)}
                >
                  Batal
                </RutinaButton>
                <RutinaButton
                  variant="primary"
                  size="sm"
                  onClick={saveIdentity}
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Simpan
                </RutinaButton>
              </div>
            </div>
          </div>
        ) : identityText !== '' ? (
          <figure className="relative mt-4 rounded-xl bg-secondary/50 px-5 pb-3.5 pt-5">
            <span
              aria-hidden="true"
              className={`${playfair.className} pointer-events-none absolute -top-2 left-2.5 select-none text-[52px] leading-none text-primary/30`}
            >
              &ldquo;
            </span>
            <blockquote
              className={`${playfair.className} text-lead font-medium italic leading-relaxed text-content-primary`}
            >
              {identityText}
            </blockquote>
            <figcaption className="mt-2 text-right text-eyebrow font-semibold uppercase tracking-[0.16em] text-content-muted">
              Suara identitasku
            </figcaption>
          </figure>
        ) : (
          <div className="mt-4 rounded-xl bg-surface-sunken px-4 py-4">
            <p
              className={`${playfair.className} text-section-lg font-medium italic leading-relaxed text-content-secondary`}
            >
              Siapa yang ingin kamu jadi lewat kebiasaan ini?
            </p>
            <RutinaButton
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={startEditIdentity}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Tulis identitasku
            </RutinaButton>
          </div>
        )}
      </m.section>

      {/* Riwayat Mood (audit #25) — strip 14 hari (terlama → terbaru):
          inisial hari kerja + ikon mood sesuai warna energi, hari ini
          disorot; di bawahnya rekap jumlah per mood. Kosong → ajakan
          check-in lewat toko modul check-in. */}
      <m.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          delay: 0.08,
          ease: motionTokens.easing.standard,
        }}
        className="mt-3 rounded-xl border border-border bg-surface-primary p-5 shadow-soft"
        aria-label="Riwayat mood"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary">
            <HeartPulse className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-body font-semibold text-content-primary">
              Riwayat Mood
            </p>
            <p className="text-eyebrow font-medium text-content-muted">
              Suasana hati 14 hari terakhir
            </p>
          </div>
          {moodLogged && !todayMood && (
            <button
              type="button"
              onClick={() => useCheckInSheet.getState().openCheckIn()}
              className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-secondary px-3 text-eyebrow font-semibold text-success transition-colors hover:bg-secondary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Check-in
            </button>
          )}
        </div>

        {moodLogged ? (
          <>
            <div
              className="mt-4 flex gap-1"
              role="list"
              aria-label="Mood per hari, 14 hari terakhir"
            >
              {moodDays.map((d) => {
                const MoodIcon = d.mood != null ? MOOD_ICONS[d.mood] : null
                return (
                  <div
                    key={d.iso}
                    role="listitem"
                    title={`${shortDateLabel(d.iso)}${d.mood ? ` · ${d.mood}` : ' · tanpa catatan'}`}
                    aria-label={`${shortDateLabel(d.iso)}${d.mood ? ` ${d.mood}` : ' tanpa catatan'}`}
                    className={cn(
                      'flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-xl py-2',
                      d.isToday && 'bg-secondary/60 ring-1 ring-primary/30',
                    )}
                  >
                    <span
                      className={cn(
                        'text-chart-label font-semibold uppercase tracking-wide',
                        d.isToday
                          ? 'text-content-secondary'
                          : 'text-content-muted',
                      )}
                    >
                      {d.label}
                    </span>
                    {MoodIcon ? (
                      <MoodIcon
                        className={cn(
                          'h-4.5 w-4.5',
                          MOOD_TONE[d.mood ?? '']?.text,
                        )}
                        aria-hidden="true"
                      />
                    ) : (
                      <Minus
                        className="h-4 w-4 text-content-muted/40"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 px-0.5">
              <span className="text-chart-label font-semibold uppercase tracking-[0.14em] text-content-muted">
                Rekap 14 hari
              </span>
              {moodCounts
                .filter((c) => c.count > 0)
                .map((c, i, arr) => (
                  <span
                    key={c.name}
                    className="flex items-center gap-2 text-meta font-semibold"
                  >
                    <span>
                      <span className={MOOD_TONE[c.name]?.text}>
                        {c.name}
                      </span>{' '}
                      <span className="tabular-nums text-content-muted">
                        {c.count}×
                      </span>
                    </span>
                    {i < arr.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="text-content-muted/50"
                      >
                        ·
                      </span>
                    )}
                  </span>
                ))}
            </div>
          </>
        ) : (
          <RutinaEmptyState
            className="mt-4"
            icon={<Smile className="h-6 w-6" aria-hidden="true" />}
            title="Belum ada catatan mood"
            description="Isi check-in harian untuk mulai melihat pola suasana hatimu di sini."
            action={
              <RutinaButton
                variant="primary"
                size="sm"
                onClick={() => useCheckInSheet.getState().openCheckIn()}
              >
                Isi check-in hari ini
              </RutinaButton>
            }
          />
        )}
      </m.section>

      {/* Chip kata kunci statis — tanpa marquee; ikon Leaf Cocoa Gold. */}
      <BlurFade delay={0.18} className="mt-4">
        <div className="flex flex-wrap gap-2">
          {FOCUS_WORDS.map((w) => (
            <span
              key={w}
              className="flex items-center gap-1.5 rounded-full border border-module-accent/25 bg-module-accent-soft/60 px-3.5 py-1.5 text-eyebrow font-semibold text-module-accent-strong"
            >
              <Leaf className="h-3 w-3 text-module-accent" aria-hidden="true" />
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
          className="rounded-xl border border-border bg-surface-primary p-5 shadow-soft"
          aria-label="Target misi harian"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary">
              <Target className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-body font-semibold text-content-primary">
                Target Misi Harian
              </p>
              <p className="text-eyebrow font-medium text-content-muted">
                Berapa misi yang ingin kamu selesaikan tiap hari?
              </p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-note font-bold tabular-nums text-primary-foreground">
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
          <div className="mt-2 flex justify-between text-eyebrow font-semibold text-content-muted">
            <span>Santai (1)</span>
            <span>Seimbang (6)</span>
            <span>Produktif (12)</span>
          </div>
        </m.section>

        {/* Bahasa — preferensi saat ini ditampilkan sebagai informasi
            statis (review v2.13): menu interaktif dengan pilihan yang
            belum benar-benar berfungsi memberi kesan ada pengaturan
            yang bisa diubah. Menu dikembalikan saat multi-bahasa
            benar-benar tersedia. */}
        <m.div
          variants={slideInRow}
          className="flex min-h-[54px] items-center gap-3 rounded-xl border border-border bg-surface-primary px-4 shadow-soft"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary">
            <Globe aria-hidden="true" className="h-4 w-4" />
          </span>
          <span className="flex-1 text-body font-medium text-content-primary">
            Bahasa
          </span>
          <span className="flex items-center gap-1.5 text-note font-semibold text-content-muted">
            Indonesia
            <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-eyebrow font-semibold uppercase tracking-wide text-content-muted">
              aktif
            </span>
          </span>
        </m.div>

        {/* Judul seksi: data & penyimpanan */}
        <m.div variants={slideInRow} className="pt-2.5">
          <RutinaSectionHeader title="Data & Penyimpanan" />
        </m.div>

        {/* Data & penyimpanan — status jujur + mulai dari awal */}
        <m.section
          variants={slideInRow}
          className="rounded-xl border border-border bg-surface-primary p-5 shadow-soft"
          aria-label="Data dan penyimpanan"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary">
              <HardDrive className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-body font-semibold text-content-primary">
                Data &amp; Penyimpanan
              </p>
              <p className="text-eyebrow font-medium text-content-muted">
                {habits.length} kebiasaan · {notes.length} catatan ·{' '}
                {txs.length} transaksi — tersinkron otomatis ke cloud
              </p>
            </div>
            <span
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-secondary px-2.5 py-1 text-eyebrow font-semibold text-success"
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
          <p className="mt-3 rounded-xl bg-surface-sunken px-3.5 py-2.5 text-meta leading-relaxed text-content-secondary">
            Rutina bekerja tanpa akun: setiap perubahan tersinkron otomatis
            ke cloud pribadimu (Turso) dan tetap tersimpan di perangkat
            sebagai cadangan offline — aplikasi tetap hidup tanpa internet.
            Mulai dari awal akan menghapus semuanya secara permanen, di
            perangkat maupun cloud.
          </p>
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              onClick={() => void handleForcePull()}
              disabled={pulling}
              className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/40 bg-secondary/60 text-note font-bold text-content-secondary transition-all hover:bg-secondary active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
            >
              {pulling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CloudDownload className="h-4 w-4" />
              )}
              {pulling ? 'Menarik data…' : 'Tarik ulang dari cloud'}
            </button>
          </div>
        </m.section>

        {/* ===== Ekspor & cadangan (v2.22) — unduh JSON penuh + CSV
            transaksi; pulihkan cadangan JSON lewat berkas. ===== */}
        <m.section
          variants={slideInRow}
          className="rounded-xl border border-border bg-surface-primary p-5 shadow-soft"
          aria-label="Ekspor dan cadangan"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary">
              <Archive className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-body font-semibold text-content-primary">
                Ekspor &amp; Cadangan
              </p>
              <p className="text-eyebrow font-medium text-content-muted">
                Simpan salinan di luar aplikasi — data milikmu sepenuhnya
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={downloadJsonBackup}
              className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/40 bg-secondary/60 text-note font-bold text-content-secondary transition-all hover:bg-secondary active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <FileJson className="h-4 w-4" />
              Cadangan JSON
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/40 bg-secondary/60 text-note font-bold text-content-secondary transition-all hover:bg-secondary active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Transaksi (CSV)
            </button>
          </div>
          <div className="mt-2">
            <label
              htmlFor="import-backup"
              className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong text-note font-bold text-content-secondary transition-all hover:border-primary/50 hover:bg-surface-sunken active:scale-[0.98] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary"
            >
              <Upload className="h-4 w-4" />
              {importing ? 'Memulihkan…' : 'Pulihkan dari cadangan JSON'}
              <input
                id="import-backup"
                type="file"
                accept="application/json,.json"
                className="sr-only"
                disabled={importing}
                onChange={handleImportFile}
              />
            </label>
            <p className="mt-2 text-eyebrow leading-relaxed text-content-muted">
              Impor mengganti seluruh data saat ini dengan isi berkas
              cadangan lalu tersinkron ke cloud — pastikan memilih berkas
              yang benar.
            </p>
          </div>
        </m.section>

        {/* Zona bahaya — mulai dari awal */}
        <m.section
          variants={slideInRow}
          className="rounded-xl border border-border bg-surface-primary p-5 shadow-soft"
          aria-label="Zona bahaya"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-clay/25 text-content-danger">
              <TriangleAlert className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-body font-semibold text-content-primary">
                Zona Bahaya
              </p>
              <p className="text-eyebrow font-medium text-content-muted">
                Mulai dari awal menghapus semuanya secara permanen
              </p>
            </div>
          </div>
          <div className="mt-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-surface-primary text-note font-bold text-content-danger transition-all hover:bg-destructive/10 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
                >
                  <RotateCcw className="h-4 w-4" />
                  Mulai dari awal
                </button>
              </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[320px] rounded-2xl border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-section-lg font-bold tracking-tight text-content-primary">
                  Hapus semua data?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-note leading-relaxed text-content-muted">
                  Seluruh kebiasaan, histori, catatan, transaksi, dan tujuan
                  tabungan akan dihapus permanen — dari perangkat ini dan
                  penyimpanan cloud. Tindakan ini tidak bisa dibatalkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row gap-2">
                <AlertDialogCancel className="mt-0 h-10 flex-1 rounded-full border-border-strong text-note font-bold text-content-secondary">
                  Batal
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    useRutina.getState().startFresh()
                    toast.success('Aplikasi direset — mulailah dari nol.')
                  }}
                  className="h-10 flex-1 rounded-full border-none bg-destructive text-note font-bold text-white hover:bg-destructive/90"
                >
                  Ya, hapus
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
          </div>
        </m.section>

        {/* Judul seksi: aplikasi (PWA) */}
        <m.div variants={slideInRow} className="pt-2.5">
          <RutinaSectionHeader title="Aplikasi" />
        </m.div>

        {/* Pasang aplikasi (PWA) — instal native dari browser */}
        <m.section
          variants={slideInRow}
          className="rounded-xl border border-border bg-surface-primary p-5 shadow-soft"
          aria-label="Pasang aplikasi"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary">
              <MonitorSmartphone className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-body font-semibold text-content-primary">
                Pasang di perangkat
              </p>
              <p className="text-eyebrow font-medium text-content-muted">
                Aplikasi mandiri (PWA) — layar penuh, ikon sendiri, tetap
                bekerja offline
              </p>
            </div>
          </div>
          {appInstalled ? (
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-secondary px-3.5 py-2.5 text-meta font-bold text-success">
              <Check className="h-3.5 w-3.5 shrink-0" />
              Sudah terpasang — kamu sedang menjalankan versi aplikasinya.
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void handleInstall()}
                className="mt-3 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-note font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Download className="h-4 w-4" />
                {installPrompt ? 'Pasang aplikasi' : 'Tambahkan ke Layar Utama'}
              </button>
              <p className="mt-2.5 text-eyebrow leading-relaxed text-content-muted">
                {installPrompt
                  ? 'Browser sudah menawarkan instal — ketuk untuk memasang.'
                  : 'Chrome/Edge/Android: buka menu browser → "Pasang aplikasi". iPhone/iPad: tombol Bagikan → "Tambahkan ke Layar Utama".'}
              </p>
            </>
          )}
        </m.section>

        {/* Judul seksi: bantuan & FAQ */}
        <m.div variants={slideInRow} className="pt-2.5">
          <RutinaSectionHeader title="Bantuan & FAQ" />
        </m.div>

        {/* Pertanyaan umum (shadcn Accordion) */}
        <m.section
          variants={slideInRow}
          className="rounded-xl border border-border bg-surface-primary px-4 shadow-soft"
          aria-label="Pertanyaan umum"
        >
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((f, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border-border"
              >
                <AccordionTrigger className="py-4 text-left text-body font-semibold text-content-primary hover:no-underline [&>svg]:text-primary">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-note leading-relaxed text-content-muted">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </m.section>

        {/* Tentang — RutinaDialog: tetap di dalam bingkai ponsel
            (shadcn Dialog di-portal ke body dan lolos dari bingkai
            di desktop). */}
        <m.div variants={slideInRow}>
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            aria-haspopup="dialog"
            className="flex min-h-[54px] w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-primary px-4 text-left shadow-soft transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary">
              <Info className="h-4 w-4" />
            </span>
            <span className="flex-1 text-body font-medium text-content-primary">
              Tentang Rutina
            </span>
            <ChevronRight className="h-4 w-4 text-content-muted" />
          </button>
          <RutinaDialog
            open={aboutOpen}
            onClose={() => setAboutOpen(false)}
            label="Tentang Rutina"
            className="max-w-[320px] p-6 sm:max-w-[320px]"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
              <Leaf className="h-6 w-6 text-primary" />
            </div>
            <h2 className="mt-3 text-center text-lead font-bold tracking-tight text-content-primary">
              Rutina 2.0
            </h2>
            <p className="mt-1 text-center text-note leading-relaxed text-content-muted">
              Aplikasi kebiasaan &amp; jurnal dengan palet earth tone.
              Dibangun dengan Next.js, Tailwind CSS 4, shadcn/ui, Motion,
              dan anime.js.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Badge className="rounded-full bg-secondary text-eyebrow font-semibold text-success hover:bg-secondary">
                Earth Tone
              </Badge>
              <Badge className="rounded-full bg-secondary text-eyebrow font-semibold text-success hover:bg-secondary">
                Gamified
              </Badge>
              <Badge className="rounded-full bg-secondary text-eyebrow font-semibold text-success hover:bg-secondary">
                Editorial
              </Badge>
            </div>
            <div className="mt-5 flex justify-center">
              <Button
                type="button"
                className="h-9 rounded-full bg-primary px-6 text-note font-bold text-primary-foreground hover:bg-action-hover"
                onClick={() => {
                  setAboutOpen(false)
                  toast('Terima kasih sudah memakai Rutina!')
                }}
              >
                Mengerti
              </Button>
            </div>
          </RutinaDialog>
        </m.div>

      </m.div>

      {/* Penutup — teks versi, sekaligus pemicu easter egg developer
          (ketuk 5× dalam 2 detik untuk membuka papan sistem desain). */}
      <button
        type="button"
        onClick={handleVersionTap}
        aria-label="Rutina 2.0 Kebun Kebiasaan"
        className="mt-6 block w-full cursor-pointer text-center text-eyebrow font-medium uppercase tracking-[0.14em] text-content-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Rutina 2.0 · Kebun Kebiasaan
      </button>
    </div>
  )
}
