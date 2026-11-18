'use client'

import * as m from 'motion/react-m'
import { Check, Flame, Leaf, Timer, Wallet, type LucideIcon } from 'lucide-react'

import { motionTokens } from '@/lib/motion/tokens'

import { formatIDRShort } from './finance/utils'
import { RutinaCard } from './rutina-card'
import { RutinaSectionHeader } from './rutina-section-header'
import {
  bestStreak,
  dayCounts,
  habitsOn,
  HABIT_CAT_COLORS,
  todayISO,
  useRutina,
  type Habit,
} from './store'

/* Baris metrik rata (ikon + nilai + label) — tenang, bukan kartu melayang. */
function MetricRow({
  icon: Icon,
  iconClass,
  value,
  label,
}: {
  icon: LucideIcon
  iconClass: string
  value: string
  label: string
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClass}`}
      >
        <Icon className="h-4 w-4" strokeWidth={2.1} />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-bold leading-tight tabular-nums text-content-primary">
          {value}
        </span>
        <span className="block text-[11px] font-semibold text-content-muted">
          {label}
        </span>
      </span>
    </li>
  )
}

/** "HH:MM" sekarang (zona lokal) untuk membandingkan jam pengingat. */
function nowHM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`
}

/** Kebiasaan terjadwal hari ini yang jam pengingatnya masih di depan. */
function isReminderAhead(h: Habit, now: string): h is Habit & { reminder: string } {
  return h.reminder !== null && h.reminder > now
}

/**
 * Rail konteks desktop (xl+) — panel kanan berisi ringkasan data NYATA
 * (satu sumber dengan layar aplikasi), agenda misi berikutnya, dan tips
 * tenang. Di bawah xl rail disembunyikan; tidak ada duplikasi state.
 */
export function ContextRail() {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  const txs = useRutina((s) => s.txs)

  const today = todayISO()
  const streak = bestStreak(habits, completions, today).streak
  const weekMissions = dayCounts(completions, today, 7).reduce(
    (a, b) => a + b.count,
    0,
  )
  /* Saldo bersih = masuk - keluar (transfer antar-dompet dikecualikan). */
  const saldo = txs.reduce(
    (a, t) =>
      a + (t.type === 'masuk' ? t.amount : t.type === 'keluar' ? -t.amount : 0),
    0,
  )

  const now = nowHM()
  const upcoming = habitsOn(habits, today)
    .filter((h) => isReminderAhead(h, now))
    .sort((a, b) => a.reminder.localeCompare(b.reminder))
  const next = upcoming[0] ?? null

  return (
    <aside
      aria-label="Panel konteks"
      className="hidden h-full w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-surface-primary/60 p-5 pb-6 xl:flex"
    >
      {/* Kartu 1 — ringkasan pekan */}
      <m.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.05,
          duration: motionTokens.duration.enter,
          ease: motionTokens.easing.standard,
        }}
      >
        <RutinaCard>
          <RutinaSectionHeader title="Ringkasan pekan ini" />
          <ul className="mt-4 flex flex-col gap-3.5">
            <MetricRow
              icon={Timer}
              iconClass="bg-cocoa/10 text-content-secondary"
              value={String(weekMissions)}
              label="Misi selesai pekan ini"
            />
            <MetricRow
              icon={Flame}
              iconClass="bg-destructive/10 text-content-danger"
              value={`${streak} hari`}
              label="Streak menyala"
            />
            <MetricRow
              icon={Wallet}
              iconClass="bg-gold/25 text-warning"
              value={formatIDRShort(saldo)}
              label="Saldo bersih"
            />
          </ul>
        </RutinaCard>
      </m.section>

      {/* Kartu 2 — misi berikutnya hari ini */}
      <m.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.13,
          duration: motionTokens.duration.enter,
          ease: motionTokens.easing.standard,
        }}
      >
        <RutinaCard>
          <RutinaSectionHeader title="Berikutnya" />
          {next ? (
            <div className="mt-4 flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cocoa/10 text-content-secondary"
              >
                <Timer className="h-[18px] w-[18px]" strokeWidth={2.1} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] tabular-nums text-content-muted">
                  {next.reminder}
                </p>
                <p className="mt-0.5 truncate text-[14px] font-bold leading-tight text-content-primary">
                  {next.title}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-content-muted">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: HABIT_CAT_COLORS[next.cat] }}
                  />
                  {next.cat}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-border-default bg-surface-secondary/50 p-3.5">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-success"
              >
                <Check className="h-4 w-4" strokeWidth={2.4} />
              </span>
              <p className="text-[12.5px] font-medium leading-snug text-content-secondary">
                Semua misi hari ini telah dijadwalkan.
              </p>
            </div>
          )}
        </RutinaCard>
      </m.section>

      {/* Kartu 3 — tips tenang */}
      <m.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.21,
          duration: motionTokens.duration.enter,
          ease: motionTokens.easing.standard,
        }}
      >
        <RutinaCard>
          <RutinaSectionHeader title="Tips" />
          <div className="mt-3.5 flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-success"
            >
              <Leaf className="h-4 w-4" strokeWidth={2} />
            </span>
            <p className="text-[12.5px] font-medium leading-relaxed text-content-secondary">
              Konsistensi kecil setiap hari lebih kuat daripada sempurna
              sesekali.
            </p>
          </div>
        </RutinaCard>
      </m.section>
    </aside>
  )
}
