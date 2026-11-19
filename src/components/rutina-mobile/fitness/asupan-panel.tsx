'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import {
  AlertTriangle,
  Apple,
  Flame,
  Minus,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Utensils,
} from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import {
  addDaysISO,
  MEAL_SLOTS,
  todayISO,
  useRutina,
  type FoodEntry,
} from '../store'
import { FOOD_DB } from './food-db'
import { burnedToday } from './fit-utils'

/* ===== Utilitas asupan ===== */

function fmt(n: number): string {
  return Math.round(n).toLocaleString('id-ID')
}

/** Ringkasan nutrisi sekumpulan entri. */
function summarize(entries: FoodEntry[]) {
  let kcal = 0
  let protein = 0
  let carb = 0
  let fat = 0
  let macroKnown = false
  for (const e of entries) {
    kcal += e.kcal
    if (e.protein != null) {
      macroKnown = true
      protein += e.protein
    }
    if (e.carb != null) carb += e.carb
    if (e.fat != null) fat += e.fat
  }
  return { kcal, protein, carb, fat, macroKnown }
}

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

/** Entri jurnal untuk satu tanggal, diurut sesuai slot waktu makan. */
function entriesOn(entries: FoodEntry[], date: string): FoodEntry[] {
  return MEAL_SLOTS.flatMap((slot) =>
    entries.filter((e) => e.date === date && e.meal === slot.key),
  )
}

/* ===== Baris jurnal makan ===== */

function FoodRow({ entry }: { entry: FoodEntry }) {
  const deleteFoodEntry = useRutina((s) => s.deleteFoodEntry)
  const portionLabel =
    entry.portion === 0.5
      ? '½'
      : entry.portion === 1
        ? ''
        : entry.portion === 1.5
          ? '1½× '
          : '2× '
  return (
    <m.div
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface-primary p-3 shadow-soft"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-success">
        <Utensils className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-note font-semibold text-content-primary">
          {entry.name}
        </p>
        <p className="text-eyebrow font-medium text-content-muted">
          {portionLabel}
          {portionLabel ? '' : ''}
          {entry.unit}
          {entry.portion !== 1 ? ` (${portionLabel.trim()})` : ''}
        </p>
      </div>
      <span className="shrink-0 text-note font-bold tabular-nums text-content-primary">
        {fmt(entry.kcal)}
        <span className="ml-0.5 text-chart-label font-semibold text-content-muted">
          kkal
        </span>
      </span>
      <button
        type="button"
        aria-label={`Hapus ${entry.name}`}
        onClick={() => {
          deleteFoodEntry(entry.id)
          toast(`${entry.name} dihapus dari jurnal.`)
        }}
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-content-muted transition-colors hover:bg-destructive/10 hover:text-content-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </m.div>
  )
}

/* ===== Panel Asupan ===== */

export function AsupanPanel() {
  const foodEntries = useRutina((s) => s.foodEntries)
  const calorieTarget = useRutina((s) => s.calorieTarget)
  const setCalorieTarget = useRutina((s) => s.setCalorieTarget)
  const openFoodSheet = useRutina((s) => s.openFoodSheet)
  const workouts = useRutina((s) => s.workouts)
  const bodyLogs = useRutina((s) => s.bodyLogs)

  const [editingTarget, setEditingTarget] = useState(false)
  const [targetDraft, setTargetDraft] = useState('2000')

  const today = todayISO()
  const todayEntries = useMemo(
    () => entriesOn(foodEntries, today),
    [foodEntries, today],
  )
  const sum = useMemo(() => summarize(todayEntries), [todayEntries])

  /* Energi terbakar hari ini (MET × berat × durasi) — jatah tambahan
     di atas target: Sisa = Target + Terbakar − Masuk. */
  const burned = useMemo(
    () => burnedToday(workouts, bodyLogs, today),
    [workouts, bodyLogs, today],
  )
  const allowance = calorieTarget + burned

  /* Deret 7 hari untuk grafik mini. */
  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) =>
      addDaysISO(today, i - 6),
    )
    const kcalByDay = days.map((d) =>
      foodEntries
        .filter((e) => e.date === d)
        .reduce((a, e) => a + e.kcal, 0),
    )
    const max = Math.max(...kcalByDay, calorieTarget)
    return { days, kcalByDay, max }
  }, [foodEntries, today, calorieTarget])

  const remaining = allowance - sum.kcal
  const pct = Math.min((sum.kcal / Math.max(allowance, 1)) * 100, 100)

  return (
    <div>
      {/* Neraca kalori hari ini */}
      <m.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        aria-label="Neraca kalori hari ini"
        className="overflow-hidden rounded-[24px] bg-module-accent-strong p-6 text-module-accent-fg shadow-leaf"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-note font-medium text-module-accent-fg/85">
              <Flame className="h-4 w-4" />
              Asupan hari ini
            </p>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="text-kpi-hero font-semibold leading-none tracking-tight tabular-nums">
                {fmt(sum.kcal)}
              </span>
              <span className="text-lg font-medium text-module-accent-fg/85">
                / {fmt(allowance)} kkal
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setTargetDraft(String(calorieTarget))
              setEditingTarget((v) => !v)
            }}
            aria-expanded={editingTarget}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-module-accent-fg/15 px-3 py-1.5 text-meta font-bold text-module-accent-fg transition-colors hover:bg-module-accent-fg/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-module-accent-fg"
          >
            <Target className="h-3.5 w-3.5" />
            Atur target
          </button>
        </div>

        {/* Editor target — inline, langkah 100 kkal */}
        <AnimatePresence initial={false}>
          {editingTarget && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-espresso/35 p-2.5 backdrop-blur-sm">
                <button
                  type="button"
                  aria-label="Kurangi target 100 kkal"
                  onClick={() =>
                    setTargetDraft(String(Math.max(1200, Number(targetDraft) - 100)))
                  }
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-module-accent-fg/15 text-module-accent-fg transition-colors hover:bg-module-accent-fg/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-module-accent-fg"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <Input
                  aria-label="Target kalori harian"
                  inputMode="numeric"
                  value={targetDraft}
                  onChange={(e) =>
                    setTargetDraft(e.target.value.replace(/\D/g, '').slice(0, 4))
                  }
                  className="h-10 flex-1 rounded-xl border-transparent bg-module-accent-fg/15 text-center text-section font-bold tabular-nums text-module-accent-fg placeholder:text-module-accent-fg/50 focus-visible:border-module-accent-fg/40 focus-visible:ring-module-accent-fg/20"
                />
                <button
                  type="button"
                  aria-label="Tambah target 100 kkal"
                  onClick={() =>
                    setTargetDraft(String(Math.min(4500, Number(targetDraft) + 100)))
                  }
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-module-accent-fg/15 text-module-accent-fg transition-colors hover:bg-module-accent-fg/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-module-accent-fg"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const v = Number(targetDraft)
                    if (v >= 1200 && v <= 4500) {
                      setCalorieTarget(v)
                      setEditingTarget(false)
                      toast.success(`Target harian: ${fmt(v)} kkal`)
                    } else {
                      toast.warning('Target antara 1.200 – 4.500 kkal')
                    }
                  }}
                  className="h-10 shrink-0 cursor-pointer rounded-xl bg-module-accent-fg px-4 text-note font-semibold text-content-primary transition-transform active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-module-accent-fg"
                >
                  Simpan
                </button>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Bar progres — terisi relatif jatah (target + terbakar) */}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-module-accent-fg/25">
          <m.div
            initial={false}
            className="h-full rounded-full bg-module-accent-fg"
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 130, damping: 22 }}
          />
        </div>

        {/* Energi terbakar — baris tambahan neraca v2 */}
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-espresso/35 px-3.5 py-2.5 backdrop-blur-sm">
          <p className="flex items-center gap-1.5 text-meta font-semibold text-module-accent-fg/90">
            <Flame className="h-4 w-4 text-gold" aria-hidden="true" />
            Energi terbakar
          </p>
          <p className="text-note font-bold tabular-nums text-module-accent-fg">
            +{fmt(burned)}
            <span className="ml-0.5 text-chart-label font-semibold text-module-accent-fg/75">
              kkal
            </span>
          </p>
        </div>
        {burned === 0 && (
          <p className="mt-1.5 px-0.5 text-eyebrow font-medium text-module-accent-fg/80">
            Catat latihan di Bugar untuk menambah jatah.
          </p>
        )}

        {/* Coaching adaptif — menggantikan teks sisa lama */}
        {remaining < -300 ? (
          <p className="mt-2 flex items-start gap-2 rounded-xl bg-espresso/35 px-3 py-2.5 text-meta font-semibold leading-relaxed text-module-accent-fg">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-gold"
              aria-hidden="true"
            />
            Defisit terlalu dalam — jatah energi sudah terlampaui{' '}
            {fmt(-remaining)} kkal. Tambah asupan sehat atau kurangi
            intensitas.
          </p>
        ) : remaining < 0 ? (
          <p className="mt-2 px-0.5 text-meta font-semibold text-module-accent-fg/85">
            Sedikit di atas jatah — tidak masalah, seimbangkan besok.
          </p>
        ) : remaining <= 400 ? (
          <p className="mt-2 flex items-center gap-1.5 px-0.5 text-meta font-semibold text-module-accent-fg">
            <Sparkles
              className="h-4 w-4 shrink-0 text-module-accent-fg"
              aria-hidden="true"
            />
            Sisa {fmt(remaining)} kkal — tempo yang pas untuk hari ini.
          </p>
        ) : (
          <p className="mt-2 px-0.5 text-meta font-semibold text-module-accent-fg/85">
            Masih ada {fmt(remaining)} kkal jatah — jangan lewatkan energi
            untuk pemulihan.
          </p>
        )}

        {/* Makro */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-espresso/35 p-3 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-lead font-bold leading-none tabular-nums">
              {fmt(sum.protein)}<span className="text-eyebrow font-semibold"> g</span>
            </p>
            <p className="mt-1 text-chart-label font-semibold uppercase tracking-wide text-module-accent-fg/70">
              protein
            </p>
          </div>
          <div className="text-center">
            <p className="text-lead font-bold leading-none tabular-nums">
              {fmt(sum.carb)}<span className="text-eyebrow font-semibold"> g</span>
            </p>
            <p className="mt-1 text-chart-label font-semibold uppercase tracking-wide text-module-accent-fg/70">
              karbohidrat
            </p>
          </div>
          <div className="text-center">
            <p className="text-lead font-bold leading-none tabular-nums">
              {fmt(sum.fat)}<span className="text-eyebrow font-semibold"> g</span>
            </p>
            <p className="mt-1 text-chart-label font-semibold uppercase tracking-wide text-module-accent-fg/70">
              lemak
            </p>
          </div>
        </div>
        {!sum.macroKnown && todayEntries.length > 0 && (
          <p className="mt-2 text-eyebrow leading-relaxed text-module-accent-fg/70">
            Sebagian makanan di master belum punya rincian makro — kalori tetap
            dihitung penuh.
          </p>
        )}
      </m.section>

      {/* Tombol tambah asupan */}
      <m.button
        type="button"
        onClick={openFoodSheet}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
        className="mt-3 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-surface-inverse text-section font-bold text-content-inverse shadow-soft transition-colors hover:bg-espresso-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
        Tambah Asupan
      </m.button>

      {/* Jurnal makan hari ini */}
      <section className="mt-7" aria-label="Jurnal makan hari ini">
        <div className="flex items-center justify-between gap-3 px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-note font-bold uppercase tracking-[0.16em] text-content-secondary">
              Jurnal Makan
            </h2>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-eyebrow font-semibold text-success">
              {todayEntries.length}
            </span>
          </div>
          <span className="text-eyebrow font-medium text-content-muted">
            {FOOD_DB.length} makanan di master
          </span>
        </div>

        <div className="mt-3 space-y-4">
          {MEAL_SLOTS.map((slot) => {
            const rows = todayEntries.filter((e) => e.meal === slot.key)
            if (rows.length === 0 && todayEntries.length > 0) return null
            return (
              <div key={slot.key}>
                <div className="mb-2 flex items-center justify-between px-0.5">
                  <p className="text-meta font-bold uppercase tracking-[0.12em] text-content-muted">
                    {slot.label}
                  </p>
                  {rows.length > 0 && (
                    <span className="text-eyebrow font-semibold tabular-nums text-content-muted">
                      {fmt(rows.reduce((a, e) => a + e.kcal, 0))} kkal
                    </span>
                  )}
                </div>
                <AnimatePresence initial={false} mode="popLayout">
                  {rows.map((e) => (
                    <div key={e.id} className="mb-2">
                      <FoodRow entry={e} />
                    </div>
                  ))}
                </AnimatePresence>
                {rows.length === 0 && todayEntries.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-3 text-center">
                    <p className="text-meta font-medium text-content-muted">
                      Belum ada catatan {slot.label.toLowerCase()}
                    </p>
                  </div>
                )}
              </div>
            )
          })}

          {todayEntries.length === 0 && (
            <m.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[20px] border-2 border-dashed border-primary/30 px-6 py-9 text-center"
            >
              <Apple className="mx-auto h-6 w-6 text-content-muted" />
              <p className="mt-2 text-note font-semibold text-content-muted">
                Jurnal makan masih kosong
              </p>
              <p className="mt-0.5 text-meta text-content-muted">
                Cari makanan Indonesia di master — kalori &amp; makro terisi
                otomatis.
              </p>
            </m.div>
          )}
        </div>
      </section>

      {/* Tren 7 hari */}
      <section className="mt-8" aria-label="Tren kalori 7 hari">
        <div className="flex items-center gap-2 px-0.5">
          <h2 className="text-note font-bold uppercase tracking-[0.16em] text-content-secondary">
            7 Hari Terakhir
          </h2>
        </div>
        <div className="mt-3 rounded-[20px] border border-border bg-surface-primary p-4 shadow-soft">
          <div className="flex h-32 items-end gap-1.5">
            {week.days.map((d, i) => {
              const kcal = week.kcalByDay[i]
              const h =
                week.max > 0 ? Math.max((kcal / week.max) * 100, 2) : 2
              const isToday = d === today
              return (
                <div
                  key={d}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                >
                  <span className="text-[9px] font-bold tabular-nums text-content-muted">
                    {kcal > 0 ? fmt(kcal) : ''}
                  </span>
                  <div className="flex h-full w-full items-end">
                    <m.div
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{
                        duration: 0.5,
                        delay: i * 0.05,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className={`w-full rounded-t-lg ${
                        isToday ? 'bg-primary' : 'bg-secondary'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-chart-label font-semibold ${
                      isToday ? 'text-success' : 'text-content-muted'
                    }`}
                  >
                    {DAY_LABELS[new Date(d + 'T00:00:00').getDay()]}
                  </span>
                </div>
              )
            })}
          </div>
          {/* Garis target */}
          <div className="mt-3 border-t border-dashed border-border pt-2.5">
            <p className="text-center text-eyebrow font-semibold text-content-muted">
              Garis batang hijau = hari ini · target {fmt(calorieTarget)} kkal/hari
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
