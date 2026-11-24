'use client'

import * as m from 'motion/react-m'
import {
  BookOpen,
  Dumbbell,
  Home,
  Plus,
  Sprout,
  Wallet,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'

import { motionTokens } from '@/lib/motion/tokens'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { dailyQuote, todayISO, useRutina, type Screen } from './store'
import { retrySync, useSyncStatus } from './sync-engine'
import { useQuickHub } from './quick-action-hub'
import { playfair } from './serif'

/* Navigasi desktop — v3.1 Calm Editorial (adaptasi Figma Make, 100% sama):
   bilah sisi forest green dengan wordmark serif cream, tagline
   "A LITTLE BETTER, EVERY DAY", label RUANG HIDUPMU, enam item nav dalam
   urutan mock (Beranda, Kebiasaan, Bugar, Keuangan, Jurnal, Statistik —
   Profil melalui avatar topbar), pil aktif sage pucat, tombol pinggir
   "+ Catat sesuatu", dan kartu kutipan harian di dasar.

   Pintasan keyboard 1-7 tetap hidup (1-6 nav + 7 Profil), sejajar
   SHORTCUT_SCREENS di app-frame. */

const NAV_ITEMS: { id: Screen; label: string; icon: LucideIcon }[] = [
  { id: 'beranda', label: 'Beranda', icon: Home },
  { id: 'kebiasaan', label: 'Kebiasaan', icon: Sprout },
  { id: 'bugar', label: 'Bugar', icon: Dumbbell },
  { id: 'keuangan', label: 'Keuangan', icon: Wallet },
  { id: 'jurnal', label: 'Jurnal', icon: BookOpen },
  { id: 'statistik', label: 'Statistik', icon: BarChart3 },
]

/* Peta nomor pintasan — index+1 mengikuti urutan nav; Profil (tanpa item
   nav) mendapat slot 7 agar total tetap 1-7 seperti sebelumnya. */
const SHORTCUT_INDEX: Partial<Record<Screen, number>> = Object.fromEntries(
  NAV_ITEMS.map((item, i) => [item.id, i + 1] as const),
)
SHORTCUT_INDEX.profil = 7

/** Ikon status sinkronisasi ringkas — titik warna + label pendek. */
function SyncSlim() {
  const { kind } = useSyncStatus()
  const retryable = kind === 'error' || kind === 'offline' || kind === 'rejected'
  const dot =
    kind === 'synced'
      ? 'bg-sage-pale'
      : kind === 'syncing' || kind === 'boot'
        ? 'bg-tan animate-pulse-soft'
        : 'bg-rust'
  const label =
    kind === 'synced'
      ? 'Tersinkron cloud'
      : kind === 'syncing' || kind === 'boot'
        ? 'Menyinkronkan…'
        : kind === 'offline'
          ? 'Offline — tersimpan lokal'
          : 'Sinkronisasi tertunda'

  return (
    <button
      type="button"
      onClick={retryable ? () => void retrySync() : undefined}
      aria-label={`Status sinkronisasi: ${label}${retryable ? ' — ketuk untuk coba lagi' : ''}`}
      className="group/sync flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-cream-text/8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      <span className="text-eyebrow font-medium tracking-wide text-cream-text/55 transition-colors group-hover/sync:text-cream-text/80">
        {label}
      </span>
    </button>
  )
}

/**
 * Bilah sisi desktop (lg+) — identitas Calm Editorial: forest green
 * penuh tinggi, cream text. Di bawah lg seluruh bilah disembunyikan;
 * navigasi kembali ke tab bawah ponsel.
 */
export function DesktopSidebar() {
  const screen = useRutina((s) => s.screen)
  const setScreen = useRutina((s) => s.setScreen)
  const openHub = useQuickHub((s) => s.openHub)
  const quote = dailyQuote(todayISO())

  return (
    <m.nav
      aria-label="Navigasi utama"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={motionTokens.preset.pageEntrance}
      className="hidden h-full w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex"
    >
      {/* Wordmark — lingkaran cream + kecambah, "rutina." serif, tagline. */}
      <div className="flex items-center gap-3 px-6 pb-1 pt-7">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-text"
        >
          <Sprout className="h-5 w-5 text-forest" strokeWidth={2.2} />
        </span>
        <span className="min-w-0">
          <p className={`${playfair.className} text-xl font-bold leading-none tracking-tight text-cream-text`}>
            rutina<span className="text-sage">.</span>
          </p>
          <p className="mt-1.5 text-[9px] font-semibold uppercase leading-none tracking-[0.18em] text-cream-text/45">
            A little better, every day
          </p>
        </span>
      </div>

      {/* Daftar navigasi — tooltip nama layar + hint pintasan keyboard. */}
      <TooltipProvider delayDuration={350}>
        <p className="mt-7 px-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream-text/40">
          Ruang hidupmu
        </p>
        <ul className="mt-2 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3">
          {NAV_ITEMS.map((item) => {
            const active = screen === item.id
            return (
              <li key={item.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setScreen(item.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex w-full cursor-pointer items-center gap-3 rounded-full px-4 py-2.5 text-left outline-offset-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sidebar-ring ${
                        active
                          ? 'text-forest-ink'
                          : 'text-cream-text/75 hover:bg-cream-text/8 hover:text-cream-text'
                      }`}
                    >
                      {active && (
                        <m.span
                          layoutId="nav-pill-desktop"
                          aria-hidden="true"
                          className="absolute inset-0 rounded-full bg-sidebar-primary"
                          transition={motionTokens.spring.snappy}
                        />
                      )}
                      <item.icon
                        aria-hidden="true"
                        className={`relative z-10 h-[18px] w-[18px] shrink-0 transition-colors ${
                          active ? 'text-forest-ink' : 'text-cream-text/60'
                        }`}
                        strokeWidth={active ? 2.4 : 2}
                      />
                      <span
                        className={`relative z-10 text-body transition-colors ${
                          active
                            ? 'font-bold text-forest-ink'
                            : 'font-medium text-cream-text/75'
                        }`}
                      >
                        {item.label}
                      </span>
                      {active && (
                        <span
                          aria-hidden="true"
                          className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-forest-ink/70"
                        />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="rounded-full border-border bg-surface-inverse text-meta font-bold text-content-inverse"
                  >
                    {item.label} · tekan {SHORTCUT_INDEX[item.id]}
                  </TooltipContent>
                </Tooltip>
              </li>
            )
          })}
        </ul>
      </TooltipProvider>

      {/* Tombol catat universal — pil pinggir cream, membuka Quick Hub. */}
      <div className="px-3">
        <button
          type="button"
          onClick={openHub}
          className="interactive flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-cream-text/30 text-body font-semibold text-cream-text transition-colors hover:border-cream-text/60 hover:bg-cream-text/8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
          Catat sesuatu
        </button>
      </div>

      {/* Kartu kutipan harian — forest-deep, kecambah sage, serif italic. */}
      <div className="mt-4 px-3">
        <figure className="rounded-2xl border border-cream-text/12 bg-forest-deep p-4">
          <Sprout className="h-4 w-4 text-sage" strokeWidth={2.2} aria-hidden="true" />
          <blockquote
            className={`${playfair.className} mt-2.5 text-[13px] italic leading-relaxed text-cream-text/85`}
          >
            &ldquo;{quote.text}&rdquo;
          </blockquote>
          <figcaption className="mt-2 text-eyebrow font-medium tracking-wide text-cream-text/45">
            Pengingat kecil untuk hari ini.
          </figcaption>
        </figure>
      </div>

      {/* Status sinkronisasi ringkas + versi. */}
      <div className="px-3 pb-4 pt-2.5">
        <SyncSlim />
        <p className="mt-1 px-2 text-eyebrow font-medium text-cream-text/35">
          Rutina 2.0
        </p>
      </div>
    </m.nav>
  )
}
