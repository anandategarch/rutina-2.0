'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  Check,
  ChevronDown,
  Flame,
  Link2,
  Pencil,
  Plus,
  Snowflake,
  Sparkles,
  Sprout,
  Target,
  Timer,
} from 'lucide-react'
import { toast } from 'sonner'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { journalCard, journalList } from '@/lib/motion/variants'
import { motionTokens } from '@/lib/motion/tokens'

import {
  goldilocksOf,
  missedYesterday,
  plantStageOf,
  type GoldilocksAdvice,
} from '../habit-coach'
import { PlantGarden } from '../plant-garden'
import { RutinaCard } from '../rutina-card'
import { RutinaEmptyState } from '../rutina-empty-state'
import { RutinaMetric } from '../rutina-metric'
import { RutinaSectionHeader } from '../rutina-section-header'
import { TaskRow } from '../task-row'
import {
  HABIT_CATS,
  HABIT_CAT_COLORS,
  XP_PER_TASK,
  addDaysISO,
  doneCountOn,
  habitStreak,
  isDoneOn,
  longDateLabel,
  scheduledOn,
  todayISO,
  useRutina,
  weekStartISO,
  type Completions,
  type Habit,
} from '../store'

/* ===== Utilitas pekan (senada home.tsx — Senin = awal pekan) ===== */

/** Jumlah selesai satu kebiasaan sepanjang pekan (sampai tanggal iso). */
function weekDoneCount(c: Completions, habitId: string, iso: string): number {
  let cursor = weekStartISO(iso)
  let n = 0
  for (let i = 0; i < 7; i++) {
    if (cursor > iso) break
    if (isDoneOn(c, cursor, habitId)) n++
    cursor = addDaysISO(cursor, 1)
  }
  return n
}

/** Riwayat 14 hari terakhir berakhir pada tanggal iso. */
function recentDays(c: Completions, habitId: string, iso: string): boolean[] {
  const out: boolean[] = []
  for (let i = 13; i >= 0; i--) {
    out.push(isDoneOn(c, addDaysISO(iso, -i), habitId))
  }
  return out
}

/** Urutan alami agenda: jam pengingat, lalu judul. */
function byTime(a: Habit, b: Habit): number {
  const ra = a.reminder ?? '99:99'
  const rb = b.reminder ?? '99:99'
  return ra === rb ? a.title.localeCompare(b.title) : ra < rb ? -1 : 1
}

/* ===== Panel Detail Kebiasaan — kolom kanan split-screen desktop ===== */

/**
 * Panel detail kebiasaan terpilih (hanya desktop xl+): identitas kategori,
 * metrik cerdas (runtun, capaian pekan, versi 2 menit, susun kebiasaan,
 * hari jeda), riwayat 30 hari, dan aksi sunting.
 *
 * Kebiasaan diterima sebagai PROP — semua penutupan (closure) di dalamnya
 * hanya menangkap prop, bukan nilai turunan state induk, sehingga aman
 * bagi React Compiler (pola penutupan over prop sama dengan TaskRow).
 */
function HabitDetailPanel({
  habit,
  habits,
  completions,
  today,
  onEdit,
}: {
  habit: Habit
  habits: Habit[]
  completions: Completions
  today: string
  onEdit: (id: string) => void
}) {
  /* Metrik inti — dihitung dari histori nyata; dipakai di JSX saja. */
  const streak = habitStreak(habit, completions, today)
  const weekDone = weekDoneCount(completions, habit.id, today)

  /* Riwayat 30 hari terakhir, tua ke baru. */
  const history: boolean[] = []
  for (let i = 29; i >= 0; i--) {
    history.push(isDoneOn(completions, addDaysISO(today, -i), habit.id))
  }

  /* Susun kebiasaan — kebiasaan pemicu (bila dipasang). */
  const afterHabit = habit.afterId
    ? habits.find((x) => x.id === habit.afterId)
    : undefined

  return (
    <m.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: motionTokens.duration.enter,
        delay: 0.1,
        ease: motionTokens.easing.standard,
      }}
    >
      <RutinaCard variant="elevated" density="spacious" radius="2xl">
        <RutinaSectionHeader
          title={habit.title}
          eyebrow="Detail kebiasaan"
          accent
        />

        {/* Baris identitas — titik warna kategori + labelnya */}
        <p className="mt-2 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: HABIT_CAT_COLORS[habit.cat] }}
          />
          <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-content-secondary">
            {habit.cat}
          </span>
        </p>

        {/* Metrik kebiasaan — angka kunci + wawasan cerdas bila ada */}
        <div className="mt-5 space-y-4">
          <RutinaMetric
            label="Streak saat ini"
            value={streak}
            unit="hari"
            trend={streak > 0 ? 'up' : 'neutral'}
            caption="hari terjadwal berturut"
            icon={Flame}
            iconClassName="bg-primary/15 text-success"
            size="sm"
          />
          <RutinaMetric
            label="Selesai pekan ini"
            value={weekDone}
            unit="kali"
            caption={`dari ${habit.weeklyTarget} target pekanan`}
            icon={Check}
            iconClassName="bg-secondary text-content-secondary"
            size="sm"
          />
          {habit.mini && (
            <RutinaMetric
              label="Versi 2 menit"
              value={
                <span className="inline-block max-w-[240px] truncate align-baseline">
                  {habit.mini}
                </span>
              }
              caption="bentuk terkecil untuk mulai"
              icon={Timer}
              iconClassName="bg-primary/15 text-success"
              size="sm"
            />
          )}
          {afterHabit && (
            <RutinaMetric
              label="Setelah"
              value={
                <span className="inline-block max-w-[240px] truncate align-baseline">
                  {afterHabit.title}
                </span>
              }
              caption="susun kebiasaan"
              icon={Link2}
              iconClassName="bg-espresso/10 text-espresso"
              size="sm"
            />
          )}
          {habit.restDays.length > 0 && (
            <RutinaMetric
              label="Hari jeda"
              value={habit.restDays.length}
              unit="hari"
              caption="jeda runtun aman terjadwal"
              icon={Snowflake}
              iconClassName="bg-surface-secondary text-content-secondary"
              size="sm"
            />
          )}
        </div>

        {/* Riwayat 30 hari terakhir — satu titik per hari */}
        <div className="mt-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-content-muted">
            30 hari terakhir
          </p>
          <div
            aria-label="Riwayat 30 hari terakhir"
            className="mt-2 flex flex-wrap gap-1"
          >
            {history.map((done, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={
                  'h-2.5 w-2.5 rounded-full ' +
                  (done ? 'bg-primary' : 'bg-surface-sunken')
                }
              />
            ))}
          </div>
        </div>

        {/* Aksi — membuka sheet sunting yang sama dengan tombol Edit baris */}
        <button
          type="button"
          onClick={() => onEdit(habit.id)}
          className="mt-6 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-4 text-[13px] font-bold text-primary-foreground shadow-soft transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Pencil className="h-4 w-4" strokeWidth={2.4} />
          Sunting kebiasaan
        </button>
      </RutinaCard>
    </m.div>
  )
}

/* ===== Layar Kebiasaan — Pusat Habit Intelligence ===== */

export default function KebiasaanScreen() {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  const expandedTaskId = useRutina((s) => s.expandedTaskId)
  const toggleHabit = useRutina((s) => s.toggleHabit)
  const toggleExpandedTask = useRutina((s) => s.toggleExpandedTask)
  const setHabitArchived = useRutina((s) => s.setHabitArchived)
  const openHabitCreate = useRutina((s) => s.openHabitCreate)
  const openHabitEdit = useRutina((s) => s.openHabitEdit)

  const [showDone, setShowDone] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  /* Kebiasaan terpilih untuk Panel Detail (split-screen desktop). */
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const today = todayISO()

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.archived),
    [habits],
  )
  const archivedHabits = useMemo(
    () => habits.filter((h) => h.archived),
    [habits],
  )

  /* Agenda hari ini — kebiasaan aktif terjadwal hari ini. */
  const scheduledToday = useMemo(
    () => activeHabits.filter((h) => scheduledOn(h, today)),
    [activeHabits, today],
  )
  const pendingToday = useMemo(
    () =>
      scheduledToday
        .filter((h) => !isDoneOn(completions, today, h.id))
        .sort(byTime),
    [scheduledToday, completions, today],
  )
  const doneToday = useMemo(
    () => scheduledToday.filter((h) => isDoneOn(completions, today, h.id)),
    [scheduledToday, completions, today],
  )

  /* Strip ringkasan — tiga angka kunci dari histori nyata. */
  const maxStreak = useMemo(
    () =>
      activeHabits.reduce(
        (best, h) => Math.max(best, habitStreak(h, completions, today)),
        0,
      ),
    [activeHabits, completions, today],
  )
  const weekDoneTotal = useMemo(() => {
    let sum = 0
    let cursor = weekStartISO(today)
    for (let i = 0; i < 7 && cursor <= today; i++) {
      sum += doneCountOn(completions, cursor)
      cursor = addDaysISO(cursor, 1)
    }
    return sum
  }, [completions, today])
  const maturePlants = useMemo(
    () =>
      activeHabits.filter((h) => {
        const key = plantStageOf(h, completions, today).stage.key
        return key === 'pohon-dewasa' || key === 'berbunga'
      }).length,
    [activeHabits, completions, today],
  )

  /* Saran Coach — nudge "jangan bolong dua kali" (terlewat kemarin)
     lalu Goldilocks; maksimal tiga kartu, Goldilocks maksimal dua. */
  const coachCards = useMemo<
    (
      | { kind: 'missed'; habit: Habit }
      | { kind: 'goldilocks'; habit: Habit; advice: GoldilocksAdvice }
    )[]
  >(() => {
    const missed = missedYesterday(habits, completions, today)
      .slice(0, 3)
      .map((habit) => ({ kind: 'missed' as const, habit }))
    const room = Math.max(0, 3 - missed.length)
    const tips: { kind: 'goldilocks'; habit: Habit; advice: GoldilocksAdvice }[] =
      []
    for (const h of activeHabits) {
      if (tips.length >= Math.min(2, room)) break
      const advice = goldilocksOf(h, completions, today)
      if (advice) tips.push({ kind: 'goldilocks', habit: h, advice })
    }
    return [...missed, ...tips]
  }, [habits, completions, today, activeHabits])

  /* Semua kebiasaan aktif — dikelompokkan per kategori. */
  const catGroups = useMemo(
    () =>
      HABIT_CATS.map((cat) => ({
        cat,
        items: activeHabits
          .filter((h) => h.cat === cat)
          .sort((a, b) => a.title.localeCompare(b.title)),
      })).filter((g) => g.items.length > 0),
    [activeHabits],
  )

  /* Kebiasaan efektif untuk panel detail: id terpilih bila masih aktif,
     jatuh ke baris pertama daftar sebagai bawaan. Dihitung langsung saat
     render (React Compiler menangani memoisasinya) dan HANYA dipakai di
     JSX — nilai turunan state yang masuk ke closure memicu pembatalan
     memoisasi (pelajaran Task 2 pada handler kemarin). */
  const selectedHabit =
    (selectedId !== null
      ? activeHabits.find((h) => h.id === selectedId)
      : undefined) ??
    catGroups[0]?.items[0] ??
    null

  const hasNoHabits = habits.length === 0

  return (
    <div
      data-module="kebiasaan"
      className="h-full overflow-y-auto no-scrollbar overscroll-contain px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] text-content-primary"
    >
      {/* Kepala editorial tenang — tanggal panjang + ringkasan singkat.
          Titik & eyebrow memakai aksen Rose Clay (identitas kebun kebiasaan). */}
      <m.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.45,
          ease: motionTokens.easing.standard,
        }}
      >
        <RutinaSectionHeader
          eyebrow={longDateLabel(today)}
          title="Kebiasaan"
          description={`${activeHabits.length} kebiasaan aktif · ${doneToday.length}/${scheduledToday.length} selesai hari ini`}
          accent
        />
      </m.header>

      {hasNoHabits ? (
        /* Belum ada kebiasaan sama sekali — ajakan menanam yang pertama. */
        <m.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.06,
            ease: motionTokens.easing.standard,
          }}
          aria-label="Belum ada kebiasaan"
          className="mt-6"
        >
          <RutinaEmptyState
            icon={<Sprout className="h-6 w-6" />}
            title="Kebiasaan pertamamu menunggu ditanam"
            description="Mulai dari versi dua menit — satu tindakan kecil yang bisa kamu lakukan hari ini, biarkan tumbuh perlahan."
            action={
              <m.button
                type="button"
                onClick={openHabitCreate}
                whileTap={{ scale: 0.95 }}
                className="flex h-11 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-[13px] font-bold text-primary-foreground shadow-soft transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Plus className="h-4 w-4" strokeWidth={2.4} />
                Tanam kebiasaan pertama
              </m.button>
            }
          />
        </m.section>
      ) : (
        <>
          {/* Strip ringkasan — runtun, capaian pekan, taman */}
          <m.section
            aria-label="Ringkasan kebiasaan"
            className="mt-4"
            variants={journalList}
            initial="hidden"
            animate="show"
          >
            <div className="grid grid-cols-3 gap-2.5">
              <m.div variants={journalCard} className="h-full">
                <RutinaCard
                  variant="default"
                  density="compact"
                  radius="2xl"
                  className="h-full"
                >
                  <RutinaMetric
                    label="Runtun terbaik"
                    value={maxStreak}
                    unit="hari"
                    trend={maxStreak > 0 ? 'up' : 'neutral'}
                    caption="sedang berjalan"
                  />
                </RutinaCard>
              </m.div>
              <m.div variants={journalCard} className="h-full">
                <RutinaCard
                  variant="default"
                  density="compact"
                  radius="2xl"
                  className="h-full"
                >
                  <RutinaMetric
                    label="Selesai pekan ini"
                    value={weekDoneTotal}
                    unit="kali"
                    caption="Senin–hari ini"
                  />
                </RutinaCard>
              </m.div>
              <m.div variants={journalCard} className="h-full">
                <RutinaCard
                  variant="default"
                  density="compact"
                  radius="2xl"
                  className="h-full"
                >
                  <RutinaMetric
                    label="Tanaman"
                    value={maturePlants}
                    unit="pohon"
                    caption="dewasa / berbunga"
                  />
                </RutinaCard>
              </m.div>
            </div>
          </m.section>

          {/* Saran Coach — nudge hangat + Goldilocks, hanya bila ada */}
          {coachCards.length > 0 && (
            <section className="mt-6" aria-label="Saran Coach">
              <RutinaSectionHeader
                title="Saran Coach"
                description="Penyesuaian kecil dari hasil pekan ini"
              />
              <m.div
                variants={journalList}
                initial="hidden"
                animate="show"
                className="mt-3 space-y-2.5"
              >
                {coachCards.map((card) =>
                  card.kind === 'missed' ? (
                    <m.div
                      key={`missed-${card.habit.id}`}
                      variants={journalCard}
                      className="rounded-[16px] border border-gold/40 bg-gold/15 p-3.5"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/30 text-warning"
                        >
                          <Flame className="h-4 w-4" strokeWidth={2.2} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-content-primary">
                            {card.habit.title}
                          </p>
                          <p className="mt-0.5 text-[12px] leading-relaxed text-content-muted">
                            Terlewat kemarin — jangan bolong dua kali.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          /* Tanggal kemarin dihitung di dalam handler — nilai
                             turunan `today` yang di-pass ke aksi store di
                             level render membuat React Compiler membatalkan
                             memoisasi ("today" dianggap bisa berubah). */
                          toggleHabit(card.habit.id, addDaysISO(today, -1))
                          toast.success(
                            `"${card.habit.title}" kemarin selesai — runtun kembali utuh.`,
                          )
                        }}
                        className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-[12px] font-bold text-primary-foreground shadow-soft transition-all hover:bg-action-hover active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        <Check className="h-4 w-4" strokeWidth={2.6} />
                        Tandai selesai kemarin
                      </button>
                    </m.div>
                  ) : (
                    <m.div
                      key={`gold-${card.habit.id}`}
                      variants={journalCard}
                      className="flex items-start gap-3 rounded-[16px] border border-border bg-surface-primary p-3.5 shadow-soft"
                    >
                      <span
                        aria-hidden="true"
                        className={
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full ' +
                          (card.advice.tone === 'naik'
                            ? 'bg-secondary text-success'
                            : 'bg-espresso/10 text-espresso')
                        }
                      >
                        {card.advice.tone === 'naik' ? (
                          <Sparkles className="h-4 w-4" strokeWidth={2.2} />
                        ) : (
                          <Target className="h-4 w-4" strokeWidth={2.2} />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-content-primary">
                          {card.advice.title}
                        </p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-content-muted">
                          {card.advice.text}
                        </p>
                      </div>
                    </m.div>
                  ),
                )}
              </m.div>
            </section>
          )}

          {/* Agenda hari ini — yang menunggu, selesai terlipat */}
          <section className="mt-6" aria-label="Agenda hari ini">
            <RutinaSectionHeader
              title="Agenda hari ini"
              description="Yang menunggu hari ini, urut waktu"
              action={
                <span
                  aria-current="date"
                  className="flex h-9 items-center gap-1.5 rounded-full bg-module-accent/15 px-3 text-[11px] font-bold text-module-accent-strong"
                >
                  <CalendarDays
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                    strokeWidth={2.2}
                  />
                  Hari ini
                </span>
              }
            />

            {scheduledToday.length === 0 ? (
              <div className="mt-4">
                <RutinaEmptyState
                  icon={<CalendarDays className="h-6 w-6" />}
                  title="Tidak ada agenda terjadwal"
                  description="Hari ini bebas dari jadwal — nikmati jedamu, atau tanam kebiasaan baru kapan pun siap."
                />
              </div>
            ) : (
              <>
                {pendingToday.length > 0 && (
                  <m.div
                    variants={journalList}
                    initial="hidden"
                    animate="show"
                    className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2"
                  >
                    {pendingToday.map((h) => (
                      <m.div key={h.id} variants={journalCard}>
                        <TaskRow
                          habit={h}
                          done={false}
                          streak={habitStreak(h, completions, today)}
                          recent={recentDays(completions, h.id, today)}
                          weekDone={weekDoneCount(completions, h.id, today)}
                          expanded={expandedTaskId === h.id}
                          xp={XP_PER_TASK}
                          onToggle={() => {
                            /* Centang dari daftar terbuka memindahkan baris
                               ke lipatan Selesai — buka agar terlihat. */
                            toggleHabit(h.id, today)
                            setShowDone(true)
                          }}
                          onExpand={() => toggleExpandedTask(h.id)}
                          onEdit={() => openHabitEdit(h.id)}
                        />
                      </m.div>
                    ))}
                  </m.div>
                )}

                {doneToday.length > 0 && (
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => setShowDone((v) => !v)}
                      aria-expanded={showDone}
                      aria-controls="kebiasaan-done-panel"
                      className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-2xl border border-module-accent/25 bg-module-accent-soft/60 px-3.5 py-2.5 text-left transition-colors hover:bg-module-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-4 w-4" strokeWidth={2.6} />
                      </span>
                      <span className="flex-1 text-[12px] font-bold uppercase tracking-[0.14em] text-content-secondary">
                        Selesai ({doneToday.length})
                      </span>
                      <m.span
                        aria-hidden="true"
                        animate={{ rotate: showDone ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                        className="text-content-muted"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </m.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {showDone && (
                        <m.div
                          id="kebiasaan-done-panel"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{
                            duration: motionTokens.duration.normal,
                            ease: motionTokens.easing.standard,
                          }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-1 gap-2.5 pt-2.5 sm:grid-cols-2">
                            {doneToday.map((h) => (
                              <TaskRow
                                key={h.id}
                                habit={h}
                                done
                                streak={habitStreak(h, completions, today)}
                                recent={recentDays(completions, h.id, today)}
                                weekDone={weekDoneCount(completions, h.id, today)}
                                expanded={expandedTaskId === h.id}
                                xp={XP_PER_TASK}
                                onToggle={() => toggleHabit(h.id, today)}
                                onExpand={() => toggleExpandedTask(h.id)}
                                onEdit={() => openHabitEdit(h.id)}
                              />
                            ))}
                          </div>
                        </m.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Taman Pertumbuhan — PlantGarden membawa header seksinya sendiri */}
          <section aria-label="Taman Pertumbuhan">
            <PlantGarden />
          </section>

          {/* Semua kebiasaan — dikelompokkan per kategori + arsip */}
          <section className="mt-6" aria-label="Semua kebiasaan">
            <RutinaSectionHeader
              title="Semua kebiasaan"
              description="Dikelompokkan per kategori"
            />

            {activeHabits.length === 0 ? (
              <div className="mt-4">
                <RutinaEmptyState
                  icon={<Sprout className="h-6 w-6" />}
                  title="Tidak ada kebiasaan aktif"
                  description="Semua kebiasaan sedang diarsipkan — pulihkan dari arsip di bawah, atau tanam yang baru."
                />
              </div>
            ) : (
              /* Split-screen desktop (xl+): daftar terkelompok di kiri,
                 panel detail menempel di kanan. Di bawah xl susunan tetap
                 satu kolom — panel tersembunyi total. */
              <div className="xl:grid xl:grid-cols-12 xl:gap-5">
                {/* Kolom kiri — daftar terkelompok per kategori (tak berubah) */}
                <div className="min-w-0 xl:col-span-7">
                  <m.div
                    variants={journalList}
                    initial="hidden"
                    animate="show"
                    className="mt-4 space-y-5"
                  >
                    {catGroups.map((g) => (
                      <m.div key={g.cat} variants={journalCard}>
                        <div className="mb-2.5 flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: HABIT_CAT_COLORS[g.cat] }}
                          />
                          <h3 className="text-[12px] font-bold uppercase tracking-[0.16em] text-content-secondary">
                            {g.cat}
                          </h3>
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-content-secondary">
                            {g.items.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {g.items.map((h) => (
                            /* Pembungkus pemilihan: klik di mana pun pada kartu
                               memilih kebiasaan untuk panel detail. Tombol
                               centang TaskRow sudah stopPropagation sehingga
                               perilaku tandai-selesai tak terganggu; cincin
                               aksen hanya tampil di xl+. */
                            <div
                              key={h.id}
                              onClick={() => setSelectedId(h.id)}
                              className={
                                'rounded-[16px] transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 xl:ring-2 ' +
                                (selectedHabit?.id === h.id
                                  ? 'xl:ring-primary/60'
                                  : 'xl:ring-transparent')
                              }
                            >
                              <TaskRow
                                habit={h}
                                done={isDoneOn(completions, today, h.id)}
                                streak={habitStreak(h, completions, today)}
                                recent={recentDays(completions, h.id, today)}
                                weekDone={weekDoneCount(completions, h.id, today)}
                                expanded={expandedTaskId === h.id}
                                xp={XP_PER_TASK}
                                onToggle={() => toggleHabit(h.id, today)}
                                onExpand={() => {
                                  toggleExpandedTask(h.id)
                                  /* Pemilihan ikut terpasang lewat pintasan
                                     keyboard TaskRow (Enter/Spasi). */
                                  setSelectedId(h.id)
                                }}
                                onEdit={() => openHabitEdit(h.id)}
                              />
                            </div>
                          ))}
                        </div>
                      </m.div>
                    ))}
                  </m.div>
                </div>

                {/* Kolom kanan — Panel Detail Kebiasaan (hanya desktop xl+).
                   self-start + max-h agar penempatan menempel tidak meluber:
                   panel menggulir sendiri bila kontennya lebih tinggi. */}
                {selectedHabit && (
                  <aside
                    aria-label="Detail kebiasaan terpilih"
                    className="hidden self-start xl:sticky xl:top-0 xl:col-span-5 xl:mt-4 xl:block xl:max-h-[calc(100dvh-12rem)] xl:overflow-y-auto no-scrollbar"
                  >
                    <HabitDetailPanel
                      key={selectedHabit.id}
                      habit={selectedHabit}
                      habits={habits}
                      completions={completions}
                      today={today}
                      onEdit={openHabitEdit}
                    />
                  </aside>
                )}
              </div>
            )}

            {/* Arsip — pulihkan atau sunting kebiasaan yang ditanggalkan.
                Buka/tutup kini memakai Radix Collapsible (shadcn/ui) —
                state lokal showArchive tetap dipakai (mode terkontrol). */}
            {archivedHabits.length > 0 && (
              <Collapsible
                open={showArchive}
                onOpenChange={setShowArchive}
                className="mt-6"
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="group flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border bg-surface-primary px-3.5 py-2.5 text-left shadow-soft transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=open]:bg-surface-sunken"
                  >
                    <span className="flex items-center gap-2 text-[12px] font-bold text-content-secondary">
                      <Archive className="h-3.5 w-3.5" />
                      Arsip ({archivedHabits.length})
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className="h-4 w-4 text-content-muted transition-transform duration-300 group-data-[state=open]:rotate-180"
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 pt-2.5">
                    {archivedHabits.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center gap-3 rounded-2xl border border-border bg-surface-primary px-3.5 py-2.5 shadow-soft"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-content-muted">
                          <Archive className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-content-secondary">
                            {h.title}
                          </span>
                          <span className="block text-[11px] font-medium text-content-muted">
                            {h.cat} · diarsipkan
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setHabitArchived(h.id, false)
                            toast.success('Kebiasaan dipulihkan dari arsip')
                          }}
                          aria-label={`Pulihkan ${h.title} dari arsip`}
                          className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-primary/40 px-4 text-[12px] font-bold text-success transition-colors hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          <ArchiveRestore className="h-3.5 w-3.5" />
                          Pulihkan
                        </button>
                        <button
                          type="button"
                          onClick={() => openHabitEdit(h.id)}
                          aria-label={`Sunting ${h.title}`}
                          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border text-content-secondary transition-colors hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </section>
        </>
      )}

      {/* CTA di ujung konten — pintu utama menanam kebiasaan baru */}
      <m.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-20px' }}
        transition={{ duration: 0.45, ease: motionTokens.easing.standard }}
        className="mt-8"
      >
        <button
          type="button"
          onClick={openHabitCreate}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-bold text-primary-foreground shadow-soft transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.4} />
          Kebiasaan baru
        </button>
      </m.div>
    </div>
  )
}
