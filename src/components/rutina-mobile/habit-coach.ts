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
  habitWeeklyRates,
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
  hint: string
}

/* (v2.49 audit: bidang `emoji` dihapus — nol pembaca sejak PlantGlyph
 *  menggantikan emoji di v2.4x.) */

export const PLANT_STAGES: PlantStage[] = [
  {
    key: 'benih',
    label: 'Benih',
    hint: 'Baru ditanam — selesaikan sekali untuk menumbuhkannya.',
  },
  {
    key: 'tunas',
    label: 'Tunas',
    hint: 'Mulai berkecambah — jaga air dan sinar (versi 2 menit membantu!).',
  },
  {
    key: 'pohon-muda',
    label: 'Pohon Muda',
    hint: 'Akar mulai kuat — konsistensi sedang terbentuk.',
  },
  {
    key: 'pohon-dewasa',
    label: 'Pohon Dewasa',
    hint: 'Kebiasaan ini telah mengakar dalam hidupmu.',
  },
  {
    key: 'berbunga',
    label: 'Berbunga',
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

/** Statistik pekan berjalan (Senin–Minggu, hari terjadwal yang sudah
 *  lewat): berapa hari terjadwal & berapa selesai — dasar tunggal
 *  bagi seluruh saran Goldilocks (dipakai goldilocksGroups).
 *  v2.49 (audit): kini pemetaan tipis atas habitWeeklyRates — SATU
 *  sumber. Rumus lokal lama mengabaikan createdAt (kebiasaan yang baru
 *  dibuat Kamu dipersalahkan atas Sen–Rab yang belum ada) & hari-jeda
 *  (jeda dihitung sebagai hari terjadwal yang gagal) — kartu coach bisa
 *  membaca "0 dari 4 hari" saat matriks perbandingan membaca "0/1". */
function goldilocksStats(
  h: Habit,
  c: Completions,
  today: string,
): { done: number; scheduled: number } | null {
  const r = habitWeeklyRates(h, c, today, 1)[0]
  return r && r.scheduled > 0 ? { done: r.done, scheduled: r.scheduled } : null
}

/* ===== Saran Coach terkonsolidasi (audit antirepetisi v2.41) =====

   Masalah: sebelumnya tiap kebiasaan mendapat KARTU sendiri, sehingga
   tiga kebiasaan yang kesulitan menghasilkan tiga kartu berjudul
   identik "Perkecil dulu biar tetap hidup" — informasi repetitif
   dengan inti sama. Kini SATU inti saran = SATU kartu: pesan agregat
   di kepala kartu, kebiasaan menjadi baris ringkas (nama + titik
   kategori + capaian "d/s hari") di dalamnya. */

export interface GoldilocksItem {
  habit: Habit
  /** Hari terjadwal pekan ini yang sudah lewat. */
  scheduled: number
  /** Hari terjadwal tersebut yang selesai. */
  done: number
}

export interface GoldilocksGroup {
  tone: GoldilocksTone
  title: string
  /** Pesan agregat — menyebut nama kebiasaan HANYA bila tunggal
   *  (kartu multi-baris sudah memuat nama per baris, jangan dobel). */
  text: string
  items: GoldilocksItem[]
}

/** Kelompokkan seluruh saran Goldilocks menurut INTI saran. Urutan
 *  keluaran: 'kecilkan' dulu (yang kesulitan lebih butuh perhatian),
 *  lalu 'naik'. `excludeIds` mengecualikan kebiasaan yang sedang
 *  ditangani kartu lain (mis. pemulihan terlewat kemarin) agar satu
 *  kebiasaan tidak muncul dua kali dalam satu seksi. */
export function goldilocksGroups(
  habits: Habit[],
  c: Completions,
  today: string,
  excludeIds?: Set<string>,
): GoldilocksGroup[] {
  const byTone = new Map<GoldilocksTone, GoldilocksItem[]>()
  for (const h of habits) {
    if (h.archived) continue
    if (excludeIds?.has(h.id)) continue
    const s = goldilocksStats(h, c, today)
    if (!s) continue
    let tone: GoldilocksTone | null = null
    if (s.done >= h.weeklyTarget && h.weeklyTarget < 7) tone = 'naik'
    else if (s.scheduled >= 3 && s.done / s.scheduled < 0.5)
      tone = 'kecilkan'
    if (!tone) continue
    const list = byTone.get(tone) ?? []
    list.push({ habit: h, done: s.done, scheduled: s.scheduled })
    byTone.set(tone, list)
  }

  const groups: GoldilocksGroup[] = []
  const shrink = byTone.get('kecilkan')
  if (shrink?.length) {
    const one = shrink[0]!
    groups.push({
      tone: 'kecilkan',
      title: 'Perkecil dulu biar tetap hidup',
      text:
        shrink.length === 1
          ? `Baru ${one.done} dari ${one.scheduled} hari terjadwal pekan ini. Mulai dengan Versi 2 Menit — "${one.habit.mini || 'versi terkecilnya'}" — lalu naik bertahap.`
          : `${shrink.length} kebiasaan baru tercapai kurang dari separuh hari terjadwalnya pekan ini. Mulai dari Versi 2 Menit — versi terkecil yang tetap hidup — lalu naik bertahap.`,
      items: shrink,
    })
  }
  const rise = byTone.get('naik')
  if (rise?.length) {
    const one = rise[0]!
    groups.push({
      tone: 'naik',
      title: 'Pekan sempurna!',
      text:
        rise.length === 1
          ? `"${one.habit.title}" sudah ${one.done}/${one.habit.weeklyTarget} pekan ini. Saatnya menantang diri: tambah satu hari jadwal atau naikkan target pekanan.`
          : `Target pekanan tercapai untuk ${rise.length} kebiasaan. Saatnya menantang diri: tambah satu hari jadwal atau naikkan target pekanan.`,
      items: rise,
    })
  }
  return groups
}

/* ===== Susun Kebiasaan — label pemicu ===== */

/** Label pemicu susun kebiasaan: "Setelah [pemicu], saya akan …". */
export function triggerLabelOf(habits: Habit[], h: Habit): string | null {
  if (!h.afterId) return null
  const trigger = habits.find((x) => x.id === h.afterId)
  return trigger ? trigger.title : null
}
