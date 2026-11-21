'use client'

import * as m from 'motion/react-m'
import {
  Dumbbell,
  Flame,
  Gift,
  ListChecks,
  PartyPopper,
  Sprout,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { playfair } from './serif'
import { formatIDR } from './finance/utils'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { motionTokens } from '@/lib/motion/tokens'

import { todayISO, useRutina, XP_BONUS } from './store'
import {
  pickDailyHighlight,
  type DailyHighlight,
  type HighlightInput,
} from './daily-highlight'

/* ===== Sorotan Hari Ini — kartu visual =====

   Beranda selalu menunjukkan SATU hal paling relevan untuk hari
   ini (v2.14). Logika pemilihan murni ada di daily-highlight.ts;
   kartu ini hanya merender + memetakan CTA ke aksi store. Aksen
   warna mengikuti modul asal sorotan ("ruang warna" aplikasi). */

const MODULE_ACCENT: Record<
  DailyHighlight['module'],
  { icon: string; soft: string }
> = {
  kebiasaan: {
    icon: 'var(--module-kebiasaan)',
    soft: 'var(--module-kebiasaan-soft)',
  },
  keuangan: {
    icon: 'var(--module-finance)',
    soft: 'var(--module-finance-soft)',
  },
  bugar: {
    icon: 'var(--module-bugar)',
    soft: 'var(--module-bugar-soft)',
  },
  beranda: {
    icon: 'var(--palette-matcha)',
    soft: 'var(--palette-mist)',
  },
}

const KEY_ICON: Record<DailyHighlight['key'], LucideIcon> = {
  'streak-risk': Flame,
  'budget-warning': Wallet,
  'workout-stale': Dumbbell,
  'goal-near': Gift,
  'nearly-done': ListChecks,
  bonus: Gift,
  perfect: PartyPopper,
  quiet: Sprout,
  welcome: Sprout,
}

/* Sorotan mendesak diberi "suar" bernapas — tanda hal ini butuh
   perhatian hari ini; sorotan netral/positif diam agar tenang. */
const URGENT_KEYS = new Set(['streak-risk', 'budget-warning', 'workout-stale'])

/** Warna isi bar anggaran menurut tingkat pemakaian. */
function budgetBarClass(pct: number): string {
  if (pct >= 1) return 'bg-destructive'
  if (pct >= 0.85) return 'bg-warning'
  return 'bg-primary'
}

export function DailyHighlightCard({
  excludeHabitIds,
}: {
  /** habit.id yang sudah punya baris aksi di Beranda — Sorotan tidak
   *  membuat tombol centang kedua untuk kebiasaan yang sama. */
  excludeHabitIds?: Set<string>
}) {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  const txs = useRutina((s) => s.txs)
  const budgets = useRutina((s) => s.budgets)
  const goals = useRutina((s) => s.goals)
  const workouts = useRutina((s) => s.workouts)
  const bonusClaimed = useRutina((s) => s.bonusClaimed)

  /* v2.27 Daybook: kunjungan ulang tidak mengulang entrance Sorotan. */
  const playEntrance = useFirstVisit('home-sorotan')

  const today = todayISO()
  const input: HighlightInput = {
    today,
    habits,
    completions,
    txs,
    budgets,
    goals,
    workouts,
    bonusClaimed,
    bonusXp: XP_BONUS,
    excludeHabitIds,
  }
  const hl = pickDailyHighlight(input)

  const accent = MODULE_ACCENT[hl.module]
  const Icon = KEY_ICON[hl.key]
  const urgent = URGENT_KEYS.has(hl.key)

  /* Pemetaan CTA → aksi store. */
  const runCta = () => {
    const s = useRutina.getState()
    switch (hl.cta) {
      case 'complete-habit':
        if (hl.visual.kind === 'streak') {
          s.toggleHabit(hl.visual.habitId, today)
          toast.success('Misi selesai — streak tetap berjalan!')
        }
        break
      case 'open-budget':
        s.setUiPref({ finTab: 'anggaran' })
        s.setScreen('keuangan')
        break
      case 'log-workout':
        s.openWorkoutSheet()
        break
      case 'contribute-goal':
        if (hl.visual.kind === 'goal') s.openGoalSheet(hl.visual.goalId)
        break
      case 'claim-bonus':
        s.claimBonus()
        toast.success(`Bonus harian diklaim — tambah ${XP_BONUS} XP!`)
        break
      case 'open-stats':
        s.setScreen('statistik')
        break
      case 'add-habit':
        s.openHabitCreate()
        break
    }
  }

  const ctaLabel: Record<DailyHighlight['cta'], string> = {
    'complete-habit': 'Selesaikan sekarang',
    'open-budget': 'Lihat anggaran',
    'log-workout': 'Catat latihan',
    'contribute-goal': 'Isi tabungan',
    'claim-bonus': `Klaim +${XP_BONUS} XP`,
    'open-stats': 'Lihat statistik',
    'add-habit': 'Tambah kebiasaan',
  }

  return (
    <m.section
      initial={playEntrance ? { opacity: 0, y: 14 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: motionTokens.duration.enter,
        ease: motionTokens.easing.standard,
      }}
      aria-label="Sorotan hari ini"
      /* Dua tingkat (audit Tahap 2): normal = kartu tenang hairline;
         mendesak = tepi ikut bernuansa modul (35%).
         v2.27 Daybook: kartu didudukkan — radius standar 16, tanpa
         bayangan, judul lebih kecil, CTA pil ringkas (bukan lebar penuh)
         agar TIDAK bersaing dengan hero progres; suar mendesak kini
         halo STATIS (animate-glow dihapus — direktif melarang animasi
         berulang dekoratif). */
      className="rounded-lg border border-border bg-surface-primary p-4"
      style={
        urgent
          ? { borderColor: `color-mix(in oklab, ${accent.icon} 35%, transparent)` }
          : undefined
      }
    >
      <div className="flex items-start gap-3.5">
        {/* Suar ikon — lingkaran lembut bernuansa modul; versi mendesak
            memakai halo lembut STATIS sebagai penanda "butuh perhatian"
            (tanpa denyut berulang). */}
        <span className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center">
          {urgent && (
            <span
              aria-hidden="true"
              className="absolute -inset-1.5 rounded-full blur-md"
              style={{ backgroundColor: accent.icon, opacity: 0.3 }}
            />
          )}
          <span
            aria-hidden="true"
            className="relative flex h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: accent.soft, color: accent.icon }}
          >
            <Icon className="h-5 w-5" strokeWidth={2.1} />
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-content-muted">
            Sorotan Hari Ini
          </p>
          <h2
            className={`${playfair.className} mt-1 text-balance text-base font-semibold leading-snug tracking-tight text-content-primary`}
          >
            {hl.title}
          </h2>
          <p className="mt-1 text-note font-medium leading-relaxed text-content-muted">
            {hl.text}
          </p>

          {/* Mini-visual — bukan sekadar angka: runtun, batang anggaran,
              batang tujuan, atau chip hitungan yang langsung terbaca. */}
          {hl.visual.kind === 'streak' && (
            <p className="mt-2.5 flex items-center gap-1.5 rounded-full bg-gold/25 px-3 py-1.5 text-meta font-bold text-espresso w-fit">
              <Flame className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
              {hl.visual.streak} hari beruntun
            </p>
          )}

          {hl.visual.kind === 'budget' && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-eyebrow font-semibold tabular-nums text-content-secondary">
                <span>{formatIDR(hl.visual.spent)}</span>
                <span className="text-content-muted">
                  batas {formatIDR(hl.visual.limit)}
                </span>
              </div>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-sunken"
                role="progressbar"
                aria-label={`Anggaran ${hl.visual.catLabel} terpakai ${Math.round(hl.visual.pct * 100)} persen`}
                aria-valuenow={Math.round(hl.visual.pct * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <m.div
                  initial={false}
                  className={`h-full rounded-full ${budgetBarClass(hl.visual.pct)}`}
                  animate={{
                    width: `${Math.min(hl.visual.pct, 1) * 100}%`,
                  }}
                  transition={motionTokens.spring.bar}
                />
              </div>
            </div>
          )}

          {hl.visual.kind === 'stale' && (
            <p
              className="mt-2.5 flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-meta font-bold"
              style={{ backgroundColor: accent.soft, color: accent.icon }}
            >
              <Dumbbell
                className="h-3.5 w-3.5"
                strokeWidth={2.2}
                aria-hidden="true"
              />
              Terakhir latihan {hl.visual.daysSince} hari lalu
            </p>
          )}

          {hl.visual.kind === 'goal' && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-eyebrow font-semibold tabular-nums text-content-secondary">
                <span>{formatIDR(hl.visual.saved)}</span>
                <span className="text-content-muted">
                  target {formatIDR(hl.visual.target)}
                </span>
              </div>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-sunken"
                role="progressbar"
                aria-label={`Tabungan "${hl.visual.goalName}" terdanai ${Math.round(hl.visual.pct * 100)} persen`}
                aria-valuenow={Math.round(hl.visual.pct * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <m.div
                  initial={false}
                  className="h-full rounded-full bg-gold"
                  animate={{ width: `${Math.min(hl.visual.pct, 1) * 100}%` }}
                  transition={motionTokens.spring.bar}
                />
              </div>
            </div>
          )}

          {hl.visual.kind === 'progress' && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-eyebrow font-semibold tabular-nums text-content-secondary">
                <span>
                  {hl.visual.done} dari {hl.visual.total} misi
                </span>
                {hl.visual.nextTargetMin != null && (
                  <span className="text-content-muted">
                    Target {hl.visual.nextTargetMin} mnt
                  </span>
                )}
              </div>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-sunken"
                role="progressbar"
                aria-label={`Progres misi hari ini ${Math.round(hl.visual.pct * 100)} persen`}
                aria-valuenow={Math.round(hl.visual.pct * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <m.div
                  initial={false}
                  className="h-full w-full origin-left rounded-full bg-primary"
                  animate={{ scaleX: Math.min(hl.visual.pct, 1) }}
                  transition={motionTokens.spring.bar}
                />
              </div>
            </div>
          )}

          {hl.visual.kind === 'bonus' && (
            <p className="mt-2.5 flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-meta font-bold text-success">
              <Gift className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
              Hadiah harian gratis
            </p>
          )}

          {hl.visual.kind === 'perfect' && (
            <p className="mt-2.5 flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-meta font-bold text-success">
              <Sprout className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
              {hl.visual.missions} misi · streak tetap hidup
            </p>
          )}
        </div>
      </div>

      {/* CTA pil ringkas — menunggu di akhir kartu tanpa memenuhi lebar
          layar (v2.27 Daybook: Sorotan adalah panel sekunder, bukan
          hero kedua; CTA besar penuh diserahkan ke ruang kerjanya). */}
      <div className="mt-3.5 flex">
        <m.button
          type="button"
          onClick={runCta}
          whileTap={{ scale: 0.96 }}
          transition={motionTokens.spring.snappy}
          className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-meta font-bold text-primary-foreground shadow-soft transition-colors duration-200 hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {ctaLabel[hl.cta]}
        </m.button>
      </div>
    </m.section>
  )
}
