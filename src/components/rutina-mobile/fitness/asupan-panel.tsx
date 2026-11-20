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
import { motionTokens } from '@/lib/motion/tokens'
import { barFill } from '@/lib/motion/transitions'
import { useAnimePop } from '../anime-kit'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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

/** Ringkasan nutrisi sekumpulan entri.
 *  knownKcal = total kalori entri yang makronya tercatat — dasar klaim
 *  kejujuran komposisi makro (audit visualisasi v2.12). */
function summarize(entries: FoodEntry[]) {
  let kcal = 0
  let protein = 0
  let carb = 0
  let fat = 0
  let macroKnown = false
  let knownKcal = 0
  for (const e of entries) {
    kcal += e.kcal
    if (e.protein != null) {
      macroKnown = true
      knownKcal += e.kcal
      protein += e.protein
    }
    if (e.carb != null) carb += e.carb
    if (e.fat != null) fat += e.fat
  }
  return { kcal, protein, carb, fat, macroKnown, knownKcal }
}

/** Kalori per gram makro — komposisi dihitung dari kontribusi energi,
 *  bukan perbandingan gram (protein/karbo ≈ 4 kkal/g, lemak ≈ 9). */
const KCAL_PER_G = { protein: 4, carb: 4, fat: 9 } as const

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

/** "Sen, 12 Nov" — label hari + tanggal pendek untuk bacaan grafik. */
function dayLongLabel(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso + 'T00:00:00'))
}

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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={motionTokens.preset.chipReveal}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface-primary p-3 shadow-soft"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-success">
        <Utensils className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 break-words text-note font-semibold leading-snug text-content-primary">
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
      {/* Konfirmasi hapus — AlertDialog mencegah salah ketuk pada jurnal
          makan; pola sama dengan transaksi, catatan, dan kebiasaan. */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            aria-label={`Hapus ${entry.name}`}
            className="interactive flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-content-muted hover:bg-destructive/10 hover:text-content-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-[320px] rounded-2xl border-border p-6 sm:max-w-[320px]">
          <AlertDialogHeader>
            <div className="mb-1 flex justify-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-content-danger">
                <Trash2 className="h-5 w-5" />
              </span>
            </div>
            <AlertDialogTitle className="text-center text-lead font-bold tracking-tight text-content-primary">
              Hapus dari jurnal makan?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-note leading-relaxed text-content-muted">
              {entry.name} ({fmt(entry.kcal)} kkal) akan dihapus dan tidak
              dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:justify-center">
            <AlertDialogCancel className="mt-0 h-10 flex-1 rounded-full border-border text-note font-semibold text-content-secondary hover:bg-surface-sunken hover:text-content-primary">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteFoodEntry(entry.id)
                toast(`${entry.name} dihapus dari jurnal.`)
              }}
              className="h-10 flex-1 rounded-full bg-destructive text-note font-bold text-destructive-foreground hover:bg-destructive/90"
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </m.div>
  )
}

/* ===== Panel Asupan ===== */

export function AsupanPanel() {
  const foodEntries = useRutina((s) => s.foodEntries)
  const calorieTarget = useRutina((s) => s.calorieTarget)
  const setCalorieTarget = useRutina((s) => s.setCalorieTarget)
  const fitTargets = useRutina((s) => s.fitTargets)
  const openFoodSheet = useRutina((s) => s.openFoodSheet)
  const workouts = useRutina((s) => s.workouts)
  const bodyLogs = useRutina((s) => s.bodyLogs)

  const [editingTarget, setEditingTarget] = useState(false)
  const [targetDraft, setTargetDraft] = useState('2000')
  /* Hari terpilih pada grafik 7 hari — null = hari ini (default bacaan). */
  const [selDay, setSelDay] = useState<string | null>(null)

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
    /* Rata-rata hanya hari tercatat — hari kosong tidak menyeret turun
       ringkasan nonvisual (jujur: 0 kkal = tidak mencatat). */
    const logged = kcalByDay.filter((k) => k > 0)
    const avg = logged.length
      ? logged.reduce((a, k) => a + k, 0) / logged.length
      : 0
    return { days, kcalByDay, max, avg }
  }, [foodEntries, today, calorieTarget])

  const remaining = allowance - sum.kcal
  const pct = Math.min((sum.kcal / Math.max(allowance, 1)) * 100, 100)

  /* Ledakan elastis dua angka paling terlihat — kalori tercatat (hero)
     dan energi terbakar. useAnimePop melewati render pertama; pop hanya
     saat nilai berubah (entri ditambah/dihapus, sesi dicatat). */
  const kcalRef = useAnimePop<HTMLSpanElement>(null, sum.kcal, {
    scale: 1.2,
    back: 2.4,
  })
  const burnedRef = useAnimePop<HTMLSpanElement>(null, burned, {
    scale: 1.2,
    back: 2.4,
  })

  return (
    <div>
      {/* Neraca kalori hari ini */}
      <m.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={motionTokens.preset.chipReveal}
        aria-label="Neraca kalori hari ini"
        className="overflow-hidden rounded-2xl bg-module-accent-strong p-6 text-module-accent-fg shadow-leaf"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-note font-medium text-module-accent-fg/85">
              <Flame className="h-4 w-4" />
              Asupan hari ini
            </p>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span
                ref={kcalRef}
                className="inline-block text-kpi-hero font-semibold leading-none tracking-tight tabular-nums"
              >
                {fmt(sum.kcal)}
              </span>
              <span className="text-lead font-medium text-module-accent-fg/85">
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
            className="interactive flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-module-accent-fg/15 px-3 py-1.5 text-meta font-bold text-module-accent-fg hover:bg-module-accent-fg/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-module-accent-fg"
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
              transition={motionTokens.preset.cardReveal}
              className="overflow-hidden"
            >
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-espresso/35 p-2.5 backdrop-blur-sm">
                <button
                  type="button"
                  aria-label="Kurangi target 100 kkal"
                  onClick={() =>
                    setTargetDraft(String(Math.max(1200, Number(targetDraft) - 100)))
                  }
                  className="interactive flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-module-accent-fg/15 text-module-accent-fg hover:bg-module-accent-fg/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-module-accent-fg"
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
                  className="interactive flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-module-accent-fg/15 text-module-accent-fg hover:bg-module-accent-fg/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-module-accent-fg"
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
                  className="interactive h-10 shrink-0 cursor-pointer rounded-xl bg-module-accent-fg px-4 text-note font-semibold text-content-primary hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-module-accent-fg"
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
            transition={barFill}
          />
        </div>

        {/* Energi terbakar — baris tambahan neraca v2 */}
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-espresso/35 px-3.5 py-2.5 backdrop-blur-sm">
          <p className="flex items-center gap-1.5 text-meta font-semibold text-module-accent-fg/90">
            <Flame className="h-4 w-4 text-gold" aria-hidden="true" />
            Energi terbakar
          </p>
          <p className="text-note font-bold tabular-nums text-module-accent-fg">
            +<span ref={burnedRef} className="inline-block">{fmt(burned)}</span>
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

        {/* Makro — segmented bar komposisi (dari kontribusi kalori) + tiga
            kolom gram. Komposisi hanya digambar dari makro yang tercatat;
            bila belum lengkap, angka tetap tampil dengan keterangan jujur
            (audit visualisasi v2.12). */}
        <div className="mt-4 rounded-2xl bg-espresso/35 p-3 backdrop-blur-sm">
          {(() => {
            const pK = sum.protein * KCAL_PER_G.protein
            const cK = sum.carb * KCAL_PER_G.carb
            const fK = sum.fat * KCAL_PER_G.fat
            const total = pK + cK + fK
            if (sum.macroKnown && total > 0) {
              const pP = Math.round((pK / total) * 100)
              const cP = Math.round((cK / total) * 100)
              const fP = Math.max(0, 100 - pP - cP)
              const partial = sum.knownKcal < sum.kcal
              return (
                <div className="mb-3">
                  <div
                    className="flex h-2.5 overflow-hidden rounded-full bg-module-accent-fg/15"
                    role="img"
                    aria-label={`Komposisi makro: protein ${pP} persen, karbohidrat ${cP} persen, lemak ${fP} persen${partial ? ', dihitung dari makanan yang makronya tercatat' : ''}`}
                  >
                    <span className="bg-gold" style={{ width: `${pP}%` }} />
                    <span
                      className="bg-module-accent-fg/75"
                      style={{ width: `${cP}%` }}
                    />
                    <span
                      className="bg-module-accent-fg/40"
                      style={{ width: `${fP}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-chart-label font-semibold text-module-accent-fg/75">
                    <span>P {pP}%</span>
                    <span>K {cP}%</span>
                    <span>L {fP}%</span>
                  </div>
                  {partial && (
                    <p className="mt-1.5 text-chart-label leading-relaxed text-module-accent-fg/65">
                      Komposisi dari {fmt(sum.knownKcal)} dari {fmt(sum.kcal)}{' '}
                      kkal — sebagian makanan belum punya rincian makro.
                    </p>
                  )}
                </div>
              )
            }
            return null
          })()}
          {/* Bullet bar makro vs target (audit visualisasi v2.36, Tahap 2):
              tiga bar berdiri sendiri dengan penanda target — presisi angka
              tetap (X / Y g), visual membuat jarak ke target langsung
              terbaca. Target 0 = Sasaran Musim belum diatur → angka saja. */}
          {(() => {
            const rows: {
              key: 'protein' | 'carb' | 'fat'
              label: string
              value: number
              target: number
            }[] = [
              { key: 'protein', label: 'Protein', value: sum.protein, target: fitTargets.protein },
              { key: 'carb', label: 'Karbohidrat', value: sum.carb, target: fitTargets.carb },
              { key: 'fat', label: 'Lemak', value: sum.fat, target: fitTargets.fat },
            ]
            const anyTarget = rows.some((r) => r.target > 0)
            return (
              <div className={anyTarget ? 'space-y-2.5' : 'grid grid-cols-3 gap-2'}>
                {rows.map((r) => {
                  if (!anyTarget || r.target <= 0) {
                    return (
                      <div key={r.key} className="text-center">
                        <p className="text-lead font-bold leading-none tabular-nums">
                          {fmt(r.value)}<span className="text-eyebrow font-semibold"> g</span>
                        </p>
                        <p className="mt-1 text-chart-label font-semibold uppercase tracking-wide text-module-accent-fg/70">
                          {r.label.toLowerCase()}
                        </p>
                      </div>
                    )
                  }
                  const pct = Math.min((r.value / r.target) * 100, 100)
                  const over = r.value > r.target
                  return (
                    <div key={r.key}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-chart-label font-bold uppercase tracking-wide text-module-accent-fg/80">
                          {r.label}
                        </p>
                        <p className="text-note font-bold tabular-nums text-module-accent-fg">
                          {fmt(r.value)}
                          <span className="text-chart-label font-semibold text-module-accent-fg/60">
                            {' '}/ {fmt(r.target)} g
                          </span>
                        </p>
                      </div>
                      <div
                        className="mt-1.5 h-2 overflow-hidden rounded-full bg-module-accent-fg/15"
                        role="img"
                        aria-label={`${r.label}: ${fmt(r.value)} dari ${fmt(r.target)} gram (${Math.round(pct)} persen${over ? ', melewati target' : ''})`}
                      >
                        <m.div
                          initial={false}
                          className={`h-full rounded-full ${over ? 'bg-gold' : 'bg-module-accent-fg'}`}
                          animate={{ width: `${pct}%` }}
                          transition={barFill}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
          {/* Cakupan makro yang benar-benar tercatat (audit v2.36): makro
              tidak disimpulkan lengkap bila sebagian makanan tanpa data —
              persentase kkal ber-makro ditampilkan eksplisit. */}
          {todayEntries.length > 0 && sum.kcal > 0 && (
            <p className="mt-2.5 text-chart-label leading-relaxed text-module-accent-fg/65">
              {sum.knownKcal >= sum.kcal
                ? 'Seluruh makanan hari ini punya rincian makro.'
                : `Cakupan makro ${Math.round((sum.knownKcal / sum.kcal) * 100)}% — ${fmt(sum.kcal - sum.knownKcal)} kkal dari makanan tanpa rincian makro.`}
            </p>
          )}
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
        whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...motionTokens.preset.chipReveal, delay: motionTokens.delay.tight }}
        className="interactive mt-3 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-surface-inverse text-section font-bold text-content-inverse shadow-soft hover:bg-surface-inverse-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={motionTokens.preset.chipReveal}
              className="rounded-xl border-2 border-dashed border-primary/30 px-6 py-9 text-center"
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

      {/* Tren 7 hari — batang interaktif + garis target (audit visualisasi
          v2.12: garis target kini benar-benar digambar; detail per hari
          melalui ketukan, bukan memaksakan seluruh angka masuk layar). */}
      <section className="mt-8" aria-label="Tren kalori 7 hari">
        <div className="flex items-baseline justify-between gap-2 px-0.5">
          <h2 className="text-note font-semibold uppercase tracking-[0.16em] text-content-secondary">
            7 Hari Terakhir
          </h2>
          <span className="text-eyebrow font-medium tabular-nums text-content-muted">
            target {fmt(calorieTarget)} kkal
          </span>
        </div>
        <div className="mt-3 rounded-xl border border-border bg-surface-primary p-4 shadow-soft">
          {/* Zona batang + garis target — tinggi batang & posisi garis
              memakai skala yang sama (maks deret ∪ target). */}
          <div className="relative">
            {/* Garis target putus-putus */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 z-10"
              style={{
                bottom: `${Math.round((calorieTarget / Math.max(week.max, 1)) * 100)}%`,
              }}
            >
              <div className="border-t-2 border-dashed border-module-accent-strong/55" />
              <span className="absolute right-0 -top-2 rounded-full bg-module-accent-soft px-1.5 py-0.5 text-chart-label font-semibold tabular-nums text-module-accent-strong">
                {fmt(calorieTarget)}
              </span>
            </div>
            {/* Batang harian — ketuk untuk memilih. role="group" karena
                berisi tombol; ringkasan nonvisual untuk pembaca layar. */}
            <div
              className="flex h-32 items-end gap-1.5"
              role="group"
              aria-label="Kalori tercatat tujuh hari terakhir"
            >
              <p className="sr-only">
                Rata-rata {fmt(week.avg)} kkal per hari, target{' '}
                {fmt(calorieTarget)} kkal. Rincian per hari tersedia pada tiap
                kolom berikut.
              </p>
              {week.days.map((d, i) => {
                const kcal = week.kcalByDay[i]
                const h =
                  week.max > 0 ? Math.max((kcal / week.max) * 100, 4) : 4
                const isToday = d === today
                const isSel = (selDay ?? today) === d
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={isSel}
                    aria-label={`${dayLongLabel(d)}: ${kcal > 0 ? `${fmt(kcal)} kkal` : 'tidak tercatat'}`}
                    onClick={() => setSelDay(isSel && selDay !== null ? null : d)}
                    className="interactive group flex h-full min-w-0 flex-1 cursor-pointer flex-col justify-end rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-module-accent-strong"
                  >
                    <m.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{
                        ...motionTokens.preset.data,
                        delay: i * motionTokens.stagger.normal,
                      }}
                      style={{
                        height: kcal > 0 ? `${h}%` : '3px',
                        transformOrigin: 'bottom',
                      }}
                      className={`w-full rounded-t-lg transition-colors ${
                        kcal === 0
                          ? 'bg-module-accent/15'
                          : isToday
                            ? 'bg-module-accent-strong'
                            : isSel
                              ? 'bg-module-accent'
                              : 'bg-module-accent/45 group-hover:bg-module-accent/70'
                      }`}
                    />
                  </button>
                )
              })}
            </div>
          </div>
          {/* Label hari */}
          <div className="mt-2 flex gap-1.5">
            {week.days.map((d) => {
              const isToday = d === today
              const isSel = (selDay ?? today) === d
              return (
                <span
                  key={d}
                  className={`min-w-0 flex-1 text-center text-chart-label font-semibold ${
                    isSel ? 'text-module-accent-strong' : 'text-content-muted'
                  } ${isToday ? 'underline decoration-module-accent-strong/60 underline-offset-2' : ''}`}
                >
                  {DAY_LABELS[new Date(d + 'T00:00:00').getDay()]}
                </span>
              )
            })}
          </div>
          {/* Bacaan hari terpilih (default: hari ini) */}
          {(() => {
            const idx = week.days.indexOf(selDay ?? today)
            const kcal = idx >= 0 ? week.kcalByDay[idx] : 0
            const diff = kcal - calorieTarget
            const diffText =
              kcal === 0
                ? 'tidak tercatat'
                : diff === 0
                  ? 'pas di target'
                  : diff > 0
                    ? `+${fmt(diff)} di atas target`
                    : `−${fmt(-diff)} di bawah target`
            return (
              <p className="mt-3 border-t border-border pt-2.5 text-center text-eyebrow font-medium tabular-nums text-content-muted">
                {dayLongLabel(selDay ?? today)} —{' '}
                {kcal > 0 ? `${fmt(kcal)} kkal` : 'belum ada catatan'} ·{' '}
                {diffText}
              </p>
            )
          })()}
        </div>
        <p className="mt-2 px-0.5 text-eyebrow leading-relaxed text-content-muted">
          Batang pekat = hari ini · garis putus-putus = target asupan. Jatah
          harian = target + energi terbakar ({fmt(allowance)} kkal hari ini).
        </p>
      </section>
    </div>
  )
}
