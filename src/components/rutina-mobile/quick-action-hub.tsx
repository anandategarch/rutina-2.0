'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, useDragControls } from 'motion/react'
import * as m from 'motion/react-m'
import { create } from 'zustand'
import { Command as CommandPrimitive } from 'cmdk'
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Dumbbell,
  HeartPulse,
  Home,
  PenLine,
  Plus,
  Search,
  SearchX,
  Sprout,
  Target,
  UserRound,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { motionTokens } from '@/lib/motion/tokens'
import { pressSnappy } from '@/lib/motion/transitions'
import { cn } from '@/lib/utils'

import { useCheckInSheet } from './checkin-sheet'
import { formatIDR } from './finance/utils'
import { useFocusTrap } from './use-focus-trap'
import {
  FOLDER_SHORT,
  HABIT_CAT_COLORS,
  useRutina,
  type Habit,
  type Screen,
} from './store'

/* ===== Toko state hub (module-level zustand) =====
   Dipakai bersama oleh FAB, pintasan keyboard (Cmd/Ctrl+K, "/"), dan calon
   pemicu lain (mis. tombol di bilah sisi desktop) — pola toko modul-level
   yang sama dengan journal-ui, tanpa menyentuh store utama. */

interface QuickHubState {
  open: boolean
  openHub: () => void
  closeHub: () => void
  toggleHub: () => void
}

export const useQuickHub = create<QuickHubState>()((set) => ({
  open: false,
  openHub: () => set({ open: true }),
  closeHub: () => set({ open: false }),
  toggleHub: () => set((s) => ({ open: !s.open })),
}))

/* ===== Enam aksi utama — dipakai bersama oleh kisi kartu (kueri kosong)
   dan grup hasil pencarian "Aksi". run() membaca store saat klik sehingga
   selalu memakai aksi terbaru. ===== */

interface HubAction {
  key: string
  /** Label pada kartu kisi (singkat). */
  label: string
  /** Label pada baris hasil pencarian. */
  listLabel: string
  /** Nilai filter cmdk — label + kata kunci pencarian umum. */
  value: string
  icon: LucideIcon
  /** Lingkaran ikon berwarna lembut (tint earth-tone). */
  tint: string
  run: () => void
}

const PRIMARY_ACTIONS: HubAction[] = [
  {
    key: 'habit',
    label: 'Kebiasaan',
    listLabel: 'Kebiasaan baru',
    value: 'kebiasaan baru habit misi tambah',
    icon: Target,
    tint: 'bg-secondary text-success',
    run: () => useRutina.getState().openHabitCreate(),
  },
  {
    key: 'note',
    label: 'Catatan',
    listLabel: 'Catatan baru',
    value: 'catatan baru tulis jurnal menulis',
    icon: PenLine,
    tint: 'bg-surface-secondary text-content-secondary',
    run: () => useRutina.getState().openCompose(),
  },
  {
    key: 'tx',
    label: 'Transaksi',
    listLabel: 'Transaksi baru',
    value: 'transaksi baru catat uang pemasukan pengeluaran keuangan',
    icon: Wallet,
    tint: 'bg-gold/30 text-warning',
    run: () => useRutina.getState().openTxSheet(),
  },
  {
    key: 'workout',
    label: 'Latihan',
    listLabel: 'Catat latihan',
    value: 'latihan baru workout sesi angkat beban olahraga bugar',
    icon: Dumbbell,
    tint: 'bg-clay/25 text-terracotta',
    run: () => useRutina.getState().openWorkoutSheet(),
  },
  {
    key: 'food',
    label: 'Asupan',
    listLabel: 'Catat asupan',
    value: 'asupan makan makanan kalori gizi',
    icon: UtensilsCrossed,
    tint: 'bg-primary/15 text-success',
    run: () => useRutina.getState().openFoodSheet(),
  },
  {
    key: 'checkin',
    label: 'Check-in',
    listLabel: 'Check-in harian',
    value: 'check in suasana hati mood energi tidur',
    icon: HeartPulse,
    tint: 'bg-module-journal/15 text-module-journal-strong',
    run: () => useCheckInSheet.getState().openCheckIn(),
  },
]

/* Item navigasi — melengkapi grup "Aksi" saat mencari. Profil & Jurnal
   ikut terdaftar: keduanya bukan tab bawah, jadi hub menjadi akses global
   yang konsisten dari layar mana pun (rekomendasi review navigasi v2.13). */
const NAV_ITEMS: {
  key: string
  label: string
  value: string
  icon: LucideIcon
  screen: Screen
}[] = [
  { key: 'nav-beranda', label: 'Buka Beranda', value: 'buka beranda utama home', icon: Home, screen: 'beranda' },
  { key: 'nav-bugar', label: 'Buka Bugar', value: 'buka bugar kebugaran fitness', icon: Dumbbell, screen: 'bugar' },
  { key: 'nav-keuangan', label: 'Buka Keuangan', value: 'buka keuangan finansial dompet saldo', icon: Wallet, screen: 'keuangan' },
  { key: 'nav-kebiasaan', label: 'Buka Kebiasaan', value: 'buka kebiasaan habit kebun tanaman', icon: Sprout, screen: 'kebiasaan' },
  { key: 'nav-jurnal', label: 'Buka Jurnal', value: 'buka jurnal catatan notes', icon: BookOpen, screen: 'jurnal' },
  { key: 'nav-statistik', label: 'Buka Statistik', value: 'buka statistik ringkasan progres', icon: BarChart3, screen: 'statistik' },
  { key: 'nav-profil', label: 'Buka Profil & Pengaturan', value: 'buka profil pengaturan settings preferensi akun', icon: UserRound, screen: 'profil' },
]

/* Layar non-tab untuk baris "Jelajahi" pada kisi kosong — bersama
   tombol plus tengah (v2.14), hub menjadi pusat navigasi global. */
const EXPLORE_ITEMS: {
  key: string
  label: string
  icon: LucideIcon
  screen: Screen
}[] = [
  { key: 'ex-statistik', label: 'Statistik', icon: BarChart3, screen: 'statistik' },
  { key: 'ex-jurnal', label: 'Jurnal', icon: BookOpen, screen: 'jurnal' },
  { key: 'ex-profil', label: 'Profil', icon: UserRound, screen: 'profil' },
]

/** Ikon + nada warna nominal per arah arus — selaras layar Keuangan. */
function txVisual(type: string): {
  icon: LucideIcon
  iconClass: string
  amountClass: string
} {
  if (type === 'masuk')
    return {
      icon: ArrowUpRight,
      iconClass: 'text-success',
      amountClass: 'text-success',
    }
  if (type === 'keluar')
    return {
      icon: ArrowDownRight,
      iconClass: 'text-clay',
      amountClass: 'text-content-danger',
    }
  return {
    icon: ArrowLeftRight,
    iconClass: 'text-content-muted',
    amountClass: 'text-content-muted',
  }
}

/** Tampilkan nominal dengan tanda arah arus. */
function txAmountLabel(type: string, amount: number): string {
  if (type === 'masuk') return `+${formatIDR(amount)}`
  if (type === 'keluar') return `−${formatIDR(amount)}`
  return formatIDR(amount)
}

/* ===== Pendeteksi breakpoint sm — panel beralih dari laci bawah (ponsel)
   ke dialog terpusat (desktop). Dicek pasca-mount; default laci bawah. */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return isDesktop
}

/**
 * QuickActionHub — pusat aksi cepat GLOBAL.
 *
 * Satu pintu aksi dari semua layar: enam aksi utama (kebiasaan, catatan,
 * transaksi, latihan, asupan, check-in) dalam kisi kartu, plus pencarian
 * universal (aksi, kebiasaan, catatan, transaksi) bertenagakan cmdk.
 *
 * - Ponsel: laci bawah (rounded-t-sheet, seret-untuk-tutup, max-h 82dvh).
 * - Desktop (sm+): dialog terpusat max-w-md, rounded-2xl, shadow-ink-deep.
 * - Pintasan: Cmd/Ctrl+K membuka/menutup, "/" membuka saat tidak sedang
 *   mengetik. Escape menutup dan fokus kembali ke pemicu.
 * - Terbuka dari FAB global (QuickActionFab) atau pintasan di atas.
 */
export function QuickActionHub() {
  const open = useQuickHub((s) => s.open)
  const closeHub = useQuickHub((s) => s.closeHub)
  const habits = useRutina((s) => s.habits)
  const notes = useRutina((s) => s.notes)
  const txs = useRutina((s) => s.txs)

  const isDesktop = useIsDesktop()
  const [query, setQuery] = useState('')
  const [prevOpen, setPrevOpen] = useState(false)
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  /* Reset kueri setiap kali hub dibuka — kisi enam aksi selalu tampil
     dahulu (pola draf reset render-time, sama seperti FoodSheet). */
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setQuery('')
  }

  /* Pintasan global: Cmd/Ctrl+K toggle, "/" buka (saat tidak mengetik). */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        useQuickHub.getState().toggleHub()
        return
      }
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = e.target
        if (
          t instanceof HTMLElement &&
          (t.tagName === 'INPUT' ||
            t.tagName === 'TEXTAREA' ||
            t.tagName === 'SELECT' ||
            t.isContentEditable)
        ) {
          return
        }
        if (useQuickHub.getState().open) return
        e.preventDefault()
        useQuickHub.getState().openHub()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  /* Escape menutup hub. */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeHub()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeHub])

  /* Fokus: trap penuh + pengembalian fokus ke pemicu saat ditutup
     (v2.16, audit T5-d #1 — sebelumnya satu-satunya dialog tanpa trap:
     Tab bisa lolos ke konten di belakang modal). Panel difokuskan awal
     agar papan ketik ponsel tidak menutupi kisi; desktop menindihnya
     dengan langsung memfokuskan bidang cari. */
  useFocusTrap(open, panelRef, { initialFocus: 'panel' })
  useEffect(() => {
    if (!open || !isDesktop) return
    inputRef.current?.focus({ preventScroll: true })
  }, [open, isDesktop])

  const q = query.trim().toLowerCase()

  /* Kebiasaan aktif (non-arsip) yang bisa dicari. */
  const liveHabits = useMemo(
    () => habits.filter((h) => !h.archived),
    [habits],
  )

  /* Transaksi: pra-filter judul/kategori lalu 6 terbaru — cmdk memfilter
     ulang item yang dipasang, hasilnya tetap konsisten. */
  const txMatches = useMemo(() => {
    if (!q) return []
    return [...txs]
      .filter(
        (t) =>
          t.note.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q),
      )
      .sort((a, b) =>
        a.ts === b.ts ? b.id.localeCompare(a.id) : a.ts < b.ts ? 1 : -1,
      )
      .slice(0, 6)
  }, [q, txs])

  /* Pola onSelect: tutup hub dulu, jalankan aksi sesudahnya. */
  const run = (fn: () => void) => {
    closeHub()
    fn()
  }

  const openHabit = (id: string) =>
    run(() => {
      const s = useRutina.getState()
      s.setScreen('beranda')
      s.openHabitEdit(id)
    })

  /* Animasi panel mengikuti mode presentasi. */
  const panelAnim = isDesktop
    ? {
        initial: { opacity: 0, scale: 0.96, y: 12 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.97, y: 8 },
      }
    : {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
      }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Latar belakang — ketuk untuk menutup. */}
          <m.div
            key="hub-backdrop"
            aria-hidden="true"
            onClick={closeHub}
            className="absolute inset-0 z-[65] bg-espresso/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.duration.fast }}
          />

          {/* Lapisan penempatan — ponsel: bawah; desktop: tengah.
              pointer-events-none agar ketukan lewat ke latar belakang. */}
          <div
            key="hub-layer"
            className="pointer-events-none absolute inset-0 z-[66] flex items-end justify-center sm:items-center sm:p-6"
          >
            <m.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Aksi cepat"
              tabIndex={-1}
              drag="y"
              dragListener={false}
              dragControls={dragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.55 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 600) closeHub()
              }}
              initial={panelAnim.initial}
              animate={panelAnim.animate}
              exit={panelAnim.exit}
              transition={
                isDesktop
                  ? {
                      duration: motionTokens.duration.fast,
                      ease: motionTokens.easing.entrance,
                    }
                  : motionTokens.spring.sheet
              }
              className="pointer-events-auto flex max-h-[82dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-sheet bg-surface-primary shadow-sheet sm:max-h-[560px] sm:max-w-md sm:rounded-2xl sm:shadow-ink-deep"
            >
              {/* Pegangan seret — hanya ponsel. */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing sm:hidden"
                aria-hidden="true"
              >
                <span className="h-1.5 w-10 rounded-full bg-cocoa/15" />
              </div>

              <Command className="h-auto min-h-0 flex-1 rounded-none bg-transparent">
                {/* Bidang cari */}
                <div className="flex items-center gap-2.5 border-b border-border px-5 py-3">
                  <Search
                    className="h-[18px] w-[18px] shrink-0 text-content-muted"
                    aria-hidden="true"
                  />
                  <CommandPrimitive.Input
                    ref={inputRef}
                    value={query}
                    onValueChange={setQuery}
                    placeholder="Cari aksi, catatan, kebiasaan…"
                    aria-label="Cari aksi, catatan, kebiasaan, atau transaksi"
                    /* outline-none tanpa pengganti membuat fokus keyboard
                       tak terlihat — ring halus di dalam baris cari. */
                    className="h-6 w-full bg-transparent text-section font-medium text-content-primary outline-none placeholder:font-normal placeholder:text-content-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                  />
                </div>

                {/* Kisi enam aksi utama — hanya saat kueri kosong. */}
                <AnimatePresence initial={false}>
                  {q === '' && (
                    <m.div
                      key="action-grid"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        duration: motionTokens.duration.fast,
                        ease: motionTokens.easing.smooth,
                      }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-3 gap-2.5 px-5 pb-2 pt-4">
                        {PRIMARY_ACTIONS.map((a, i) => (
                          <m.button
                            key={a.key}
                            type="button"
                            onClick={() => run(a.run)}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              ...motionTokens.spring.snappy,
                              delay: i * 0.03,
                            }}
                            whileTap={{
                              scale: 0.96,
                              transition: motionTokens.spring.snappy,
                            }}
                            className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-border bg-surface-primary px-1 py-3.5 outline-none transition-colors duration-150 hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            <span
                              className={cn(
                                'flex h-11 w-11 items-center justify-center rounded-full',
                                a.tint,
                              )}
                            >
                              <a.icon className="h-5 w-5" strokeWidth={2.1} />
                            </span>
                            <span className="text-meta font-bold leading-none text-content-primary">
                              {a.label}
                            </span>
                          </m.button>
                        ))}
                      </div>

                      {/* Jelajahi — pintu layar non-tab (v2.14: tab bawah
                          kini 4 item + plus tengah; Statistik, Jurnal &
                          Profil dijangkau dari sini tanpa mengetik). */}
                      <div className="border-t border-border px-5 py-3">
                        <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
                          Jelajahi
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {EXPLORE_ITEMS.map((item) => (
                            <m.button
                              key={item.key}
                              type="button"
                              onClick={() =>
                                run(() =>
                                  useRutina.getState().setScreen(item.screen),
                                )
                              }
                              whileTap={{
                                scale: 0.94,
                                transition: pressSnappy,
                              }}
                              className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface-sunken px-3.5 text-meta font-semibold text-content-secondary transition-colors hover:border-primary/35 hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                              <item.icon
                                className="h-3.5 w-3.5"
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                              {item.label}
                            </m.button>
                          ))}
                        </div>
                      </div>

                      <p className="px-5 pb-4 pt-1.5 text-center text-meta font-medium text-content-muted">
                        Ketik untuk mencari di seluruh aplikasi
                      </p>
                    </m.div>
                  )}
                </AnimatePresence>

                {/* Hasil pencarian — hanya saat kueri terisi. */}
                {q !== '' && (
                  <CommandList className="no-scrollbar min-h-0 max-h-none flex-1 overscroll-contain px-2 py-2">
                    <CommandGroup heading="Aksi">
                      {PRIMARY_ACTIONS.map((a) => (
                        <CommandItem
                          key={a.key}
                          value={a.value}
                          onSelect={() => run(a.run)}
                          className="rounded-lg py-2.5 text-body"
                        >
                          <a.icon aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate">
                            {a.listLabel}
                          </span>
                          <span className="ml-2 shrink-0 text-eyebrow font-semibold text-content-muted">
                            Aksi
                          </span>
                        </CommandItem>
                      ))}
                      {NAV_ITEMS.map((item) => (
                        <CommandItem
                          key={item.key}
                          value={item.value}
                          onSelect={() =>
                            run(() =>
                              useRutina.getState().setScreen(item.screen),
                            )
                          }
                          className="rounded-lg py-2.5 text-body"
                        >
                          <item.icon aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate">
                            {item.label}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>

                    {liveHabits.length > 0 && (
                      <CommandGroup heading="Kebiasaan">
                        {liveHabits.map((h: Habit) => (
                          <CommandItem
                            key={h.id}
                            value={`${h.title} ${h.cat}`}
                            onSelect={() => openHabit(h.id)}
                            className="rounded-lg py-2.5 text-body"
                          >
                            <span
                              aria-hidden="true"
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: HABIT_CAT_COLORS[h.cat] }}
                            />
                            <span className="min-w-0 flex-1 truncate">
                              {h.title}
                            </span>
                            <span className="ml-2 shrink-0 text-eyebrow font-semibold text-content-muted">
                              {h.cat}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {notes.length > 0 && (
                      <CommandGroup heading="Catatan">
                        {notes.map((n) => (
                          <CommandItem
                            key={n.id}
                            value={`${n.title} ${FOLDER_SHORT[n.folder]}`}
                            onSelect={() =>
                              run(() => useRutina.getState().openReading(n.id))
                            }
                            className="rounded-lg py-2.5 text-body"
                          >
                            <PenLine aria-hidden="true" />
                            <span className="min-w-0 flex-1 truncate">
                              {n.title}
                            </span>
                            <span className="ml-2 shrink-0 text-eyebrow font-semibold text-content-muted">
                              {FOLDER_SHORT[n.folder]}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {txMatches.length > 0 && (
                      <CommandGroup heading="Transaksi">
                        {txMatches.map((t) => {
                          const v = txVisual(t.type)
                          return (
                            <CommandItem
                              key={t.id}
                              value={`${t.note} ${t.cat}`}
                              onSelect={() =>
                                run(() =>
                                  useRutina.getState().setScreen('keuangan'),
                                )
                              }
                              className="rounded-lg py-2.5 text-body"
                            >
                              <v.icon
                                aria-hidden="true"
                                className={v.iconClass}
                              />
                              <span className="min-w-0 flex-1 truncate">
                                {t.note}
                              </span>
                              <span
                                className={cn(
                                  'ml-2 shrink-0 text-meta font-bold tabular-nums',
                                  v.amountClass,
                                )}
                              >
                                {txAmountLabel(t.type, t.amount)}
                              </span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    )}

                    <CommandEmpty className="py-8">
                      <div className="flex flex-col items-center gap-1.5 text-center">
                        <SearchX
                          className="h-5 w-5 text-content-muted"
                          aria-hidden="true"
                        />
                        <p className="text-body font-semibold text-content-secondary">
                          Tidak ditemukan
                        </p>
                        <p className="text-meta leading-snug text-content-muted">
                          Coba kata lain — aksi, catatan, kebiasaan, atau
                          transaksi.
                        </p>
                      </div>
                    </CommandEmpty>
                  </CommandList>
                )}
              </Command>

              {/* Baris kaki — petunjuk Esc (desktop) + wordmark. */}
              <div className="flex items-center justify-end gap-3 border-t border-border px-5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] pt-2.5 sm:justify-between sm:pb-2.5">
                <p className="hidden text-eyebrow font-semibold text-content-muted sm:block">
                  Esc untuk menutup
                </p>
                <p
                  className="text-eyebrow font-semibold tracking-tight text-content-muted"
                  aria-hidden="true"
                >
                  rutina<span className="text-primary">.</span>
                </p>
              </div>
            </m.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * QuickActionFab — tombol aksi mengambang, KHUSUS DESKTOP (lg+).
 *
 * Di ponsel, pintu aksi cepat berpindah ke tombol plus besar di tengah
 * navigasi bawah (v2.14) — FAB disembunyikan di bawah lg agar tidak
 * ada dua pemicu yang bersaing. Di desktop (tanpa navigasi bawah)
 * FAB tetap menempel sudut kanan-bawah. Ikon Plus berputar 45 derajat
 * menjadi tanda tutup saat hub terbuka. Disembunyikan di layar Profil
 * — konsisten dengan BottomNav.
 */
export function QuickActionFab({ revealed }: { revealed: boolean }) {
  const open = useQuickHub((s) => s.open)
  const toggleHub = useQuickHub((s) => s.toggleHub)
  const screen = useRutina((s) => s.screen)

  return (
    <AnimatePresence>
      {screen !== 'profil' && (
        <m.div
          key="quick-fab"
          className="absolute bottom-6 right-6 z-30 hidden lg:block"
          initial={{ scale: 0, opacity: 0 }}
          /* v2.40: pop FAB digerbang `revealed` — dengan pra-pasang
             cangkang di balik splash, mount tidak lagi sekaligus
             berarti "tampil"; tombol menunggu splash pergi dulu lalu
             muncul dengan spring.snappy (remount pascalayar Profil
             tetap diantar pop, perilaku lama dipertahankan). */
          animate={{ scale: revealed ? 1 : 0, opacity: revealed ? 1 : 0 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={motionTokens.spring.snappy}
        >
          {/* Halo STATIS — penanda "pintu" aksi cepat di belakang tombol
              (animate-glow dihapus — direktif melarang animasi berulang
              dekoratif, pola yang sama dengan daily-highlight-card);
              menghilang saat hub terbuka agar tidak bersaing dengan panel. */}
          <span
            aria-hidden="true"
            className={`absolute -inset-2 rounded-full bg-primary/40 blur-md ${
              open ? 'opacity-0' : 'opacity-100'
            } transition-opacity duration-300`}
          />
          <m.button
            type="button"
            onClick={toggleHub}
            aria-label="Aksi cepat"
            aria-expanded={open}
            aria-haspopup="dialog"
            whileTap={{ scale: 0.92 }}
            transition={motionTokens.spring.snappy}
            className="relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift outline-none transition-colors duration-200 hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <m.span
              aria-hidden="true"
              initial={false}
              animate={{ rotate: open ? 45 : 0 }}
              transition={motionTokens.spring.snappy}
              className="flex"
            >
              <Plus className="h-6 w-6" strokeWidth={2.4} />
            </m.span>
          </m.button>
        </m.div>
      )}
    </AnimatePresence>
  )
}
