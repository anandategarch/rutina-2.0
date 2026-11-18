'use client'

/**
 * Desktop Stage — kebangkitan split screen lama (commit 27713ab,
 * src/components/landing/split-screen.tsx) yang sempat dihapus saat
 * fokus mobile-only. Kini hadir kembali dengan tema earth-tone:
 *
 *   ┌─────────────────┬────────┬──────────────┐
 *   │  Panel Brand    │  Rail  │  Bingkai HP  │
 *   │  (cerita + CTA) │ widget │  (aplikasi)  │
 *   └─────────────────┴────────┴──────────────┘
 *
 * Di bawah lg (1024px) panel & rail disembunyikan dan aplikasi
 * kembali full-bleed seperti sebelumnya — satu instance RutinaApp,
 * tanpa duplikasi state.
 */

import type { ComponentType, ReactNode } from 'react'
import * as m from 'motion/react-m'
import {
  BarChart3,
  BookOpen,
  Check,
  Flame,
  Leaf,
  Timer,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { RutinaApp } from './rutina-app'
import { playfair } from './serif'
import { formatIDRShort } from './finance/utils'
import { motionTokens } from '@/lib/motion/tokens'
import {
  bestStreak,
  dayCounts,
  todayISO,
  useRutina,
} from './store'

const EASE = motionTokens.easing.standard

/* ===== Potongan: kata dengan reveal mask (warisan split-screen lama) ===== */

function Word({
  children,
  delay,
  className = '',
}: {
  children: ReactNode
  delay: number
  className?: string
}) {
  return (
    <span className="-mb-1 block overflow-hidden pb-1">
      <m.span
        className={`block ${className}`}
        initial={{ y: '112%' }}
        animate={{ y: '0%' }}
        transition={{ delay, duration: 0.85, ease: EASE }}
      >
        {children}
      </m.span>
    </span>
  )
}

/* Widget melayang — kartu kecil dengan animasi apung sinar sinambung. */
function FloatWidget({
  icon: Icon,
  value,
  label,
  delay,
  tilt = 0,
  iconClass,
}: {
  icon: LucideIcon
  value: string
  label: string
  delay: number
  tilt?: number
  iconClass: string
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 220, damping: 18 }}
      style={{ rotate: tilt }}
    >
      <m.div
        animate={{ y: [0, -8, 0] }}
        transition={{
          duration: 3.6 + delay,
          repeat: Infinity,
          ease: 'easeInOut',
          delay,
        }}
        className="flex w-full items-center gap-3 rounded-[18px] border border-border bg-surface-primary p-3.5 shadow-lift"
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconClass}`}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-bold leading-tight tabular-nums text-content-primary">
            {value}
          </span>
          <span className="block text-[11px] font-semibold text-content-muted">
            {label}
          </span>
        </span>
      </m.div>
    </m.div>
  )
}

/* Baris fitur dengan centang muncul beruntun. */
function FeatureRow({
  icon: Icon,
  children,
  delay,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  children: ReactNode
  delay: number
}) {
  return (
    <m.li
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5, ease: EASE }}
      className="flex items-center gap-2.5 text-[13.5px] font-medium text-content-secondary"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-success">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
      <Icon className="h-4 w-4 shrink-0 text-content-muted" strokeWidth={2} />
      {children}
    </m.li>
  )
}

/* ===== Panel brand (kiri) ===== */

function BrandPanel() {
  return (
    <aside className="relative hidden w-[38%] max-w-[560px] shrink-0 flex-col justify-between overflow-hidden bg-surface-primary p-10 lg:flex xl:p-14">
      {/* Cahaya ambien earth-tone */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-secondary blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-surface-secondary/80 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-72 w-72 translate-x-1/2 rounded-full bg-secondary/60 blur-3xl" />
      </div>

      {/* Kepala panel */}
      <m.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative flex items-center justify-between"
      >
        <p className="text-[21px] font-bold tracking-tight text-content-primary">
          rutina<span className="text-primary">.</span>
        </p>
        <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-surface-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-success shadow-soft">
          <Leaf className="h-3 w-3" />
          Earth Tone Edition
        </span>
      </m.header>

      {/* Cerita utama */}
      <div className="relative">
        <h1
          className={`${playfair.className} text-[clamp(2.1rem,3vw,3.3rem)] font-semibold leading-[1.08] tracking-tight text-content-primary`}
        >
          <Word delay={0.1}>Kebiasaan kecil,</Word>
          <Word delay={0.22} className="text-matcha-deep">
            perubahan besar.
          </Word>
        </h1>

        <m.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: EASE }}
          className="mt-5 max-w-[400px] text-[14.5px] leading-relaxed text-content-secondary"
        >
          Rutina menyatukan misi harian, jurnal refleksi, keuangan, dan
          analitik dalam satu petualangan XP — dirancang tenang dengan
          palet warna bumi.
        </m.p>

        {/* Fakta jujur — tanpa angka pengguna fiktif */}
        <m.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52, duration: 0.6, ease: EASE }}
          className="mt-7"
        >
          <p className="text-[13px] font-bold text-content-primary">
            Tanpa akun · tanpa iklan
          </p>
          <p className="mt-0.5 text-[12.5px] font-medium text-content-muted">
            Data demo tersimpan lokal di perangkatmu.
          </p>
        </m.div>

        {/* Daftar fitur — satu per tab aplikasi */}
        <ul className="mt-8 space-y-3">
          <FeatureRow icon={Zap} delay={0.62}>
            Misi harian ber-XP, level &amp; bonus konsistensi
          </FeatureRow>
          <FeatureRow icon={BookOpen} delay={0.7}>
            Jurnal refleksi dengan kategori &amp; pencarian
          </FeatureRow>
          <FeatureRow icon={Wallet} delay={0.78}>
            Keuangan: saldo, anggaran &amp; tujuan tabungan
          </FeatureRow>
          <FeatureRow icon={BarChart3} delay={0.86}>
            Analitik suasana hati, fokus &amp; tren
          </FeatureRow>
        </ul>

        {/* Ajakan mencoba */}
        <m.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.05, duration: 0.6 }}
          className="mt-9 flex items-center gap-2 text-[13px] font-bold text-success"
        >
          Coba langsung di sebelah
          <m.span
            animate={{ x: [0, 6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
          >
            →
          </m.span>
        </m.p>
      </div>

      {/* Kaki panel — palet lima tab */}
      <m.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="relative flex items-center justify-between"
      >
        <p className="text-[11px] font-medium text-content-muted">
          © 2025 rutina.app — dibuat dengan sunyi &amp; kopi.
        </p>
        {/* Swatch palet dekoratif — token primitive via CSS variables */}
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {[
            'var(--primary)',
            'var(--destructive)',
            'var(--palette-espresso-soft)',
            'var(--surface-inverse)',
            'var(--palette-gold)',
          ].map((c) => (
            <span
              key={c}
              className="h-3 w-3 rounded-full ring-1 ring-border"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </m.footer>
    </aside>
  )
}

/* ===== Rail widget melayang (tengah) ===== */

function WidgetRail() {
  /* Angka widget dihitung NYATA dari state aplikasi — sama dengan
     yang tampil di dalam bingkai ponsel (satu sumber data). */
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  const txs = useRutina((s) => s.txs)

  const today = todayISO()
  const streak = bestStreak(habits, completions, today).streak
  const weekMissions = dayCounts(completions, today, 7).reduce(
    (a, b) => a + b.count,
    0,
  )
  const saldo = txs.reduce(
    (a, t) => a + (t.type === 'masuk' ? t.amount : -t.amount),
    0,
  )

  return (
    <div className="relative hidden w-[190px] shrink-0 flex-col items-center justify-center gap-6 lg:flex">
      <FloatWidget
        icon={Flame}
        value={`${streak} Hari`}
        label="Streak menyala"
        delay={0.55}
        tilt={-3}
        iconClass="bg-destructive/10 text-content-danger"
      />
      <FloatWidget
        icon={Timer}
        value={`${weekMissions} Misi`}
        label="Misi pekan ini"
        delay={0.75}
        tilt={2.5}
        iconClass="bg-cocoa/10 text-content-secondary"
      />
      <FloatWidget
        icon={Wallet}
        value={formatIDRShort(saldo)}
        label="Saldo sehat"
        delay={0.95}
        tilt={-2}
        iconClass="bg-gold/25 text-warning"
      />
    </div>
  )
}

/* ===== Panggung utama ===== */

export function DesktopStage() {
  return (
    <div className="h-dvh w-full overflow-hidden bg-background">
      <div className="mx-auto flex h-full max-w-[1720px]">
        <BrandPanel />
        <WidgetRail />

        {/* Area aplikasi — meja lembut dengan cahaya ambien */}
        <main className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden p-4 xl:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/4 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-secondary/70 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] translate-x-1/4 translate-y-1/4 rounded-full bg-surface-secondary blur-3xl" />
          </div>

          {/* Bingkai ponsel: full-bleed di bawah lg, bercasing di atas */}
          <div className="relative h-dvh w-full overflow-hidden lg:h-[min(860px,94%)] lg:w-auto lg:aspect-[9/19] lg:rounded-[46px] lg:border-[10px] lg:border-espresso lg:bg-espresso lg:shadow-ink-deep">
            {/* Lubang kamera depan */}
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-[14px] z-[80] hidden h-[11px] w-[11px] -translate-x-1/2 rounded-full bg-black shadow-[inset_0_1px_2px_rgba(255,255,255,0.08)] lg:block"
            />
            <RutinaApp />
          </div>
        </main>
      </div>
    </div>
  )
}
