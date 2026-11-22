'use client'

import {
  ChevronRight,
  CloudCheck,
  CloudOff,
  KeyRound,
  Loader2,
  RefreshCw,
  Satellite,
  SatelliteDish,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import * as m from 'motion/react-m'

import { motionTokens } from '@/lib/motion/tokens'
import { retrySync, useSyncStatus, type SyncKind } from './sync-engine'
import { useRutina } from './store'

/* ===== Kartu status sinkronisasi (v2.23) =====
   Satu sumber tampilan untuk DUA tempat: bilah sisi desktop (varian
   `sidebar` — kartu horizontal ringkas) dan rail konteks Profil (varian
   `rail` — RutinaCard dengan tombol coba lagi). Keadaan mengalir dari
   syncStatusStore (useSyncStatus) — bukan teks statis, sehingga pengguna
   selalu tahu apakah jurnal, transaksi, dan kebiasaannya benar-benar
   sudah aman di cloud. */

/** "HH.MM" gaya Indonesia (pemisah titik) dari stempel waktu. */
function clockID(ts: number): string {
  return new Date(ts).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface KindView {
  icon: LucideIcon
  /** Kelas lingkaran ikon. */
  tint: string
  title: string
  subtitle: (lastSyncedAt: number | null) => string
  /** Ikon berputar (keadaan sibuk). */
  spin?: boolean
}

const KIND_VIEW: Record<SyncKind, KindView> = {
  boot: {
    icon: SatelliteDish,
    tint: 'bg-cocoa/10 text-content-secondary',
    title: 'Menyiapkan',
    subtitle: () => 'Menghubungi cloud…',
  },
  syncing: {
    icon: Loader2,
    tint: 'bg-primary/15 text-primary',
    title: 'Menyinkronkan',
    subtitle: () => 'Perubahan sedang dikirim ke cloud',
    spin: true,
  },
  synced: {
    icon: CloudCheck,
    tint: 'bg-primary/15 text-success',
    title: 'Tersinkron',
    subtitle: (last) =>
      last != null
        ? `Data terakhir disinkronkan pukul ${clockID(last)}`
        : 'Data tersimpan otomatis',
  },
  offline: {
    icon: CloudOff,
    tint: 'bg-cocoa/10 text-content-muted',
    title: 'Offline',
    subtitle: () => 'Tersimpan di perangkat — menunggu koneksi',
  },
  error: {
    icon: TriangleAlert,
    tint: 'bg-destructive/10 text-content-danger',
    title: 'Sinkronisasi gagal',
    subtitle: () => 'Data belum terkirim ke cloud',
  },
  /* v2.62 — server menolak 401: panduan perbaikan menetap dari
     sync-engine (`message`), bukan teks generik; ikon kunci menegaskan
     ini persoalan konfigurasi, bukan jaringan. */
  rejected: {
    icon: KeyRound,
    tint: 'bg-destructive/10 text-content-danger',
    title: 'Ditolak server',
    subtitle: () => 'Konfigurasi token sinkronisasi belum tepat',
  },
}

/** Tombol "Coba lagi" — muncul pada keadaan gagal & offline. */
function RetryButton({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={retrySync}
      className={`interactive mt-3 flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface-primary text-note font-semibold text-content-primary hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 ${className}`}
    >
      <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.2} />
      Coba lagi
    </button>
  )
}

export function SyncStatusCard({
  variant = 'sidebar',
}: {
  variant?: 'sidebar' | 'rail'
}) {
  const { kind, lastSyncedAt, message } = useSyncStatus()
  const view = KIND_VIEW[kind]
  /* v2.62: 'rejected' membawa panduan spesifik dari sync-engine —
     tampilkan itu alih-alih subjudul generik. */
  const subtitle =
    kind === 'rejected' && message ? message : view.subtitle(lastSyncedAt)
  const retryable = kind === 'error' || kind === 'offline' || kind === 'rejected'

  if (variant === 'sidebar') {
    return (
      <div className="rounded-xl border border-border bg-surface-secondary/60 p-3.5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${view.tint}`}
          >
            <view.icon
              className={`h-[18px] w-[18px] ${view.spin ? 'animate-spin' : ''}`}
              strokeWidth={2}
            />
          </span>
          <span className="min-w-0">
            <span className="block text-note font-semibold leading-tight text-content-primary">
              {view.title}
            </span>
            <span className="mt-0.5 block text-eyebrow font-medium leading-snug text-content-muted">
              {subtitle}
            </span>
          </span>
        </div>
        {retryable && <RetryButton />}
      </div>
    )
  }

  /* Varian rail (Profil) — RutinaCard + baris metrik + aksi. */
  return (
    <div className="rounded-xl border border-border-default bg-surface-primary p-4">
      <p className="text-eyebrow font-semibold uppercase tracking-[0.12em] text-content-muted">
        Sinkronisasi
      </p>
      <div
        className="mt-3.5 flex items-center gap-3"
        role="status"
        aria-live="polite"
      >
        <span
          aria-hidden="true"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${view.tint}`}
        >
          <view.icon
            className={`h-[18px] w-[18px] ${view.spin ? 'animate-spin' : ''}`}
            strokeWidth={2.1}
          />
        </span>
        <span className="min-w-0">
          <span className="block text-body font-bold leading-tight text-content-primary">
            {view.title}
          </span>
          <span className="mt-0.5 block text-eyebrow font-medium leading-snug text-content-muted">
            {subtitle}
          </span>
        </span>
      </div>
      {retryable && <RetryButton />}
      <p className="mt-3 flex items-center gap-1.5 text-eyebrow font-medium leading-relaxed text-content-muted">
        <Satellite
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0"
          strokeWidth={2}
        />
        Cloud Turso menyimpan snapshot penuh — perangkat tetap aman offline.
      </p>
    </div>
  )
}

/* ===== Strip status sinkronisasi mobile (v2.74, audit PWA P1) =====
   Sebelumnya status sinkron HANYA terlihat di bilah sisi desktop dan
   rail Profil — pengguna ponsel yang offline/tidak sinkron tidak tahu
   apa-apa sampai membuka Profil (terverifikasi saat uji offline: layar
   Beranda tanpa indikator apa pun). Strip pasif di atas navigasi bawah
   ini muncul HANYA untuk keadaan yang butuh disadari (offline / error /
   rejected) — synced & syncing tetap senyap agar tidak berisik. */

const STRIP_VIEW: Record<
  'offline' | 'error' | 'rejected',
  { short: string; action: 'none' | 'retry' | 'profil' }
> = {
  offline: {
    short: 'Offline — data aman di perangkat, menunggu koneksi',
    action: 'none',
  },
  error: {
    short: 'Perubahan belum tersinkron — ketuk untuk coba lagi',
    action: 'retry',
  },
  rejected: {
    short: 'Sinkronisasi ditolak — ketuk untuk panduan di Profil',
    action: 'profil',
  },
}

export function SyncStatusStrip() {
  const kind = useSyncStatus().kind
  const setScreen = useRutina((s) => s.setScreen)

  const active =
    kind === 'offline' || kind === 'error' || kind === 'rejected'
      ? STRIP_VIEW[kind]
      : null
  if (!active) return null
  const view = KIND_VIEW[kind]
  const tappable = active.action !== 'none'

  const body = (
    <>
      <span
        aria-hidden="true"
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${view.tint}`}
      >
        <view.icon className="h-4 w-4" strokeWidth={2.1} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-note font-bold leading-tight text-content-primary">
          {view.title}
        </span>
        <span className="mt-0.5 block text-eyebrow font-medium leading-snug text-content-muted">
          {active.short}
        </span>
      </span>
      {tappable && (
        <ChevronRight
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-content-muted"
        />
      )}
    </>
  )

  /* Keadaan interaktif dirender sebagai tombol (target ≥44px);
     offline bersifat informasional — div status pasif. */
  if (!tappable) {
    return (
      <m.div
        role="status"
        aria-live="polite"
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={motionTokens.preset.chipReveal}
        className="flex min-h-[52px] items-center gap-3 border-t border-border-default bg-surface-secondary px-4 py-2 lg:hidden"
      >
        {body}
      </m.div>
    )
  }
  return (
    <m.button
      type="button"
      role="status"
      aria-live="polite"
      onClick={() =>
        active.action === 'retry' ? retrySync() : setScreen('profil')
      }
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={motionTokens.preset.chipReveal}
      className="interactive flex min-h-[52px] w-full cursor-pointer items-center gap-3 border-t border-border-default bg-surface-secondary px-4 py-2 text-left transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
    >
      {body}
    </m.button>
  )
}
