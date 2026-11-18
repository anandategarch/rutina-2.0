/* ============================================================
   Habit Intelligence — derivasi murni di atas domain Habit,
   tanpa React & efek samping (aman SSR & unit test).

   Memulihkan mekanik Coach Rutina lama:
   - Nudge "Jangan Bolong Dua Kali"
   - Goldilocks Nudge (saran adaptif hasil pekanan)
   - Taman Pertumbuhan Kebiasaan (5 tahap tanaman)
   ============================================================ */

import {
  addDaysISO,
  isDoneOn,
  scheduledOn,
  weekStartISO,
  type Completions,
  type Habit,
} from './store'

/* ===== Taman Pertumbuhan — 5 tahap ===== */

export interface PlantStage {
  key: 'benih' | 'tunas' | 'pohon-muda' | 'pohon-dewasa' | 'berbunga'
  label: string
  emoji: string
  hint: string
}

export const PLANT_STAGES: PlantStage[] = [
  {
    key: 'benih',
    label: 'Benih',
    emoji: '🌰',
    hint: 'Baru ditanam — selesaikan sekali untuk menumbuhkannya.',
  },
  {
    key: 'tunas',
    label: 'Tunas',
    emoji: '🌱',
    hint: 'Mulai berkecambah — jaga air dan sinar (versi 2 menit membantu!).',
  },
  {
    key: 'pohon-muda',
    label: 'Pohon Muda',
    emoji: '🌿',
    hint: 'Akar mulai kuat — konsistensi sedang terbentuk.',
  },
  {
    key: 'pohon-dewasa',
    label: 'Pohon Dewasa',
    emoji: '🌳',
    hint: 'Kebiasaan ini telah mengakar dalam hidupmu.',
  },
  {
    key: 'berbunga',
    label: 'Berbunga',
    emoji: '🌸',
    hint: 'Kebiasaan matang — kembangkannya lebih jauh!',
  },
]

/** Ambang total penyelesaian menuju tahap berikutnya. */
const STAGE_THRESHOLDS = [1, 7, 21, 60] as const

export interface PlantInfo {
  index: number
  stage: PlantStage
  /** Total penyelesaian sepanjang histori. */
  total: number
  /** Ambang penyelesaian untuk naik tahap, atau null di puncak. */
  nextAt: number | null
}

/** Tahap tanaman sebuah kebiasaan — Benih → Tunas → Pohon muda →
 *  Pohon dewasa → Berbunga, berdasarkan total penyelesaian nyata. */
export function plantStageOf(
  h: Habit,
  c: Completions,
  today: string,
): PlantInfo {
  let total = 0
  for (const [date, day] of Object.entries(c)) {
    if (date < h.createdAt || date > today) continue
    if (day[h.id] === true) total++
  }
  let index = 0
  for (let i = 0; i < STAGE_THRESHOLDS.length; i++) {
    if (total >= STAGE_THRESHOLDS[i]!) index = i + 1
  }
  return {
    index,
    stage: PLANT_STAGES[index]!,
    total,
    nextAt:
      index < STAGE_THRESHOLDS.length ? STAGE_THRESHOLDS[index]! : null,
  }
}

/* ===== Nudge "Jangan Bolong Dua Kali" ===== */

/** Kebiasaan aktif yang terjadwal KEMARIN namun tidak selesai (dan
 *  bukan hari jeda) — kandidat pengingat "jangan bolong dua kali". */
export function missedYesterday(
  habits: Habit[],
  c: Completions,
  today: string,
): Habit[] {
  const y = addDaysISO(today, -1)
  return habits.filter(
    (h) =>
      !h.archived &&
      y >= h.createdAt &&
      scheduledOn(h, y) &&
      !isDoneOn(c, y, h.id) &&
      !(h.restDays ?? []).includes(y),
  )
}

/* ===== Goldilocks Nudge — saran adaptif hasil pekanan ===== */

export type GoldilocksTone = 'naik' | 'kecilkan'

export interface GoldilocksAdvice {
  tone: GoldilocksTone
  title: string
  text: string
}

/** Saran berdasarkan hasil pekan berjalan (Senin–Minggu):
 *  - Pekan sempurna (target tercapai)  → tawarkan peningkatan.
 *  - Capaian < 50% hari terjadwal      → sarankan memperkecil. */
export function goldilocksOf(
  h: Habit,
  c: Completions,
  today: string,
): GoldilocksAdvice | null {
  const wk = weekStartISO(today)
  let scheduledPassed = 0
  let done = 0
  for (let d = 0; d < 7; d++) {
    const iso = addDaysISO(wk, d)
    if (iso > today) break
    if (!scheduledOn(h, iso)) continue
    scheduledPassed++
    if (isDoneOn(c, iso, h.id)) done++
  }
  if (scheduledPassed === 0) return null

  /* Pekan sempurna: target pekanan sudah tercapai — tawarkan tantangan. */
  if (done >= h.weeklyTarget && h.weeklyTarget < 7) {
    return {
      tone: 'naik',
      title: 'Pekan sempurna!',
      text: `"${h.title}" sudah ${done}/${h.weeklyTarget} pekan ini. Saatnya menantang diri: tambah satu hari jadwal atau naikkan target pekanan.`,
    }
  }

  /* Capaian di bawah 50% dari hari terjadwal yang sudah lewat —
     sarankan memperkecil agar kebiasaan tetap hidup. */
  if (scheduledPassed >= 3 && done / scheduledPassed < 0.5) {
    return {
      tone: 'kecilkan',
      title: 'Perkecil dulu biar tetap hidup',
      text: `Baru ${done} dari ${scheduledPassed} hari terjadwal pekan ini. Mulai dengan Versi 2 Menit — "${h.mini || 'versi terkecilnya'}" — lalu naik bertahap.`,
    }
  }
  return null
}

/* ===== Susun Kebiasaan — label pemicu ===== */

/** Label pemicu susun kebiasaan: "Setelah [pemicu], saya akan …". */
export function triggerLabelOf(habits: Habit[], h: Habit): string | null {
  if (!h.afterId) return null
  const trigger = habits.find((x) => x.id === h.afterId)
  return trigger ? trigger.title : null
}
