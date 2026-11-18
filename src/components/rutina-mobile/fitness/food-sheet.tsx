'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, useDragControls } from 'motion/react'
import * as m from 'motion/react-m'
import { Minus, Plus, Search, Utensils } from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { CONTENT_W } from '../layout-widths'
import {
  MEAL_SLOTS,
  todayISO,
  useRutina,
  type MealSlot,
} from '../store'
import { useFocusTrap } from '../use-focus-trap'
import { FOOD_DB, type FoodItem } from './food-db'

/**
 * Lembar tambah asupan — pencarian master 179 makanan Indonesia
 * dengan skor kecocokan (awal-kata > awal-token > substring),
 * stepper porsi, dan pemilih waktu makan.
 */

/* Skor pencarian ala Rutina v3: awal-kata 3, awal-token 2, substring 1.
   Hasil diurut skor lalu nama; 6 teratas agar daftar tetap ringkas. */
function searchFoods(q: string): FoodItem[] {
  const query = q.trim().toLowerCase()
  if (query.length < 2) return []
  const scored: { f: FoodItem; s: number }[] = []
  for (const f of FOOD_DB) {
    const n = f.name.toLowerCase()
    let s = 0
    if (n.startsWith(query)) s = 3
    else if (n.split(' ').some((w) => w.startsWith(query))) s = 2
    else if (n.includes(query)) s = 1
    if (s > 0) scored.push({ f, s })
  }
  return scored
    .sort((a, b) => b.s - a.s || a.f.name.localeCompare(b.f.name))
    .slice(0, 6)
    .map((x) => x.f)
}

/* Pilihan pengali porsi — pas untuk konteks makanan Indonesia. */
const PORTIONS = [0.5, 1, 1.5, 2]

function portionLabel(p: number): string {
  return p === 0.5 ? '½×' : p === 1 ? '1×' : p === 1.5 ? '1½×' : '2×'
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('id-ID')
}

export function FoodSheet() {
  const open = useRutina((s) => s.foodSheetOpen)
  const closeFoodSheet = useRutina((s) => s.closeFoodSheet)
  const addFoodEntry = useRutina((s) => s.addFoodEntry)

  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<FoodItem | null>(null)
  const [portion, setPortion] = useState(1)
  const [meal, setMeal] = useState<MealSlot>('sarapan')
  const [prevOpen, setPrevOpen] = useState(false)
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(open, panelRef)

  /* Draf di-reset setiap kali lembar dibuka. */
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setQuery('')
      setPicked(null)
      setPortion(1)
      setMeal(currentMealSlot())
    }
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFoodSheet()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeFoodSheet])

  const results = searchFoods(query)

  const submit = () => {
    if (!picked) {
      toast.warning('Pilih makanan dari hasil pencarian dulu')
      return
    }
    addFoodEntry({
      date: todayISO(),
      name: picked.name,
      cat: picked.cat,
      unit: picked.unit,
      portion,
      meal,
      kcal: Math.round(picked.kcal * portion),
      protein: picked.protein == null ? null : Math.round(picked.protein * portion * 10) / 10,
      carb: picked.carb == null ? null : Math.round(picked.carb * portion * 10) / 10,
      fat: picked.fat == null ? null : Math.round(picked.fat * portion * 10) / 10,
    })
    toast.success(
      `${picked.name} (${portionLabel(portion)}) ditambahkan ke ${MEAL_SLOTS.find((s) => s.key === meal)?.label.toLowerCase()}`,
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            key="backdrop"
            aria-hidden="true"
            onClick={closeFoodSheet}
            className="absolute inset-0 z-40 bg-[#231F1E]/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <m.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            aria-label="Tambah asupan makanan"
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 600) closeFoodSheet()
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className={`absolute inset-x-0 bottom-0 z-50 mx-auto max-h-[92%] w-full overflow-y-auto rounded-t-[28px] bg-[#FAF9F6] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 no-scrollbar ${CONTENT_W}`}
          >
            {/* Pegangan seret */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-[#4A3B32]/15" />
            </div>

            <div className="text-left">
              <h2 className="text-lg font-semibold tracking-tight text-[#231F1E]">
                Tambah Asupan
              </h2>
              <p className="mt-0.5 text-[13px] text-[#4A3B32]/70">
                Cari di 179 makanan &amp; minuman Indonesia.
              </p>
            </div>

            {/* Pencarian */}
            <div className="relative mt-3">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A3B32]/50" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPicked(null)
                }}
                placeholder="mis. nasi goreng, ayam geprek, es kopi…"
                className="h-11 rounded-xl border-[#4A3B3233] bg-[#F5F3EE] pl-10 text-sm text-[#231F1E] placeholder:text-[#4A3B32]/45 focus-visible:border-[#749B58] focus-visible:ring-[#749B58]/25"
              />
            </div>

            {/* Hasil pencarian */}
            <AnimatePresence initial={false} mode="popLayout">
              {!picked && query.trim().length >= 2 && (
                <m.div
                  key="results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="mt-3 space-y-2"
                >
                  {results.map((f) => (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => {
                        setPicked(f)
                        setPortion(1)
                      }}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-[#4A3B321F] bg-white p-3.5 text-left shadow-soft transition-colors hover:bg-[#F5F3EE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E4EFE0] text-[#658A4C]">
                        <Utensils className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-bold text-[#231F1E]">
                          {f.name}
                        </span>
                        <span className="block truncate text-[11px] font-medium text-[#4A3B32]/65">
                          {f.cat} · {f.unit}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-[14px] font-bold tabular-nums text-[#231F1E]">
                          {fmt(f.kcal)}
                        </span>
                        <span className="block text-[10px] font-bold uppercase text-[#4A3B32]/55">
                          kkal
                        </span>
                      </span>
                    </button>
                  ))}
                  {results.length === 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-[#4A3B32]/20 px-5 py-6 text-center">
                      <p className="text-[12.5px] font-semibold text-[#4A3B32]/70">
                        Tidak ada “{query.trim()}” di master
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-[#4A3B32]/60">
                        Coba nama lain — mis. “nasi”, “ayam”, “kopi”.
                      </p>
                    </div>
                  )}
                </m.div>
              )}

              {/* Detail porsi makanan terpilih */}
              {picked && (
                <m.div
                  key="picked"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="mt-3 rounded-2xl border border-[#749B58]/35 bg-white p-4 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-[#231F1E]">
                        {picked.name}
                      </p>
                      <p className="text-[11.5px] font-medium text-[#4A3B32]/65">
                        {picked.cat} · {picked.unit}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPicked(null)}
                      className="shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-[11.5px] font-bold text-[#4A3B32]/70 transition-colors hover:bg-[#F5F3EE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
                    >
                      Ganti
                    </button>
                  </div>

                  {/* Stepper porsi */}
                  <div className="mt-3.5">
                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#4A3B32]/55">
                      Porsi
                    </p>
                    <div className="mt-1.5 flex gap-2">
                      {PORTIONS.map((p) => {
                        const on = portion === p
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPortion(p)}
                            aria-pressed={on}
                            className={`h-10 flex-1 cursor-pointer rounded-xl text-[14px] font-bold tabular-nums transition-all active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] ${
                              on
                                ? 'bg-[#749B58] text-white shadow-soft'
                                : 'border border-[#4A3B3233] bg-[#F5F3EE] text-[#4A3B32]'
                            }`}
                          >
                            {portionLabel(p)}
                          </button>
                        )
                      })}
                    </div>
                    <p className="mt-1.5 text-[11.5px] font-medium text-[#4A3B32]/65">
                      = {portion === 1 ? picked.unit : `${portionLabel(portion)} ${picked.unit}`}
                    </p>
                  </div>

                  {/* Estimasi nutrisi untuk porsi terpilih */}
                  <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-[#F5F3EE] p-3 text-center">
                    <div>
                      <p className="text-[16px] font-bold leading-none tabular-nums text-[#231F1E]">
                        {fmt(picked.kcal * portion)}
                      </p>
                      <p className="mt-1 text-[9.5px] font-bold uppercase tracking-wide text-[#4A3B32]/60">
                        kkal
                      </p>
                    </div>
                    <div>
                      <p className="text-[16px] font-bold leading-none tabular-nums text-[#658A4C]">
                        {picked.protein == null ? '–' : fmt(picked.protein * portion)}
                      </p>
                      <p className="mt-1 text-[9.5px] font-bold uppercase tracking-wide text-[#4A3B32]/60">
                        protein
                      </p>
                    </div>
                    <div>
                      <p className="text-[16px] font-bold leading-none tabular-nums text-[#A98650]">
                        {picked.carb == null ? '–' : fmt(picked.carb * portion)}
                      </p>
                      <p className="mt-1 text-[9.5px] font-bold uppercase tracking-wide text-[#4A3B32]/60">
                        karbo
                      </p>
                    </div>
                    <div>
                      <p className="text-[16px] font-bold leading-none tabular-nums text-[#B25E3F]">
                        {picked.fat == null ? '–' : fmt(picked.fat * portion)}
                      </p>
                      <p className="mt-1 text-[9.5px] font-bold uppercase tracking-wide text-[#4A3B32]/60">
                        lemak
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-[#4A3B32]/55">
                    <Minus className="h-3 w-3" />
                    Tanda “–” = data makro belum tersedia; kalori tetap valid.
                  </p>

                  {/* Waktu makan */}
                  <div className="mt-3">
                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#4A3B32]/55">
                      Waktu makan
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {MEAL_SLOTS.map((s) => {
                        const on = meal === s.key
                        return (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => setMeal(s.key)}
                            aria-pressed={on}
                            className={`h-9 cursor-pointer rounded-full px-3.5 text-[12px] font-bold transition-all active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] ${
                              on
                                ? 'bg-[#231F1E] text-[#FAF9F6] shadow-soft'
                                : 'border border-[#4A3B3233] bg-[#F5F3EE] text-[#4A3B32]'
                            }`}
                          >
                            {s.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </m.div>
              )}
            </AnimatePresence>

            {/* Simpan */}
            <m.button
              type="button"
              onClick={submit}
              whileTap={{ scale: 0.98 }}
              disabled={!picked}
              className="mt-5 h-12 w-full cursor-pointer rounded-full bg-[#749B58] text-[15px] font-bold text-white shadow-soft transition-all hover:bg-[#658A4C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="mr-1.5 inline h-4.5 w-4.5" />
              Tambah ke Jurnal Makan
            </m.button>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}

/** Slot waktu makan saat ini — default cerdas mengikuti jam. */
function currentMealSlot(): MealSlot {
  const h = new Date().getHours()
  if (h < 10) return 'sarapan'
  if (h < 15) return 'makan siang'
  if (h < 21) return 'makan malam'
  return 'camilan'
}
