'use client'

import {
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import * as m from 'motion/react-m'
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  Database,
  Droplets,
  Dumbbell,
  Flame,
  Leaf,
  Medal,
  Minus,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  PiggyBank,
  Smile,
  Sparkles,
  Sprout,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { motionTokens } from '@/lib/motion/tokens'

import { useCatMeta } from './finance/use-cat-meta'
import { formatIDRShort, monthFlow, monthSpendByCat } from './finance/utils'
import { prBoard } from './fitness/fit-utils'
import { MODULE_TEXT, MODULE_TINT, type RutinaModule } from './rutina-module'
import { RutinaCard } from './rutina-card'
import { RutinaSectionHeader } from './rutina-section-header'
import { SyncStatusCard } from './sync-status-card'
import {
  addDaysISO,
  bestStreak,
  computeLevel,
  computeXp,
  dayCounts,
  doneCountOn,
  habitsOn,
  HABIT_CAT_COLORS,
  longestStreak,
  shortDateLabel,
  todayISO,
  useRutina,
  XP_TARGET,
  type FinCat,
  type Habit,
  type Screen,
} from './store'

/* Baris metrik rata (ikon + nilai + label) — tenang, bukan kartu melayang. */
function MetricRow({
  icon: Icon,
  iconClass,
  value,
  valueClass,
  label,
}: {
  icon: LucideIcon
  iconClass: string
  value: string
  /** Warna khusus untuk nilai (mis. semantik masuk/keluar transaksi). */
  valueClass?: string
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
        <span
          className={`block truncate text-section font-bold leading-tight tabular-nums text-content-primary ${
            valueClass ?? ''
          }`}
        >
          {value}
        </span>
        <span className="block truncate text-eyebrow font-semibold text-content-muted">
          {label}
        </span>
      </span>
    </li>
  )
}

/** Slot kartu dengan animasi masuk seragam (jeda berjenjang 0.05/0.13/0.21). */
function RailSection({
  delay,
  children,
}: {
  delay: number
  children: ReactNode
}) {
  return (
    <m.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        duration: motionTokens.duration.enter,
        ease: motionTokens.easing.standard,
      }}
    >
      {children}
    </m.section>
  )
}

/** Keadaan kosong tenang — pola garis putus-putus yang sudah ada di rail. */
function RailCalm({
  icon: Icon,
  iconClass,
  text,
}: {
  icon: LucideIcon
  iconClass: string
  text: string
}) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-border-default bg-surface-secondary/50 p-3.5">
      <span
        aria-hidden="true"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClass}`}
      >
        <Icon className="h-4 w-4" strokeWidth={2.1} />
      </span>
      <p className="text-note font-medium leading-snug text-content-secondary">
        {text}
      </p>
    </div>
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

/* ===== Kartu default (beranda / profil / jurnal) ===== */

function WeekSummaryCard() {
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

  return (
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
  )
}

function NextUpCard({ title = 'Berikutnya' }: { title?: string }) {
  const habits = useRutina((s) => s.habits)

  const today = todayISO()
  const now = nowHM()
  const upcoming = habitsOn(habits, today)
    .filter((h) => isReminderAhead(h, now))
    .sort((a, b) => a.reminder.localeCompare(b.reminder))
  const next = upcoming[0] ?? null

  return (
    <RutinaCard>
      <RutinaSectionHeader title={title} />
      {next ? (
        <div className="mt-4 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cocoa/10 text-content-secondary"
          >
            <Timer className="h-[18px] w-[18px]" strokeWidth={2.1} />
          </span>
          <div className="min-w-0">
            <p className="text-eyebrow font-semibold uppercase tracking-[0.08em] tabular-nums text-content-muted">
              {next.reminder}
            </p>
            <p className="mt-0.5 line-clamp-2 break-words text-body font-semibold leading-tight text-content-primary">
              {next.title}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-eyebrow font-medium text-content-muted">
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
          <p className="text-note font-medium leading-snug text-content-secondary">
            Semua misi hari ini telah dijadwalkan.
          </p>
        </div>
      )}
    </RutinaCard>
  )
}

function TipsCard() {
  return (
    <RutinaCard>
      <RutinaSectionHeader title="Tips" />
      <div className="mt-3.5 flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-success"
        >
          <Leaf className="h-4 w-4" strokeWidth={2} />
        </span>
        <p className="text-note font-medium leading-relaxed text-content-secondary">
          Konsistensi kecil setiap hari lebih kuat daripada sempurna
          sesekali.
        </p>
      </div>
    </RutinaCard>
  )
}

/* ===== Kartu Bugar — kesiapan tubuh, rekor pribadi, hidrasi ===== */

function BodyReadinessCard() {
  const bodyLogs = useRutina((s) => s.bodyLogs)
  const latest = Object.entries(bodyLogs).sort((a, b) => (a[0] < b[0] ? 1 : -1))[0]
  const log = latest?.[1]

  return (
    <RutinaCard>
      <RutinaSectionHeader title="Kesiapan tubuh" />
      {log && (log.sleepH != null || log.energy != null) ? (
        <>
          <ul className="mt-4 flex flex-col gap-3.5">
            {log.sleepH != null && (
              <MetricRow
                icon={Moon}
                iconClass={MODULE_TINT.bugar}
                value={`${log.sleepH.toFixed(1).replace('.', ',')} jam`}
                label="Tidur semalam"
              />
            )}
            {log.energy != null && (
              <MetricRow
                icon={Zap}
                iconClass={MODULE_TINT.bugar}
                value={`${log.energy}/5`}
                label="Energi"
              />
            )}
          </ul>
          <p className="mt-3 text-eyebrow font-medium leading-relaxed text-content-muted">
            Check-in {shortDateLabel(latest[0])} ·{' '}
            {log.sleepH != null && log.sleepH >= 7
              ? 'tidur cukup, tubuh siap bergerak.'
              : log.sleepH != null
                ? 'tidur belum cukup — utamakan pemulihan.'
                : 'jaga intensitas sesuai energi hari ini.'}
          </p>
        </>
      ) : (
        <RailCalm
          icon={Moon}
          iconClass={MODULE_TINT.bugar}
          text="Belum ada check-in tubuh — isi di Bugar › Tubuh."
        />
      )}
    </RutinaCard>
  )
}

function PrCard() {
  const workouts = useRutina((s) => s.workouts)
  const prs = prBoard(workouts)
  const last = [...workouts].sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null

  return (
    <RutinaCard>
      <RutinaSectionHeader title="Rekor pribadi" />
      {prs.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-3.5">
          {prs.slice(0, 2).map((pr) => (
            <MetricRow
              key={pr.name}
              icon={Trophy}
              iconClass={MODULE_TINT.bugar}
              value={`≈ ${pr.best.toFixed(1).replace('.', ',')} kg`}
              valueClass={MODULE_TEXT.bugar}
              label={`e1RM terbaik — ${pr.name}`}
            />
          ))}
        </ul>
      ) : last ? (
        <ul className="mt-4 flex flex-col gap-3.5">
          <MetricRow
            icon={Dumbbell}
            iconClass={MODULE_TINT.bugar}
            value={`${last.duration} mnt`}
            label={`Sesi terakhir — ${shortDateLabel(last.date)}`}
          />
        </ul>
      ) : (
        <RailCalm
          icon={Trophy}
          iconClass={MODULE_TINT.bugar}
          text="Belum ada sesi latihan tercatat."
        />
      )}
    </RutinaCard>
  )
}

function HydrationCard() {
  const bodyLogs = useRutina((s) => s.bodyLogs)
  const today = todayISO()
  const latest = Object.entries(bodyLogs).sort((a, b) => (a[0] < b[0] ? 1 : -1))[0]
  const log = bodyLogs[today] ?? latest?.[1]
  const isToday = bodyLogs[today] != null

  return (
    <RutinaCard>
      <RutinaSectionHeader title="Hidrasi" />
      {log ? (
        <>
          <ul className="mt-4 flex flex-col gap-3.5">
            <MetricRow
              icon={Droplets}
              iconClass={MODULE_TINT.bugar}
              value={`${log.water}/8 gelas`}
              label={isToday ? 'Hidrasi hari ini' : 'Catatan terakhir'}
            />
          </ul>
          {log.water < 8 && (
            <p className="mt-3 text-eyebrow font-medium leading-relaxed text-content-muted">
              Tambah {8 - log.water} gelas lagi untuk mencapai target harian.
            </p>
          )}
        </>
      ) : (
        <RailCalm
          icon={Droplets}
          iconClass={MODULE_TINT.bugar}
          text="Target delapan gelas sehari — mulai dari satu gelas."
        />
      )}
    </RutinaCard>
  )
}

/* ===== Kartu Keuangan — ringkasan periode, anggaran, aktivitas ===== */

function PeriodCard() {
  const txs = useRutina((s) => s.txs)
  /* Saldo bersih = masuk - keluar (transfer antar-dompet dikecualikan). */
  const saldo = txs.reduce(
    (a, t) =>
      a + (t.type === 'masuk' ? t.amount : t.type === 'keluar' ? -t.amount : 0),
    0,
  )
  const flow = monthFlow(txs, todayISO().slice(0, 7))

  return (
    <RutinaCard>
      <RutinaSectionHeader title="Ringkasan periode" />
      <ul className="mt-4 flex flex-col gap-3.5">
        <MetricRow
          icon={Wallet}
          iconClass={MODULE_TINT.finance}
          value={formatIDRShort(saldo)}
          label="Saldo bersih"
        />
        <MetricRow
          icon={ArrowUpRight}
          iconClass={MODULE_TINT.finance}
          value={formatIDRShort(flow.masuk)}
          label="Masuk bulan ini"
        />
        <MetricRow
          icon={ArrowDownRight}
          iconClass={MODULE_TINT.finance}
          value={formatIDRShort(flow.keluar)}
          label="Keluar bulan ini"
        />
      </ul>
    </RutinaCard>
  )
}

function BudgetCard() {
const catMeta = useCatMeta()

  const txs = useRutina((s) => s.txs)
  const budgets = useRutina((s) => s.budgets)
  const wallets = useRutina((s) => s.wallets)

  const byCat = monthSpendByCat(txs, todayISO().slice(0, 7))
  const top =
    Object.entries(budgets)
      .map(([cat, limit]) => ({ cat: cat as FinCat, limit, used: byCat[cat] ?? 0 }))
      .filter((b) => b.used > 0)
      .sort((a, b) => b.used / Math.max(1, b.limit) - a.used / Math.max(1, a.limit))[0] ??
    null

  return (
    <RutinaCard>
      <RutinaSectionHeader title="Anggaran" />
      {top ? (
        <ul className="mt-4 flex flex-col gap-3.5">
          <MetricRow
            icon={PiggyBank}
            iconClass={MODULE_TINT.finance}
            value={`${Math.min(100, Math.round((top.used / Math.max(1, top.limit)) * 100))}%`}
            valueClass={MODULE_TEXT.finance}
            label={`${catMeta(top.cat).label} terpakai`}
          />
          <MetricRow
            icon={Wallet}
            iconClass={MODULE_TINT.finance}
            value={formatIDRShort(top.used)}
            label={`dari batas ${formatIDRShort(top.limit)}`}
          />
        </ul>
      ) : (
        <ul className="mt-4 flex flex-col gap-3.5">
          <MetricRow
            icon={Wallet}
            iconClass={MODULE_TINT.finance}
            value={`${wallets.length} dompet`}
            label={`${txs.length} transaksi tercatat`}
          />
        </ul>
      )}
    </RutinaCard>
  )
}

function RecentTxsCard() {
const catMeta = useCatMeta()

  const txs = useRutina((s) => s.txs)
  const recent = [...txs].sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 3)

  return (
    <RutinaCard>
      <RutinaSectionHeader title="Aktivitas terakhir" />
      {recent.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-3.5">
          {recent.map((t) => {
            const isIn = t.type === 'masuk'
            const isOut = t.type === 'keluar'
            return (
              <MetricRow
                key={t.id}
                icon={isIn ? ArrowUpRight : isOut ? ArrowDownRight : ArrowLeftRight}
                iconClass={
                  isIn
                    ? 'bg-success/15 text-success'
                    : isOut
                      ? 'bg-destructive/10 text-content-danger'
                      : MODULE_TINT.finance
                }
                value={`${isIn ? '+' : isOut ? '−' : ''}${formatIDRShort(t.amount)}`}
                valueClass={
                  isIn ? 'text-success' : isOut ? 'text-content-danger' : undefined
                }
                label={t.note || catMeta(t.cat).label}
              />
            )
          })}
        </ul>
      ) : (
        <RailCalm
          icon={Wallet}
          iconClass={MODULE_TINT.finance}
          text="Belum ada transaksi tercatat."
        />
      )}
    </RutinaCard>
  )
}

/* ===== Kartu Kebiasaan — konsistensi, agenda, taman (identitas Rose Clay) ===== */

function ConsistencyCard() {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)

  const today = todayISO()
  const streak = bestStreak(habits, completions, today).streak
  const weekMissions = dayCounts(completions, today, 7).reduce(
    (a, b) => a + b.count,
    0,
  )

  return (
    <RutinaCard>
      <RutinaSectionHeader title="Konsistensi" />
      <ul className="mt-4 flex flex-col gap-3.5">
        <MetricRow
          icon={Flame}
          iconClass={MODULE_TINT.kebiasaan}
          value={`${streak} hari`}
          label="Streak menyala"
        />
        <MetricRow
          icon={Timer}
          iconClass={MODULE_TINT.kebiasaan}
          value={`${weekMissions} misi`}
          label="Selesai pekan ini"
        />
      </ul>
    </RutinaCard>
  )
}

function GardenCard() {
  const habits = useRutina((s) => s.habits)
  const activeCount = habits.filter((h) => !h.archived).length

  return (
    <RutinaCard>
      <RutinaSectionHeader title="Taman" />
      <ul className="mt-4 flex flex-col gap-3.5">
        <MetricRow
          icon={Sprout}
          iconClass={MODULE_TINT.kebiasaan}
          value={`${activeCount} kebiasaan`}
          label="Tumbuh di tamanmu"
        />
      </ul>
      <p className="mt-3 text-eyebrow font-medium leading-relaxed text-content-muted">
        Setiap misi yang selesai ikut menyirami tanamannya.
      </p>
    </RutinaCard>
  )
}

/* ===== Kartu Statistik — insight, pencapaian, fokus ===== */

function InsightCard() {
  const completions = useRutina((s) => s.completions)

  const today = todayISO()
  const thisWeek = dayCounts(completions, today, 7).reduce(
    (a, b) => a + b.count,
    0,
  )
  const lastWeek = dayCounts(completions, addDaysISO(today, -7), 7).reduce(
    (a, b) => a + b.count,
    0,
  )
  const delta = thisWeek - lastWeek
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus

  return (
    <RutinaCard>
      <RutinaSectionHeader title="Insight" />
      {thisWeek > 0 || lastWeek > 0 ? (
        <ul className="mt-4 flex flex-col gap-3.5">
          <MetricRow
            icon={BarChart3}
            iconClass={MODULE_TINT.stats}
            value={`${thisWeek} misi`}
            label="Selesai pekan ini"
          />
          <MetricRow
            icon={DeltaIcon}
            iconClass={MODULE_TINT.stats}
            value={
              delta === 0
                ? `${lastWeek} misi`
                : `${delta > 0 ? '+' : '−'}${Math.abs(delta)} misi`
            }
            valueClass={MODULE_TEXT.stats}
            label="Dibanding pekan lalu"
          />
        </ul>
      ) : (
        <RailCalm
          icon={BarChart3}
          iconClass={MODULE_TINT.stats}
          text="Belum ada misi selesai pekan ini."
        />
      )}
    </RutinaCard>
  )
}

function FocusCard() {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)

  const today = todayISO()
  const week = dayCounts(completions, today, 7)
  const focus =
    habits
      .filter((h) => !h.archived)
      .map((h) => ({
        habit: h,
        count: week.reduce(
          (a, d) => a + (completions[d.date]?.[h.id] ? 1 : 0),
          0,
        ),
      }))
      .sort((a, b) => b.count - a.count)[0] ?? null
  const activeCount = habits.filter((h) => !h.archived).length

  return (
    <RutinaCard>
      <RutinaSectionHeader title="Fokus" />
      {focus && focus.count > 0 ? (
        <ul className="mt-4 flex flex-col gap-3.5">
          <MetricRow
            icon={Target}
            iconClass={MODULE_TINT.stats}
            value={focus.habit.title}
            label={`${focus.count} misi selesai pekan ini`}
          />
        </ul>
      ) : activeCount > 0 ? (
        <ul className="mt-4 flex flex-col gap-3.5">
          <MetricRow
            icon={Target}
            iconClass={MODULE_TINT.stats}
            value={`${activeCount} kebiasaan`}
            label="Aktif terpantau"
          />
        </ul>
      ) : (
        <RailCalm
          icon={Target}
          iconClass={MODULE_TINT.stats}
          text="Belum ada kebiasaan aktif."
        />
      )}
    </RutinaCard>
  )
}

/* Pencapaian — level petualangan, progres XP, dan streak terbaik
   sepanjang masa (semua kebiasaan, data nyata). */
function AchievementCard() {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  const bonusClaimed = useRutina((s) => s.bonusClaimed)

  const today = todayISO()
  const xp = computeXp(doneCountOn(completions, today), bonusClaimed)
  const level = computeLevel(xp)
  const bestEver = habits.reduce(
    (a, h) => Math.max(a, longestStreak(h, completions, today)),
    0,
  )

  return (
    <RutinaCard>
      <RutinaSectionHeader title="Pencapaian" />
      <ul className="mt-4 flex flex-col gap-3.5">
        <MetricRow
          icon={Medal}
          iconClass={MODULE_TINT.stats}
          value={`Level ${level}`}
          valueClass={MODULE_TEXT.stats}
          label="Petualang Rutina"
        />
        <MetricRow
          icon={Sparkles}
          iconClass={MODULE_TINT.stats}
          value={`${xp} / ${XP_TARGET} XP`}
          label={
            level >= 8 ? 'Level maksimal tercapai' : 'Menuju level berikutnya'
          }
        />
        <MetricRow
          icon={Trophy}
          iconClass={MODULE_TINT.stats}
          value={`${bestEver} hari`}
          label="Streak terbaik sepanjang masa"
        />
      </ul>
    </RutinaCard>
  )
}

/* ===== Kartu Profil — penyimpanan & preferensi (identitas Cocoa Gold) ===== */

/* Penyimpanan — inventaris data nyata yang dikandung aplikasi. */
function StorageRailCard() {
  const txs = useRutina((s) => s.txs)
  const habits = useRutina((s) => s.habits)
  const notes = useRutina((s) => s.notes)
  const workouts = useRutina((s) => s.workouts)

  const activeHabits = habits.filter((h) => !h.archived).length

  return (
    <RutinaCard>
      <RutinaSectionHeader title="Penyimpanan" />
      <ul className="mt-4 flex flex-col gap-3.5">
        <MetricRow
          icon={Database}
          iconClass={MODULE_TINT.profil}
          value={`${txs.length} transaksi`}
          label="Buku kas"
        />
        <MetricRow
          icon={Sprout}
          iconClass={MODULE_TINT.profil}
          value={`${activeHabits} kebiasaan`}
          label="Taman aktif"
        />
        <MetricRow
          icon={BookOpen}
          iconClass={MODULE_TINT.profil}
          value={`${notes.length} catatan`}
          label="Jurnal tersimpan"
        />
      </ul>
      <p className="mt-3 text-eyebrow font-medium leading-relaxed text-content-muted">
        Termasuk {workouts.length} sesi Bugar — tersimpan lokal + cloud.
      </p>
    </RutinaCard>
  )
}

/* Preferensi cepat — target harian, mood hari ini, dan streak aktif. */
function PreferencesRailCard() {
  const dailyGoal = useRutina((s) => s.dailyGoal)
  const mood = useRutina((s) => s.mood)
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)

  const streak = bestStreak(habits, completions, todayISO()).streak

  return (
    <RutinaCard>
      <RutinaSectionHeader title="Preferensi" />
      <ul className="mt-4 flex flex-col gap-3.5">
        <MetricRow
          icon={Target}
          iconClass={MODULE_TINT.profil}
          value={`${dailyGoal} misi / hari`}
          label="Target harian"
        />
        <MetricRow
          icon={Smile}
          iconClass={MODULE_TINT.profil}
          value={mood ?? 'Belum check-in'}
          label="Mood hari ini"
        />
        <MetricRow
          icon={Flame}
          iconClass={MODULE_TINT.profil}
          value={`${streak} hari`}
          label="Streak menyala"
        />
      </ul>
    </RutinaCard>
  )
}

/* ===== Tata letak rail kolapsibel ===== */

/** Preferensi ringkas/terbuka rail — '1' ringkas, '0' terbuka, null
 *  berarti otomatis: terbuka penuh mulai 1440px, ringkas pada 1280–1439px
 *  (audit Tahap 1: tiga kolom penuh hanya di layar yang benar-benar lega). */
const RAIL_PREF_KEY = 'rutina-2.0-rail-collapsed'

function readRailPref(): boolean | null {
  try {
    const v = localStorage.getItem(RAIL_PREF_KEY)
    return v === '1' ? true : v === '0' ? false : null
  } catch {
    return null
  }
}

/** matchMedia reaktif — aman SSR (snapshot server selalu false). */
function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Domain warna layar aktif — menyalakan titik aksen pada strip ringkas. */
const SCREEN_MODULE: Partial<Record<Screen, RutinaModule>> = {
  bugar: 'bugar',
  keuangan: 'finance',
  kebiasaan: 'kebiasaan',
  statistik: 'stats',
  profil: 'profil',
}

/**
 * Rail konteks desktop (xl+) — panel kanan ADAPTIF terhadap layar aktif.
 *
 * Tata letak (audit Tahap 1 — "desktop application shell"):
 *   · 1280–1439px → strip ringkas 56px (bisa dibuka manual, preferensi
 *     tersimpan di localStorage);
 *   · ≥1440px      → tiga kolom penuh (rail 288px, tetap bisa diringkas);
 *   · Jurnal       → rail disembunyikan total — ruang menulis yang tenang.
 *
 * Isi tiga kartunya berganti mengikuti domain layar (Bugar, Keuangan,
 * Kebiasaan, Statistik, Profil); beranda memakai set default (ringkasan
 * pekan, berikutnya, tips). Seluruh angka berasal dari data NYATA store —
 * satu sumber dengan layar aplikasi; aksen ikon memakai peta modul
 * eksplisit agar cocok dengan domain layar. Di bawah xl rail disembunyikan;
 * tidak ada duplikasi state.
 */
export function ContextRail() {
  const screen = useRutina((s) => s.screen)

  /* Render konten rail HANYA pasca-mount. Seluruh metrik kartu diturunkan
     dari data store + tanggal/jam klien (todayISO/nowHM) yang bisa berbeda
     dengan server (zona waktu — pengguna WIB vs server UTC) — merender
     kosong saat SSR/hidrasi mencegah hydration mismatch yang memaksa React
     me-render ulang seluruh pohon. Di bawah xl rail tersembunyi (tanpa
     dampak visual); di desktop konten muncul lewat animasi entrance
     RailSection yang memang dirancang untuk itu. Pola useSyncExternalStore
     (snapshot server false → klien true) = deteksi hidrasi tanpa setState
     dalam effect. */
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  /* Kolapsibel: preferensi pengguna dibaca malas saat render klien pertama
     (aman SSR — output pra-mount selalu strip ringkas, tak ada mismatch:
     gerbang `mounted` di bawah), keadaan otomatis mengikuti breakpoint
     1440px. */
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(() =>
    typeof window === 'undefined' ? null : readRailPref(),
  )
  const wide1440 = useMediaQuery('(min-width: 1440px)')

  const expanded = userCollapsed !== null ? !userCollapsed : wide1440

  const toggleRail = () => {
    /* Nilai COLLAPSED baru = keadaan TERBUKA saat ini (toggle terbalik:
       terbuka → tersimpan '1' (ringkas), ringkas → '0' (terbuka)). */
    const nextCollapsed = expanded
    setUserCollapsed(nextCollapsed)
    try {
      localStorage.setItem(RAIL_PREF_KEY, nextCollapsed ? '1' : '0')
    } catch {
      /* localStorage diblokir — preferensi hanya bertahan sesi ini. */
    }
  }

  /* Jurnal — ruang tulis tenang: rail disembunyikan total. */
  if (screen === 'jurnal') return null

  const domain = SCREEN_MODULE[screen]

  /* Pra-mount (SSR + hidrasi) selalu strip ringkas — menjamin output hidrasi
     identik dengan server berapa pun preferensi localStorage. */
  const showFull = mounted && expanded

  /* Strip ringkas — pintu kecil berisi tombol buka + tiga titik domain. */
  if (!showFull) {
    return (
      <aside
        aria-label="Panel konteks (ringkas)"
        data-module={domain}
        className="hidden h-full w-14 shrink-0 flex-col items-center gap-1 border-l border-border bg-surface-primary/60 py-4 xl:flex"
      >
        <button
          type="button"
          onClick={toggleRail}
          aria-label="Buka panel konteks"
          title="Buka panel konteks"
          className="interactive flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-content-muted hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <PanelRightOpen className="h-[18px] w-[18px]" strokeWidth={2.1} />
        </button>
        <div
          aria-hidden="true"
          className="mt-3 flex flex-col items-center gap-2.5"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-module-accent" />
          <span className="h-1.5 w-1.5 rounded-full bg-module-accent/55" />
          <span className="h-1.5 w-1.5 rounded-full bg-module-accent/25" />
        </div>
      </aside>
    )
  }

  return (
    <aside
      aria-label="Panel konteks"
      data-module={domain}
      className="hidden h-full w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-surface-primary/60 p-5 pb-6 xl:flex"
    >
      {/* Baris judul + tombol ringkas — rail terasa seperti panel program
          desktop profesional, bukan kolom statis. */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
          Panel konteks
        </p>
        <button
          type="button"
          onClick={toggleRail}
          aria-label="Ringkas panel konteks"
          title="Ringkas panel konteks"
          className="interactive flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-content-muted hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <PanelRightClose className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>

      {mounted && (
        <>
          {/* Kartu 1 — ringkasan utama domain layar aktif */}
          <RailSection delay={0.05}>
            {screen === 'bugar' ? (
              <BodyReadinessCard />
            ) : screen === 'keuangan' ? (
              <PeriodCard />
            ) : screen === 'kebiasaan' ? (
              <ConsistencyCard />
            ) : screen === 'statistik' ? (
              <InsightCard />
            ) : screen === 'profil' ? (
              <SyncStatusCard variant="rail" />
            ) : (
              <WeekSummaryCard />
            )}
          </RailSection>

          {/* Kartu 2 — agenda / rekor / anggaran / pencapaian sesuai domain */}
          <RailSection delay={0.13}>
            {screen === 'bugar' ? (
              <PrCard />
            ) : screen === 'keuangan' ? (
              <BudgetCard />
            ) : screen === 'kebiasaan' ? (
              <NextUpCard title="Agenda" />
            ) : screen === 'statistik' ? (
              <AchievementCard />
            ) : screen === 'profil' ? (
              <StorageRailCard />
            ) : (
              <NextUpCard />
            )}
          </RailSection>

          {/* Kartu 3 — hidrasi / aktivitas / taman / fokus / preferensi */}
          <RailSection delay={0.21}>
            {screen === 'bugar' ? (
              <HydrationCard />
            ) : screen === 'keuangan' ? (
              <RecentTxsCard />
            ) : screen === 'kebiasaan' ? (
              <GardenCard />
            ) : screen === 'statistik' ? (
              <FocusCard />
            ) : screen === 'profil' ? (
              <PreferencesRailCard />
            ) : (
              <TipsCard />
            )}
          </RailSection>
        </>
      )}
    </aside>
  )
}
