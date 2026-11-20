'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  CloudDownload,
  FileDown,
  FileJson,
  FileSpreadsheet,
  Fingerprint,
  Globe,
  Info,
  Leaf,
  Loader2,
  MonitorSmartphone,
  Moon,
  Pencil,
  Plus,
  RotateCcw,
  Smile,
  Sparkles,
  Sun,
  Target,
  TriangleAlert,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'

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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'

import { MOOD_TONE } from '../journal-ui'
import { useCheckInSheet } from '../checkin-sheet'
import { RutinaButton } from '../rutina-button'
import { RutinaDialog } from '../rutina-dialog'
import { RutinaSectionHeader } from '../rutina-section-header'
import { slideInRow, staggerRows } from '@/lib/motion/variants'
import { playfair } from '../serif'
import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { SyncStatusCard } from '../sync-status-card'
import { exportBackup, forcePull, importBackup } from '../sync-engine'
import { catMetaOf } from '../finance/cats'
import {
  activeSinceISO,
  computeLevel,
  computeXp,
  doneCountOn,
  fromISO,
  todayISO,
  useRutina,
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
  {
    q: 'Bisakah saya memindahkan data ke perangkat lain?',
    a: 'Bisa. Data tersinkron otomatis lewat cloud pribadimu; sebagai cadangan, unduh berkas JSON dari grup "Data & Penyimpanan" lalu pulihkan di perangkat baru.',
  },
]

/* Kata kunci fokus — chip cepat saat menyunting Suara Identitas
   (dipindah dari tampilan statis agar tiap elemen punya fungsi). */
const FOCUS_WORDS = [
  'Konsisten',
  'Fokus',
  'Hemat',
  'Bergerak',
  'Tenang',
  'Membaca',
  'Tidur cukup',
  'Bersyukur',
]

/* ===== Pola baris pengaturan standar (audit 2g) =====
   Ikon kecil kiri · label text-body semibold · keterangan text-eyebrow
   content-muted · kontrol kanan (nilai/chevron/Switch). Baris dipisah
   hairline divide-y di dalam kartu grup — seperti aplikasi settings
   premium. Varian: tombol (onClick), label berkas (htmlFor), statis. */
interface SettingRowProps {
  icon: LucideIcon
  label: string
  description?: string
  /** Kontrol sisi kanan: nilai, chevron, Switch, dsb. */
  control?: ReactNode
  onClick?: () => void
  /** Render baris sebagai <label> (mis. membungkus input berkas sr-only). */
  htmlFor?: string
  disabled?: boolean
}

function SettingRow({
  icon: Icon,
  label,
  description,
  control,
  onClick,
  htmlFor,
  disabled,
}: SettingRowProps) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary"
      >
        <Icon className="h-4 w-4" strokeWidth={2.1} />
      </span>
      <span className="min-w-0 flex-1 py-0.5">
        <span className="block text-body font-semibold leading-snug text-content-primary">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-eyebrow font-medium leading-snug text-content-muted">
            {description}
          </span>
        ) : null}
      </span>
      {control != null && (
        <span className="flex min-w-0 shrink-0 items-center gap-1.5 text-note font-semibold text-content-secondary">
          {control}
        </span>
      )}
    </>
  )
  const base = 'flex w-full items-center gap-3.5 px-4 py-3 text-left'

  if (htmlFor) {
    return (
      <label
        htmlFor={htmlFor}
        className={cn(
          base,
          'interactive cursor-pointer hover:bg-surface-sunken focus-within:outline focus-within:outline-2 focus-within:outline-offset-[-2px] focus-within:outline-primary',
        )}
      >
        {body}
      </label>
    )
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          base,
          'interactive cursor-pointer hover:bg-surface-sunken disabled:cursor-wait disabled:opacity-60',
        )}
      >
        {body}
      </button>
    )
  }
  return <div className={base}>{body}</div>
}

export default function ProfileScreen() {
  /* v2.35 anti-replay: pembuka Control Room hanya kunjungan pertama. */
  const playEntrance = useFirstVisit('profil-control')
  /* Gulir kategori dihormati: pengguna reduce-motion melompat langsung
     (behavior "auto"), bukan animasi smooth. */
  const reducedMotion = useReducedMotion()
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
  const mood = useRutina((s) => s.mood)

  /* Draf penyuntingan Suara Identitas (audit #23) — draf terpisah agar
     teks tersimpan tetap utuh selama menyunting; dibatasi 600 karakter
     (store juga memangkas otomatis). */
  const [editingIdentity, setEditingIdentity] = useState(false)
  const [identityDraft, setIdentityDraft] = useState('')

  /* Dialog "Tentang Rutina" — memakai RutinaDialog agar tetap berada di
     dalam bingkai ponsel (shadcn Dialog di-portal ke body & lolos dari
     bingkai di desktop). */
  const [aboutOpen, setAboutOpen] = useState(false)
  /* Dialog reset (v2.33): zona kritis kini memakai RutinaDialog dalam
     bingkai (bukan AlertDialog terportal) — konsisten dengan dialog
     ekspor/tentang; gerbang state sederhana. */
  const [resetOpen, setResetOpen] = useState(false)

  /* Dialog "Ekspor cadangan" — satu pintu, dua pilihan format
     (JSON lengkap / CSV transaksi); unduhan dipicu dari dialog. */
  const [exportOpen, setExportOpen] = useState(false)

  /* Panel "Target Misi Harian" terbuka? (baris pengaturan yang dapat
     dikembangkan — slider muncul di bawah barisnya) */
  const [goalOpen, setGoalOpen] = useState(false)

  /* Preferensi tampilan — mode gelap via next-themes (satu sumber
     kebenaran tema bersama cangkang aplikasi). Pola mounted mencegah
     mismatch hidrasi: SSR selalu merender keadaan terang. */
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const dark = mounted && resolvedTheme === 'dark'

  const startEditIdentity = () => {
    setIdentityDraft(identityText)
    setEditingIdentity(true)
  }

  const saveIdentity = () => {
    setIdentityText(identityDraft.trim())
    setEditingIdentity(false)
    toast.success('Suara identitas tersimpan.')
  }

  /* Tambah kata kunci fokus ke draf identitas — chip kini fungsional:
     draf kosong diawali kata itu, draf berisi disambung koma. */
  const appendFocusWord = (word: string) => {
    setIdentityDraft((d) => {
      const trimmed = d.replace(/[\s,]+$/, '')
      const next =
        trimmed === '' ? word : `${trimmed}, ${word.toLowerCase()}`
      return next.slice(0, 600)
    })
  }

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
  const xp = computeXp(doneCount, bonusClaimed)
  const level = computeLevel(xp)
  /* scheduledToday & streak: dulu dipakai kisi statistik hero — v2.33
     kisi dihapus; angka lengkap hidup di Statistik (konsolidasi, bukan
     kehilangan fitur). */

  /* "Aktif sejak" — bulan aktivitas terawal dari completions. Dibungkus
     useMemo: activeSinceISO mengurutkan seluruh kunci completions dan
     scrollspy setActiveCat memicu render saat menggulir — tanpa memo ini
     dihitung ulang di tiap frame gulir. */
  const activeSince = useMemo(() => activeSinceISO(completions), [completions])
  const memberBadge = useMemo(
    () =>
      activeSince
        ? `Aktif sejak ${new Intl.DateTimeFormat('id-ID', {
            month: 'long',
            year: 'numeric',
          }).format(fromISO(activeSince))}`
        : 'Belum ada aktivitas',
    [activeSince],
  )

  /* Pengingat aktif — jumlah nyata kebiasaan yang memakai jam pengingat
     (diatur per kebiasaan di lembar suntingnya, bukan saklar global).
     useMemo dengan alasan yang sama: render scrollspy berulang saat gulir. */
  const reminderCount = useMemo(
    () => habits.filter((h) => h.reminder !== null).length,
    [habits],
  )

  /* v2.33 Control Room: ruang aktif untuk navigasi kategori split
     (desktop lg+) — scrollspy pita tengah, pola petunjuk arah Kebiasaan. */
  const [activeCat, setActiveCat] = useState<
    'identitas' | 'preferensi' | 'data' | 'zona' | 'bantuan'
  >('identitas')
  useEffect(() => {
    const cats: [string, typeof activeCat][] = [
      ['profil-identitas', 'identitas'],
      ['profil-preferensi', 'preferensi'],
      ['profil-data', 'data'],
      ['profil-zona', 'zona'],
      ['profil-bantuan', 'bantuan'],
    ]
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const hit = cats.find(([id]) => id === e.target.id)
          if (hit) setActiveCat(hit[1])
        }
      },
      { rootMargin: '-30% 0px -55% 0px' },
    )
    for (const [id] of cats) {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    }
    return () => obs.disconnect()
  }, [])

  /* Lebar kolom TIDAK diulang di akar layar — cangkang rutina-app sudah
     membungkus tiap layar dalam CONTENT_W; penggandaan max-w ganda
     hanya menumpuk batas yang identik (audit: redundan). */
  return (
    <div
      data-module="profil"
      data-layout="control-room"
      className="h-full w-full overflow-y-auto no-scrollbar px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))] text-content-primary"
    >
      {/* Tombol kembali — Profil bukan tab, orientasi via Beranda */}
      <m.button
        type="button"
        onClick={() => setScreen('beranda')}
        aria-label="Kembali ke Beranda"
        whileTap={{ scale: 0.92 }}
        initial={playEntrance ? { opacity: 0, x: -10 } : false}
        animate={{ opacity: 1, x: 0 }}
        transition={motionTokens.preset.cardReveal}
        className="interactive -ml-1 flex h-10 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface-primary pl-3 pr-4 text-note font-semibold text-content-secondary shadow-soft hover:bg-surface-secondary"
      >
        <ArrowLeft className="h-4.5 w-4.5" />
        Kembali
      </m.button>

      {/* Header editorial — eyebrow memakai aksen Cocoa Gold (identitas
          kamar preferensi). */}
      <header className="mt-2">
        <p className="flex items-center gap-1.5 text-eyebrow font-semibold uppercase tracking-[0.14em] text-module-accent-strong">
          <Leaf className="h-3.5 w-3.5 text-module-accent-strong" />
          Akun &amp; preferensi
        </p>
        <h1
          className={`${playfair.className} mt-1.5 text-balance text-fluid-editorial font-semibold leading-none tracking-tight text-content-primary`}
        >
          Profil
          <span className="text-module-accent">.</span>
        </h1>
      </header>

      {/* ANIMATION OWNERSHIP RULE — koreografi seluruh baris/seksi dipegang
          Motion lewat variants staggerRows/slideInRow (satu pemilik). */}
      {/* v2.33 Control Room (audit direktif): koreografi stagger
          seluruh halaman DIHENTIKAN (initial={false}) — ruang kendali
          menuntut ketenangan; switch/accordion/toast tetap bergerak. */}
      <m.div variants={staggerRows} initial={false} animate="show">
        {/* Split layout desktop (v2.33): navigasi kategori kiri (sticky),
            konten pengaturan kanan; ponsel/tablet menumpuk (nav disembunyikan). */}
        <div className="grid grid-cols-1 lg:grid-cols-[168px_minmax(0,1fr)] lg:gap-8">
          <nav aria-label="Kategori pengaturan" className="hidden lg:block">
            <ul className="sticky top-6 space-y-0.5">
              {(
                [
                  ['profil-identitas', 'Identitas', false],
                  ['profil-preferensi', 'Preferensi', false],
                  ['profil-data', 'Data & Sinkron', false],
                  ['profil-bantuan', 'Bantuan', false],
                  ['profil-zona', 'Zona Kritis', true],
                ] as const
              ).map(([id, label, danger]) => {
                const isActive = activeCat === id.replace('profil-', '')
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() =>
                        document
                          .getElementById(id)
                          ?.scrollIntoView({
                            /* behavior mengikuti preferensi reduce-motion —
                               tanpa animasi gulir untuk pengguna yang
                               memintanya. */
                            behavior: reducedMotion ? 'auto' : 'smooth',
                            block: 'start',
                          })
                      }
                      aria-current={isActive ? 'location' : undefined}
                      className={
                        'w-full cursor-pointer rounded-lg px-3 py-2 text-left text-meta font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
                        (danger
                          ? 'mt-4 text-content-danger hover:bg-destructive/10' +
                            (isActive ? ' bg-destructive/10' : '')
                          : isActive
                            ? 'bg-module-accent/15 text-module-accent-strong'
                            : 'text-content-muted hover:bg-surface-sunken hover:text-content-primary')
                      }
                    >
                      {label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
          <div className="min-w-0">
        {/* ===== 1 · IDENTITAS PENGGUNA — paling atas ===== */}
        <m.div id="profil-identitas" variants={slideInRow} className="mt-4 scroll-mt-4">
          <RutinaSectionHeader
            title="Identitas"
            description="Siapa dirimu di Rutina — tanpa akun, tersinkron cloud"
          />
        </m.div>

        {/* Kartu hero identitas (espresso + emas + parchment) — satu-satunya
            kartu hero di layar ini; statistik ringkas dilipat ke dalamnya
            (audit 2g: kurangi kartu kecil berserakan). */}
        <m.section
          variants={slideInRow}
          aria-label="Identitas pengguna"
          className="mt-3 flex flex-col items-center rounded-2xl border border-border bg-hero-surface p-5 text-center text-hero-content shadow-soft"
        >
          {/* HoverCard avatar — alami desktop-only (butuh kursor); kartu
              kecil identitas pengguna dengan aksen matcha. */}
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
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
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

          {/* v2.33 Control Room: kartu identitas ringkas — tanpa bar XP &
              tanpa kisi statistik (pelanggaran audit: 'tanpa KPI dashboard');
              progres penuh hidup di cincin XP Statistik. Level tetap tampil
              sebagai lencana. */}
        </m.section>

        {/* Suara Identitas (audit #23) — pernyataan editorial "aku menjadi
            orang yang…": kutipan serif italic, disunting lewat textarea
            dengan pembatas 600 karakter + chip kata kunci fokus cepat. */}
        <m.section
          variants={slideInRow}
          aria-label="Suara identitas"
          className="mt-3 rounded-xl border border-border bg-surface-primary p-5 shadow-soft"
        >
          <div className="flex items-center gap-3.5">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary"
            >
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
                className="interactive flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-sunken text-content-secondary hover:bg-secondary"
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
                melainkan siapa dirimu. Butuh kata? ketuk chip di bawah.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {FOCUS_WORDS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => appendFocusWord(w)}
                    className="interactive h-8 cursor-pointer rounded-full border border-module-accent/25 bg-module-accent-soft/60 px-3 text-eyebrow font-semibold text-module-accent-strong hover:bg-module-accent-soft"
                  >
                    + {w}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
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

        {/* ===== Suasana hari ini — ringkas (audit density v2.37 §9).
            Riwayat mood 14 hari + input check-in suasana kini terpusat di
            Statistik › Ruang Suasana; Profil menyimpan chip status dan dua
            pintu: lembar check-in lengkap (mood + tubuh) & Statistik. ===== */}
        <m.section
          variants={slideInRow}
          aria-label="Suasana hati hari ini"
          className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-xl border border-border bg-surface-primary p-3.5 shadow-soft"
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary"
          >
            <Smile className="h-4 w-4" strokeWidth={2.1} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold leading-snug text-content-primary">
              Suasana hari ini:{' '}
              {mood ? (
                <span className={MOOD_TONE[mood]?.text ?? 'text-content-primary'}>
                  {mood}
                </span>
              ) : (
                <span className="font-medium text-content-muted">
                  belum diisi
                </span>
              )}
            </p>
            <p className="mt-0.5 text-eyebrow font-medium leading-snug text-content-muted">
              Riwayat 14 hari &amp; check-in suasana terpusat di Statistik
            </p>
          </div>
          <RutinaButton
            variant="secondary"
            size="sm"
            onClick={() => useCheckInSheet.getState().openCheckIn()}
            aria-label="Isi lembar check-in hari ini"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Check-in
          </RutinaButton>
          <RutinaButton
            variant="outline"
            size="sm"
            onClick={() => setScreen('statistik')}
            aria-label="Kelola suasana hati di Statistik"
          >
            Kelola di Statistik
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </RutinaButton>
        </m.section>

        {/* ===== 2 · PREFERENSI — tampilan & ritme ===== */}
        <m.div variants={slideInRow} className="mt-8">
          <RutinaSectionHeader
            title="Preferensi"
            description="Tampilan & ritme harianmu"
          />
        </m.div>
        <m.section
          id="profil-preferensi"
          variants={slideInRow}
          aria-label="Preferensi aplikasi"
          className="mt-3 scroll-mt-4 overflow-hidden rounded-xl border border-border bg-surface-primary shadow-soft"
        >
          <div className="divide-y divide-border-default">
            {/* Mode gelap — Switch (next-themes; satu sumber tema). */}
            <SettingRow
              icon={dark ? Moon : Sun}
              label="Mode gelap"
              description="Palet espresso yang tenang untuk malam hari"
              control={
                <Switch
                  checked={dark}
                  onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')}
                  aria-label="Mode gelap"
                />
              }
            />

            {/* Bahasa — preferensi saat ini ditampilkan sebagai informasi
                statis (review v2.13): menu interaktif dengan pilihan yang
                belum benar-benar berfungsi memberi kesan ada pengaturan
                yang bisa diubah. Menu dikembalikan saat multi-bahasa
                benar-benar tersedia. */}
            <SettingRow
              icon={Globe}
              label="Bahasa"
              description="Bahasa antarmuka aplikasi"
              control={
                <>
                  Indonesia
                  <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-eyebrow font-semibold uppercase tracking-wide text-content-muted">
                    aktif
                  </span>
                </>
              }
            />

            {/* Pengingat kebiasaan — jujur tanpa saklar palsu: jam pengingat
                memang diatur per kebiasaan, maka baris ini mengantar ke
                layar Kebiasaan (tempat suntingan misi menyediakan pilihan
                jam) sambil menampilkan jumlah nyata yang aktif. */}
            <SettingRow
              icon={Bell}
              label="Pengingat kebiasaan"
              description={`${reminderCount} dari ${habits.length} kebiasaan memakai jam pengingat`}
              onClick={() => setScreen('kebiasaan')}
              control={<ChevronRight aria-hidden="true" className="h-4 w-4 text-content-muted" />}
            />

            {/* Target misi harian — baris yang dapat dikembangkan (slider
                muncul di bawahnya; shadcn Slider). Diletakkan di ujung
                grup: baris biasa dulu, lalu baris yang "tumbuh". */}
            <div>
              <button
                type="button"
                onClick={() => setGoalOpen((v) => !v)}
                aria-expanded={goalOpen}
                aria-controls="preferensi-target-slider"
                className="interactive flex w-full cursor-pointer items-center gap-3.5 px-4 py-3 text-left hover:bg-surface-sunken"
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary"
                >
                  <Target className="h-4 w-4" strokeWidth={2.1} />
                </span>
                <span className="min-w-0 flex-1 py-0.5">
                  <span className="block text-body font-semibold leading-snug text-content-primary">
                    Target Misi Harian
                  </span>
                  <span className="mt-0.5 block text-eyebrow font-medium leading-snug text-content-muted">
                    Berapa misi ingin kamu selesaikan tiap hari?
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-note font-bold tabular-nums text-primary-foreground"
                >
                  {dailyGoal}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className={cn(
                    'h-4 w-4 shrink-0 text-content-muted transition-transform duration-200',
                    goalOpen && 'rotate-90',
                  )}
                />
              </button>
              {goalOpen && (
                <m.div
                  id="preferensi-target-slider"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: motionTokens.duration.fast,
                    ease: motionTokens.easing.standard,
                  }}
                  className="px-4 pb-4 pt-1"
                >
                  <Slider
                    value={[dailyGoal]}
                    onValueChange={(v) => setDailyGoal(v[0])}
                    min={1}
                    max={12}
                    step={1}
                    aria-label="Target misi harian"
                    className="[&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-range]]:bg-primary [&_[data-slot=slider-thumb]]:border-primary [&_[data-slot=slider-thumb]]:bg-surface-primary"
                  />
                  <div className="mt-2 flex justify-between text-eyebrow font-semibold text-content-muted">
                    <span>Santai (1)</span>
                    <span>Seimbang (6)</span>
                    <span>Produktif (12)</span>
                  </div>
                </m.div>
              )}
            </div>
          </div>
        </m.section>

        {/* ===== 3 · DATA & PENYIMPANAN — grup tersendiri ===== */}
        <m.div variants={slideInRow} className="mt-8">
          <RutinaSectionHeader
            title="Data &amp; Penyimpanan"
            description={`${habits.length} kebiasaan · ${notes.length} catatan · ${txs.length} transaksi — milikmu sepenuhnya`}
          />
        </m.div>
        <m.section
          id="profil-data"
          variants={slideInRow}
          aria-label="Data dan penyimpanan"
          className="mt-3 overflow-hidden rounded-xl border border-border bg-surface-primary shadow-soft"
        >
          <div className="divide-y divide-border-default">
            {/* Ekspor cadangan — satu pintu, dua pilihan format. Unduhan
                dipicu dari dialog agar baris grup tetap ringkas (audit 2g). */}
            <SettingRow
              icon={FileDown}
              label="Ekspor cadangan"
              description="Unduh salinan data — JSON lengkap atau CSV transaksi"
              onClick={() => setExportOpen(true)}
              control={<ChevronRight aria-hidden="true" className="h-4 w-4 text-content-muted" />}
            />
            {/* Pulihkan cadangan — baris label membungkus input berkas
                sr-only (ketuk di mana pun pada baris untuk memilih). */}
            <SettingRow
              icon={Upload}
              label="Pulihkan dari cadangan"
              description="Impor berkas JSON — mengganti seluruh data saat ini"
              htmlFor="import-backup"
              control={
                importing ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin text-content-muted"
                      aria-hidden="true"
                    />
                    Memulihkan…
                  </>
                ) : (
                  <ChevronRight aria-hidden="true" className="h-4 w-4 text-content-muted" />
                )
              }
            />
            <SettingRow
              icon={CloudDownload}
              label="Tarik ulang dari cloud"
              description="Muat snapshot terbaru dari Turso ke perangkat ini"
              onClick={() => void handleForcePull()}
              disabled={pulling}
              control={
                pulling ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin text-content-muted"
                      aria-hidden="true"
                    />
                    Menarik…
                  </>
                ) : (
                  <ChevronRight aria-hidden="true" className="h-4 w-4 text-content-muted" />
                )
              }
            />
          </div>
          <input
            id="import-backup"
            type="file"
            accept="application/json,.json"
            className="sr-only"
            disabled={importing}
            onChange={handleImportFile}
          />
        </m.section>

        {/* Info sinkron hidup — keadaan nyata dari engine (bukan statis):
            menyiapkan / menyinkronkan / tersinkron + jam / offline / gagal.
            v2.33: disembunyikan di xl+ — kartu sync sudah tampil di rail
            konteks (hindari duplikasi serentak, audit shell). */}
        <m.div variants={slideInRow} className="mt-3 xl:hidden">
          <SyncStatusCard variant="rail" />
        </m.div>

        {/* Dialog ekspor — dua pilihan format dengan penjelasan isi
            masing-masing; unduhan + toast dipicu dari sini. */}
        <RutinaDialog
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          label="Ekspor cadangan"
          className="max-w-[320px] p-6 sm:max-w-[320px]"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-content-secondary">
            <FileDown className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-center text-lead font-bold tracking-tight text-content-primary">
            Ekspor cadangan
          </h2>
          <p className="mt-1 text-center text-note leading-relaxed text-content-muted">
            Pilih format salinan yang ingin kamu simpan di luar aplikasi.
          </p>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => {
                setExportOpen(false)
                downloadJsonBackup()
              }}
              className="interactive flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-primary px-4 py-3 text-left hover:bg-surface-sunken"
            >
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary"
              >
                <FileJson className="h-4 w-4" strokeWidth={2.1} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold text-content-primary">
                  Cadangan JSON
                </span>
                <span className="mt-0.5 block text-eyebrow font-medium leading-snug text-content-muted">
                  Salinan penuh — kebiasaan, catatan, transaksi, histori
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setExportOpen(false)
                downloadCsv()
              }}
              className="interactive flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-primary px-4 py-3 text-left hover:bg-surface-sunken"
            >
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary"
              >
                <FileSpreadsheet className="h-4 w-4" strokeWidth={2.1} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold text-content-primary">
                  Transaksi (CSV)
                </span>
                <span className="mt-0.5 block text-eyebrow font-medium leading-snug text-content-muted">
                  {txs.length} transaksi — untuk spreadsheet &amp; pembukuan
                </span>
              </span>
            </button>
          </div>
        </RutinaDialog>

        {/* ===== 4 · ZONA KRITIS — dipisahkan dari pengaturan umum ===== */}
        <m.div variants={slideInRow} className="mt-10">
          <RutinaSectionHeader
            title="Zona Kritis"
            description="Tindakan permanen — sengaja jauh dari pengaturan harian"
          />
        </m.div>
        <m.section
          id="profil-zona"
          variants={slideInRow}
          aria-label="Zona kritis"
          className="mt-3 rounded-xl border border-destructive/30 bg-surface-primary p-4 shadow-soft"
        >
          <div className="flex items-center gap-3.5 px-0.5 py-1">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay/20 text-content-danger"
            >
              <TriangleAlert className="h-4 w-4" strokeWidth={2.1} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold text-content-primary">
                Mulai dari awal
              </p>
              <p className="mt-0.5 text-eyebrow font-medium leading-snug text-content-muted">
                Menghapus semua kebiasaan, histori, catatan, dan transaksi —
                dari perangkat &amp; cloud, permanen.
              </p>
            </div>
          </div>
          {/* v2.33: konfirmasi reset kini RutinaDialog dalam bingkai
              (konsisten dengan dialog ekspor/tentang; sebelumnya
              AlertDialog terportal yang lolos dari bingkai desktop). */}
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="interactive mt-3 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-surface-primary text-note font-bold text-content-danger hover:bg-destructive/10"
          >
            <RotateCcw className="h-4 w-4" />
            Mulai dari awal
          </button>
          <RutinaDialog
            open={resetOpen}
            onClose={() => setResetOpen(false)}
            label="Hapus semua data"
            className="max-w-[320px] p-6"
          >
            <h2 className="text-section-lg font-bold tracking-tight text-content-primary">
              Hapus semua data?
            </h2>
            <p className="mt-2 text-note leading-relaxed text-content-muted">
              Seluruh kebiasaan, histori, catatan, transaksi, dan tujuan
              tabungan akan dihapus permanen — dari perangkat ini dan
              penyimpanan cloud. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setResetOpen(false)}
                className="interactive h-10 flex-1 cursor-pointer rounded-full border border-border-strong text-note font-bold text-content-secondary hover:bg-surface-sunken"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  useRutina.getState().startFresh()
                  setResetOpen(false)
                  toast.success('Aplikasi direset — mulailah dari nol.')
                }}
                className="interactive h-10 flex-1 cursor-pointer rounded-full border-none bg-destructive text-note font-bold text-destructive-foreground hover:bg-destructive/90"
              >
                Ya, hapus
              </button>
            </div>
          </RutinaDialog>
        </m.section>

        {/* ===== 5 · APLIKASI & BANTUAN — paling bawah ===== */}
        <m.div variants={slideInRow} className="mt-8">
          <RutinaSectionHeader
            title="Aplikasi &amp; Bantuan"
            description="Pemasangan, pertanyaan umum, dan tentang Rutina"
          />
        </m.div>
        <m.section
          id="profil-bantuan"
          variants={slideInRow}
          aria-label="Aplikasi dan bantuan"
          className="mt-3 overflow-hidden rounded-xl border border-border bg-surface-primary shadow-soft"
        >
          <div className="divide-y divide-border-default">
            {appInstalled ? (
              <SettingRow
                icon={MonitorSmartphone}
                label="Pasang di perangkat"
                description="Sudah terpasang — kamu menjalankan versi aplikasinya"
                control={
                  <>
                    <Check
                      className="h-4 w-4 text-success"
                      aria-hidden="true"
                    />
                    Terpasang
                  </>
                }
              />
            ) : (
              <SettingRow
                icon={MonitorSmartphone}
                label="Pasang di perangkat"
                description="Aplikasi mandiri (PWA) — layar penuh, bekerja offline"
                onClick={() => void handleInstall()}
                control={
                  installPrompt ? (
                    <ChevronRight
                      aria-hidden="true"
                      className="h-4 w-4 text-content-muted"
                    />
                  ) : (
                    <Plus className="h-4 w-4 text-content-muted" aria-hidden="true" />
                  )
                }
              />
            )}
            <SettingRow
              icon={Info}
              label="Tentang Rutina"
              description="Versi, teknologi, dan nilai produk"
              onClick={() => setAboutOpen(true)}
              control={<ChevronRight aria-hidden="true" className="h-4 w-4 text-content-muted" />}
            />
          </div>
        </m.section>

        {/* Pertanyaan umum (shadcn Accordion) */}
        <m.section
          variants={slideInRow}
          aria-label="Pertanyaan umum"
          className="mt-3 rounded-xl border border-border bg-surface-primary px-4 shadow-soft"
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

        </div>
        </div>

        {/* Tentang — RutinaDialog: tetap di dalam bingkai ponsel
            (shadcn Dialog di-portal ke body dan lolos dari bingkai
            di desktop). */}
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

      {/* Penutup — teks versi, sekaligus pemicu easter egg developer
          (ketuk 5× dalam 2 detik untuk membuka papan sistem desain). */}
      <button
        type="button"
        onClick={handleVersionTap}
        aria-label="Rutina 2.0 Kebun Kebiasaan"
        className="interactive mt-8 block w-full cursor-pointer text-center text-eyebrow font-medium uppercase tracking-[0.14em] text-content-muted"
      >
        Rutina 2.0 · Kebun Kebiasaan
      </button>
    </div>
  )
}
