'use client'

import { useState } from 'react'
import { create } from 'zustand'
import { BatteryLow, Laugh, Meh, Minus, Plus, Smile } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

import { RutinaButton } from './rutina-button'
import { RutinaSectionHeader } from './rutina-section-header'
import { RutinaSheet } from './rutina-sheet'
import { MOODS, todayISO, useRutina } from './store'

/* ===== Toko state sheet check-in (module-level zustand) =====
   Dibuka dari pusat aksi cepat (quick-action-hub) — toko modul-level
   terpisah, pola yang sama dengan useQuickHub, tanpa menyentuh store
   utama yang dibekukan. */

interface CheckInSheetState {
  open: boolean
  openCheckIn: () => void
  closeCheckIn: () => void
}

export const useCheckInSheet = create<CheckInSheetState>()((set) => ({
  open: false,
  openCheckIn: () => set({ open: true }),
  closeCheckIn: () => set({ open: false }),
}))

/* Ikon suasana hati — padanan MOODS di store (selaras kanvas jurnal &
   panel Statistik). */
const MOOD_ICONS: Record<string, typeof Laugh> = {
  Ceria: Laugh,
  Baik: Smile,
  Biasa: Meh,
  Lelah: BatteryLow,
}

/* Batas stepper tidur (jam) — langkah setengah jam. */
const SLEEP_MIN = 0
const SLEEP_MAX = 14
const SLEEP_STEP = 0.5

/** Format desimal Indonesia: 7.5 -> "7,5". */
function fmtHours(n: number): string {
  return n.toFixed(1).replace('.', ',')
}

/**
 * CheckInSheet — check-in harian: suasana hati, energi (1–5), dan jam
 * tidur semalam dalam satu lembar bawah ringkas.
 *
 * Semua isian opsional: mood yang tidak disentuh tetap memakai mood
 * tersimpan; energi/tidur yang tidak diisi tidak menimpa log tubuh
 * hari ini (logBodyCheckIn hanya menulis field yang terisi). Pra-isi
 * dari keadaan hari ini (store mood + bodyLogs[today]).
 */
export function CheckInSheet() {
  const open = useCheckInSheet((s) => s.open)
  const closeCheckIn = useCheckInSheet((s) => s.closeCheckIn)
  const mood = useRutina((s) => s.mood)
  const bodyLogs = useRutina((s) => s.bodyLogs)

  const [moodDraft, setMoodDraft] = useState<string | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [sleepH, setSleepH] = useState<number | null>(null)
  const [prevOpen, setPrevOpen] = useState(false)

  /* Pra-isi draf setiap kali lembar dibuka — dari mood tersimpan dan log
     tubuh hari ini (pola draf reset render-time, sama seperti FoodSheet). */
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      const today = bodyLogs[todayISO()]
      setMoodDraft(mood)
      setEnergy(today?.energy ?? null)
      setSleepH(today?.sleepH ?? null)
    }
  }

  const submit = () => {
    const s = useRutina.getState()
    /* Mood opsional — bila tidak memilih, mood tersimpan dipertahankan. */
    if (moodDraft != null) s.setMood(moodDraft)
    s.logBodyCheckIn({
      sleepH: sleepH ?? undefined,
      energy: energy ?? undefined,
    })
    toast.success('Check-in tersimpan — terima kasih sudah merawat dirimu.')
    closeCheckIn()
  }

  return (
    <RutinaSheet
      open={open}
      onClose={closeCheckIn}
      label="Check-in hari ini"
    >
      <div className="pb-1">
        <RutinaSectionHeader
          eyebrow="Suasana & pemulihan"
          title="Check-in hari ini"
          description="Catat suasana hati, energi, dan tidur semalam — semuanya opsional."
        />
      </div>

      {/* Suasana hati — pil MOODS */}
      <div className="mt-4">
        <p className="px-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-content-muted">
          Suasana hati
        </p>
        <div className="mt-2 flex gap-2">
          {MOODS.map((moodName) => {
            const Icon = MOOD_ICONS[moodName]
            const selected = moodDraft === moodName
            return (
              <button
                key={moodName}
                type="button"
                aria-pressed={selected}
                aria-label={`Suasana hati: ${moodName}`}
                onClick={() => setMoodDraft(selected ? null : moodName)}
                className={cn(
                  'flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 text-[12px] font-bold outline-none transition-all duration-150 active:scale-[0.95] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                  selected
                    ? 'bg-primary text-primary-foreground shadow-soft'
                    : 'bg-surface-secondary text-content-secondary hover:bg-surface-sunken',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {moodName}
              </button>
            )
          })}
        </div>
      </div>

      {/* Energi — pemilih 1–5 */}
      <div className="mt-4">
        <p className="px-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-content-muted">
          Energi
        </p>
        <div className="mt-2 flex gap-2">
          {[1, 2, 3, 4, 5].map((v) => {
            const selected = energy === v
            return (
              <button
                key={v}
                type="button"
                aria-pressed={selected}
                aria-label={`Energi ${v}`}
                onClick={() => setEnergy(selected ? null : v)}
                className={cn(
                  'flex h-11 w-11 flex-1 cursor-pointer items-center justify-center rounded-full text-[14px] font-bold tabular-nums outline-none transition-all duration-150 active:scale-[0.92] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                  selected
                    ? 'bg-primary text-primary-foreground shadow-soft'
                    : 'border border-border bg-surface-secondary text-content-secondary hover:border-border-strong',
                )}
              >
                {v}
              </button>
            )
          })}
        </div>
        <p className="mt-1.5 px-0.5 text-[11px] font-medium text-content-muted">
          1 = sangat lelah · 5 = bugar
        </p>
      </div>

      {/* Tidur — stepper setengah jam */}
      <div className="mt-4">
        <div className="flex items-center justify-between px-0.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-content-muted">
            Jam tidur semalam
          </p>
          <span className="text-[13px] font-bold tabular-nums text-content-primary">
            {sleepH != null ? `${fmtHours(sleepH)} jam` : 'belum diisi'}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            aria-label="Kurangi setengah jam tidur"
            onClick={() =>
              setSleepH(Math.max(SLEEP_MIN, (sleepH ?? 7) - SLEEP_STEP))
            }
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-surface-sunken text-content-secondary outline-none transition-colors hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="flex h-11 flex-1 items-center justify-center rounded-xl bg-surface-sunken text-[15px] font-bold tabular-nums text-content-primary">
            {sleepH != null ? fmtHours(sleepH) : '–'}
            <span className="ml-1 text-[11px] font-semibold text-content-muted">
              jam
            </span>
          </div>
          <button
            type="button"
            aria-label="Tambah setengah jam tidur"
            onClick={() =>
              setSleepH(Math.min(SLEEP_MAX, (sleepH ?? 7) + SLEEP_STEP))
            }
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-surface-sunken text-content-secondary outline-none transition-colors hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <RutinaButton
        variant="primary"
        size="lg"
        block
        className="mt-5"
        onClick={submit}
      >
        Simpan check-in
      </RutinaButton>
    </RutinaSheet>
  )
}
