'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import {
  Apple,
  Flame,
  Minus,
  Plus,
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
        <p className="truncate text-[13px] font-bold text-content-primary">
          {entry.name}
        </p>
        <p className="text-[11px] font-medium text-content-muted">
          {portionLabel}
          {portionLabel ? '' : ''}
          {entry.unit}
          {entry.portion !== 1 ? ` (${portionLabel.trim()})` : ''}
        </p>
      </div>
      <span className="shrink-0 text-[13px] font-bold tabular-nums text-content-primary">
        {fmt(entry.kcal)}
        <span className="ml-0.5 text-[10px] font-semibold text-content-muted">
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

  const [editingTarget, setEditingTarget] = useState(false)
  const [targetDraft, setTargetDraft] = useState('2000')

  const today = todayISO()
  const todayEntries = useMemo(
    () => entriesOn(foodEntries, today),
    [foodEntries, today],
  )
  const sum = useMemo(() => summarize(todayEntries), [todayEntries])

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

  const remaining = calorieTarget - sum.kcal
  const pct = Math.min((sum.kcal / Math.max(calorieTarget, 1)) * 100, 100)

  return (
    <div>
      {/* Neraca kalori hari ini */}
      <m.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        aria-label="Neraca kalori hari ini"
        className="overflow-hidden rounded-[24px] bg-primary p-6 text-primary-foreground shadow-leaf"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-primary-foreground/80">
              <Flame className="h-4 w-4" />
              Asupan hari ini
            </p>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="text-[44px] font-semibold leading-none tracking-tight tabular-nums">
                {fmt(sum.kcal)}
              </span>
              <span className="text-lg font-medium text-primary-foreground/85">
                / {fmt(calorieTarget)} kkal
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
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-[11.5px] font-bold text-primary-foreground transition-colors hover:bg-primary-foreground/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
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
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-primary-foreground/15 text-primary-foreground transition-colors hover:bg-primary-foreground/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
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
                  className="h-10 flex-1 rounded-xl border-transparent bg-primary-foreground/15 text-center text-[15px] font-bold tabular-nums text-primary-foreground placeholder:text-primary-foreground/50 focus-visible:border-primary-foreground/40 focus-visible:ring-primary-foreground/20"
                />
                <button
                  type="button"
                  aria-label="Tambah target 100 kkal"
                  onClick={() =>
                    setTargetDraft(String(Math.min(4500, Number(targetDraft) + 100)))
                  }
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-primary-foreground/15 text-primary-foreground transition-colors hover:bg-primary-foreground/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
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
                  className="h-10 shrink-0 cursor-pointer rounded-xl bg-primary-foreground px-4 text-[12.5px] font-bold text-content-primary transition-transform active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
                >
                  Simpan
                </button>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Bar progres */}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary-foreground/25">
          <m.div
            initial={false}
            className="h-full rounded-full bg-primary-foreground"
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 130, damping: 22 }}
          />
        </div>
        <p className="mt-2 text-[12px] font-semibold text-primary-foreground/85">
          {remaining > 0
            ? `Sisa ${fmt(remaining)} kkal untuk hari ini`
            : remaining === 0
              ? 'Pas sesuai target — kerja bagus!'
              : `Surplus ${fmt(-remaining)} kkal dari target`}
        </p>

        {/* Makro */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-espresso/35 p-3 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-[18px] font-bold leading-none tabular-nums">
              {fmt(sum.protein)}<span className="text-[11px] font-semibold"> g</span>
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground/70">
              protein
            </p>
          </div>
          <div className="text-center">
            <p className="text-[18px] font-bold leading-none tabular-nums">
              {fmt(sum.carb)}<span className="text-[11px] font-semibold"> g</span>
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground/70">
              karbohidrat
            </p>
          </div>
          <div className="text-center">
            <p className="text-[18px] font-bold leading-none tabular-nums">
              {fmt(sum.fat)}<span className="text-[11px] font-semibold"> g</span>
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground/70">
              lemak
            </p>
          </div>
        </div>
        {!sum.macroKnown && todayEntries.length > 0 && (
          <p className="mt-2 text-[10.5px] leading-relaxed text-primary-foreground/70">
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
        className="mt-3 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-surface-inverse text-[15px] font-bold text-content-inverse shadow-soft transition-colors hover:bg-espresso-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
        Tambah Asupan
      </m.button>

      {/* Jurnal makan hari ini */}
      <section className="mt-7" aria-label="Jurnal makan hari ini">
        <div className="flex items-center justify-between gap-3 px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-content-secondary">
              Jurnal Makan
            </h2>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-success">
              {todayEntries.length}
            </span>
          </div>
          <span className="text-[11px] font-medium text-content-muted">
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
                  <p className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-content-muted">
                    {slot.label}
                  </p>
                  {rows.length > 0 && (
                    <span className="text-[11px] font-semibold tabular-nums text-content-muted">
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
                    <p className="text-[11.5px] font-medium text-content-muted">
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
              <p className="mt-2 text-[13px] font-semibold text-content-muted">
                Jurnal makan masih kosong
              </p>
              <p className="mt-0.5 text-[11.5px] text-content-muted">
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
          <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-content-secondary">
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
                    className={`text-[10px] font-bold ${
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
            <p className="text-center text-[10.5px] font-semibold text-content-muted">
              Garis batang hijau = hari ini · target {fmt(calorieTarget)} kkal/hari
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
