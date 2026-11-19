'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import * as m from 'motion/react-m'
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  Check,
  Droplets,
  Dumbbell,
  Flame,
  Leaf,
  Minus,
  Moon,
  PiggyBank,
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

import { CAT_META } from './finance/cats'
import { formatIDRShort, monthFlow, monthSpendByCat } from './finance/utils'
import { prBoard } from './fitness/fit-utils'
import { MODULE_TEXT, MODULE_TINT } from './rutina-module'
import { RutinaCard } from './rutina-card'
import { RutinaSectionHeader } from './rutina-section-header'
import {
  addDaysISO,
  bestStreak,
  dayCounts,
  habitsOn,
  HABIT_CAT_COLORS,
  shortDateLabel,
  todayISO,
  useRutina,
  type FinCat,
  type Habit,
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
          className={`block truncate text-[15px] font-bold leading-tight tabular-nums text-content-primary ${
            valueClass ?? ''
          }`}
        >
          {value}
        </span>
        <span className="block truncate text-[11px] font-semibold text-content-muted">
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
      <p className="text-[12.5px] font-medium leading-snug text-content-secondary">
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
        <p className="text-[12.5px] font-medium leading-relaxed text-content-secondary">
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
          <p className="mt-3 text-[11px] font-medium leading-relaxed text-content-muted">
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
            <p className="mt-3 text-[11px] font-medium leading-relaxed text-content-muted">
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
            label={`${CAT_META[top.cat].label} terpakai`}
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
                label={t.note || CAT_META[t.cat].label}
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
      <p className="mt-3 text-[11px] font-medium leading-relaxed text-content-muted">
        Setiap misi yang selesai ikut menyirami tanamannya.
      </p>
    </RutinaCard>
  )
}

/* ===== Kartu Statistik — insight pekan & fokus kebiasaan ===== */

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

/**
 * Rail konteks desktop (xl+) — panel kanan ADAPTIF terhadap layar aktif.
 * Isi tiga kartunya berganti mengikuti domain layar (Bugar, Keuangan,
 * Kebiasaan, Statistik); beranda/profil/jurnal memakai set default
 * (ringkasan pekan, berikutnya, tips). Seluruh angka berasal dari data
 * NYATA store — satu sumber dengan layar aplikasi; aksen ikon memakai
 * peta modul eksplisit agar cocok dengan domain layar. Di bawah xl rail
 * disembunyikan; tidak ada duplikasi state.
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

  return (
    <aside
      aria-label="Panel konteks"
      className="hidden h-full w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-surface-primary/60 p-5 pb-6 xl:flex"
    >
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
            ) : (
              <WeekSummaryCard />
            )}
          </RailSection>

          {/* Kartu 2 — agenda / rekor / anggaran sesuai domain */}
          <RailSection delay={0.13}>
            {screen === 'bugar' ? (
              <PrCard />
            ) : screen === 'keuangan' ? (
              <BudgetCard />
            ) : screen === 'kebiasaan' ? (
              <NextUpCard title="Agenda" />
            ) : (
              <NextUpCard />
            )}
          </RailSection>

          {/* Kartu 3 — hidrasi / aktivitas / taman / tips */}
          <RailSection delay={0.21}>
            {screen === 'bugar' ? (
              <HydrationCard />
            ) : screen === 'keuangan' ? (
              <RecentTxsCard />
            ) : screen === 'kebiasaan' ? (
              <GardenCard />
            ) : (
              <TipsCard />
            )}
          </RailSection>
        </>
      )}
    </aside>
  )
}
