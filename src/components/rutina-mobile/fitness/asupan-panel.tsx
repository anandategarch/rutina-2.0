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
      className="flex items-center gap-3 rounded-2xl border border-[#4A3B3214] bg-white p-3 shadow-soft"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E4EFE0] text-[#658A4C]">
        <Utensils className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-[#231F1E]">
          {entry.name}
        </p>
        <p className="text-[11px] font-medium text-[#4A3B32]/65">
          {portionLabel}
          {portionLabel ? '' : ''}
          {entry.unit}
          {entry.portion !== 1 ? ` (${portionLabel.trim()})` : ''}
        </p>
      </div>
      <span className="shrink-0 text-[13px] font-bold tabular-nums text-[#231F1E]">
        {fmt(entry.kcal)}
        <span className="ml-0.5 text-[10px] font-semibold text-[#4A3B32]/55">
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
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#4A3B32]/45 transition-colors hover:bg-[#B25E3F]/10 hover:text-[#B25E3F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B25E3F]"
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
        className="overflow-hidden rounded-[24px] bg-[#749B58] p-6 text-[#FAF9F6] shadow-leaf"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-[#FAF9F6]/80">
              <Flame className="h-4 w-4" />
              Asupan hari ini
            </p>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="text-[44px] font-semibold leading-none tracking-tight tabular-nums">
                {fmt(sum.kcal)}
              </span>
              <span className="text-lg font-medium text-[#FAF9F6]/85">
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
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[#FAF9F6]/15 px-3 py-1.5 text-[11.5px] font-bold text-[#FAF9F6] transition-colors hover:bg-[#FAF9F6]/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAF9F6]"
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
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#FAF9F6]/15 text-[#FAF9F6] transition-colors hover:bg-[#FAF9F6]/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAF9F6]"
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
                  className="h-10 flex-1 rounded-xl border-transparent bg-[#FAF9F6]/15 text-center text-[15px] font-bold tabular-nums text-[#FAF9F6] placeholder:text-[#FAF9F6]/50 focus-visible:border-[#FAF9F6]/40 focus-visible:ring-[#FAF9F6]/20"
                />
                <button
                  type="button"
                  aria-label="Tambah target 100 kkal"
                  onClick={() =>
                    setTargetDraft(String(Math.min(4500, Number(targetDraft) + 100)))
                  }
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#FAF9F6]/15 text-[#FAF9F6] transition-colors hover:bg-[#FAF9F6]/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAF9F6]"
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
                  className="h-10 shrink-0 cursor-pointer rounded-xl bg-[#FAF9F6] px-4 text-[12.5px] font-bold text-[#231F1E] transition-transform active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAF9F6]"
                >
                  Simpan
                </button>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Bar progres */}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#FAF9F6]/25">
          <m.div
            initial={false}
            className="h-full rounded-full bg-[#FAF9F6]"
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 130, damping: 22 }}
          />
        </div>
        <p className="mt-2 text-[12px] font-semibold text-[#FAF9F6]/85">
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
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#FAF9F6]/70">
              protein
            </p>
          </div>
          <div className="text-center">
            <p className="text-[18px] font-bold leading-none tabular-nums">
              {fmt(sum.carb)}<span className="text-[11px] font-semibold"> g</span>
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#FAF9F6]/70">
              karbohidrat
            </p>
          </div>
          <div className="text-center">
            <p className="text-[18px] font-bold leading-none tabular-nums">
              {fmt(sum.fat)}<span className="text-[11px] font-semibold"> g</span>
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#FAF9F6]/70">
              lemak
            </p>
          </div>
        </div>
        {!sum.macroKnown && todayEntries.length > 0 && (
          <p className="mt-2 text-[10.5px] leading-relaxed text-[#FAF9F6]/70">
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
        className="mt-3 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#231F1E] text-[15px] font-bold text-[#FAF9F6] shadow-soft transition-colors hover:bg-[#3A2E24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
        Tambah Asupan
      </m.button>

      {/* Jurnal makan hari ini */}
      <section className="mt-7" aria-label="Jurnal makan hari ini">
        <div className="flex items-center justify-between gap-3 px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#4A3B32]">
              Jurnal Makan
            </h2>
            <span className="rounded-full bg-[#E4EFE0] px-2 py-0.5 text-[11px] font-bold text-[#658A4C]">
              {todayEntries.length}
            </span>
          </div>
          <span className="text-[11px] font-medium text-[#4A3B32]/60">
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
                  <p className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#4A3B32]/70">
                    {slot.label}
                  </p>
                  {rows.length > 0 && (
                    <span className="text-[11px] font-semibold tabular-nums text-[#4A3B32]/60">
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
                  <div className="rounded-2xl border border-dashed border-[#4A3B32]/20 px-4 py-3 text-center">
                    <p className="text-[11.5px] font-medium text-[#4A3B32]/55">
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
              className="rounded-[20px] border-2 border-dashed border-[#749B58]/30 px-6 py-9 text-center"
            >
              <Apple className="mx-auto h-6 w-6 text-[#4A3B32]/60" />
              <p className="mt-2 text-[13px] font-semibold text-[#4A3B32]/75">
                Jurnal makan masih kosong
              </p>
              <p className="mt-0.5 text-[11.5px] text-[#4A3B32]/60">
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
          <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#4A3B32]">
            7 Hari Terakhir
          </h2>
        </div>
        <div className="mt-3 rounded-[20px] border border-[#4A3B3214] bg-white p-4 shadow-soft">
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
                  <span className="text-[9px] font-bold tabular-nums text-[#4A3B32]/55">
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
                        isToday ? 'bg-[#749B58]' : 'bg-[#D8E8CF]'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-bold ${
                      isToday ? 'text-[#658A4C]' : 'text-[#4A3B32]/55'
                    }`}
                  >
                    {DAY_LABELS[new Date(d + 'T00:00:00').getDay()]}
                  </span>
                </div>
              )
            })}
          </div>
          {/* Garis target */}
          <div className="mt-3 border-t border-dashed border-[#4A3B32]/15 pt-2.5">
            <p className="text-center text-[10.5px] font-semibold text-[#4A3B32]/60">
              Garis batang hijau = hari ini · target {fmt(calorieTarget)} kkal/hari
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
