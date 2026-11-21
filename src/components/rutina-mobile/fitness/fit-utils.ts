/* ============================================================
   Derivasi murni di atas domain Workout — tanpa React, tanpa
   efek samping; aman untuk SSR & unit test.

   Semua keputusan kebugaran dihitung dari data latihan sendiri
   (pendekatan coach Rutina v3: "data dulu, rekomendasi kemudian").
   ============================================================ */

import {
  addDaysISO,
  todayISO,
  type BodyLogs,
  type Workout,
  type WorkoutKind,
  type WorkoutSet,
  type WoFilter,
  type WoRange,
} from '../store'

/* ===== Jenis aktivitas (v2.17) ===== */

/** Label tampilan per jenis aktivitas — dipakai riwayat, lembar catat,
 *  dan detail hari. */
export const KIND_LABEL: Record<WorkoutKind, string> = {
  beban: 'Barbel di rumah',
  jalan: 'Jalan',
  lari: 'Lari',
  'lari-jalan': 'Lari + Jalan',
  badminton: 'Badminton',
}

/** Apakah jenis ini kardio berjarak (jalan/lari/lari-jalan)? */
export function isCardioKind(kind: WorkoutKind): boolean {
  return kind === 'jalan' || kind === 'lari' || kind === 'lari-jalan'
}

/** Label ringkas satu sesi — "Lari · 4,3 km" / "Badminton" /
 *  "Barbel di rumah · 4 gerakan". */
export function workoutTitle(w: Workout): string {
  if (isCardioKind(w.kind)) {
    const km = w.distance != null ? ` · ${w.distance.toFixed(2).replace('.', ',')} km` : ''
    return `${KIND_LABEL[w.kind]}${km}`
  }
  if (w.kind === 'badminton') return 'Badminton'
  return `Barbel di rumah · ${new Set(w.sets.map((s) => s.exercise)).size} gerakan`
}

/* ===== e1RM (Epley) ===== */

/** Estimasi kekuatan lintas rep-range: beban × (1 + reps/30). */
export function e1rmOf(weight: number, reps: number): number {
  return weight * (1 + reps / 30)
}

/* ===== Statistik satu sesi ===== */

/** Tonase sesi beban: total beban × repetisi (kg). */
export function tonaseOf(w: Workout): number {
  if (w.kind !== 'beban') return 0
  return w.sets.reduce((a, s) => a + s.weight * s.reps, 0)
}

/** Total repetisi sesi beban — kemajuan 5 kg juga terlihat dari
 *  repetisi & set, bukan hanya beban (v2.17). */
export function totalRepsOf(w: Workout): number {
  if (w.kind !== 'beban') return 0
  return w.sets.reduce((a, s) => a + s.reps, 0)
}

/** Total volume (kg) sesi beban — Σ beban × repetisi, alias tonase. */
export function volumeOf(w: Workout): number {
  return tonaseOf(w)
}

/** e1RM terbaik dalam satu sesi beban. */
export function bestE1rmIn(w: Workout): number {
  if (w.kind !== 'beban' || w.sets.length === 0) return 0
  return Math.max(...w.sets.map((s) => e1rmOf(s.weight, s.reps)))
}

/** Format nilai pace numerik (menit per km, mis. 6,53) → "6'32\"" —
 *  satu sumber untuk semua permukaan (revisi audit F5: dua pemformat
 *  pace tersisa di kalender latihan & grafik tren memakai format
 *  "6:32" yang berbeda; sekarang semuanya satu format & satu pembulatan
 *  ber-clamp — 59,6\" detik tidak pernah menjadi "6'60\""). */
export function paceLabelOf(minPerKm: number): string {
  const secPerKm = Math.round(minPerKm * 60)
  const min = Math.floor(secPerKm / 60)
  const sec = secPerKm % 60
  return `${min}'${String(sec).padStart(2, '0')}"`
}

/** Pace kardio: menit per km — "6'32\"" atau null bila data kurang. */
export function paceOf(duration: number, distance: number): string | null {
  if (distance <= 0 || duration <= 0) return null
  return paceLabelOf(duration / distance)
}

/* ===== Statistik lintas sesi ===== */

export interface ExStat {
  sessions: number
  /** PR e1RM terbaik sepanjang histori (kg). */
  best: number
  /** Berat terakhir dipakai (kg) — untuk perbandingan sesi berikutnya. */
  lastWeight: number
  lastReps: number
}

/** Rekap satu gerakan: jumlah sesi, PR e1RM, set terakhir.
 *  v2.16 (audit T5-e #6): urutkan sesi terbaru-dulu di dalam fungsi —
 *  store menambah workout di depan (newest-first), tetapi pemanggil
 *  boleh datang dengan urutan apa pun; "set terakhir" kini selalu
 *  diambil dari sesi bertanggal terbaru, bukan elemen terakhir array. */
export function exStatOf(workouts: Workout[], name: string): ExStat {
  let sessions = 0
  let best = 0
  let lastWeight = 0
  let lastReps = 0
  let haveLast = false
  const ordered = [...workouts].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  )
  for (const w of ordered) {
    if (w.kind !== 'beban') continue
    const sets = w.sets.filter((s) => s.exercise === name)
    if (sets.length === 0) continue
    sessions++
    for (const s of sets) {
      const e = e1rmOf(s.weight, s.reps)
      if (e > best) best = e
    }
    if (!haveLast) {
      lastWeight = sets[sets.length - 1].weight
      lastReps = sets[sets.length - 1].reps
      haveLast = true
    }
  }
  return { sessions, best, lastWeight, lastReps }
}

export interface PrRow {
  name: string
  best: number
  sessions: number
}

/** Papan rekor: tiap gerakan yang pernah dicatat, urut e1RM tertinggi. */
export function prBoard(workouts: Workout[]): PrRow[] {
  const map = new Map<string, PrRow>()
  for (const w of workouts) {
    if (w.kind !== 'beban') continue
    for (const s of w.sets) {
      const e = e1rmOf(s.weight, s.reps)
      const row = map.get(s.exercise) ?? {
        name: s.exercise,
        best: 0,
        sessions: 0,
      }
      if (e > row.best) row.best = e
      map.set(s.exercise, row)
    }
  }
  /* Jumlah sesi per gerakan (satu sesi dihitung sekali). */
  for (const [name, row] of map) {
    row.sessions = workouts.filter(
      (w) => w.kind === 'beban' && w.sets.some((s) => s.exercise === name),
    ).length
    map.set(name, row)
  }
  return [...map.values()].sort((a, b) => b.best - a.best)
}

/* ===== Jendela pekan ===== */

/** Pekan berjalan Senin–Minggu meliputi hari ini. */
export function weekRange(): { start: string; end: string } {
  const today = todayISO()
  const dow = (new Date(today + 'T00:00:00').getDay() + 6) % 7 // Senin = 0
  const start = addDaysISO(today, -dow)
  return { start, end: addDaysISO(start, 6) }
}

export interface WeekSummary {
  sessions: number
  /** Total menit latihan pekan ini. */
  minutes: number
  /** Tonase total (kg) dari sesi beban pekan ini. */
  tonase: number
  /** e1RM tertinggi pekan ini. */
  bestE1rm: number
}

/** Ringkasan pekan berjalan — angka hero layar Bugar. */
export function weekSummary(workouts: Workout[]): WeekSummary {
  const { start, end } = weekRange()
  const inWeek = workouts.filter((w) => w.date >= start && w.date <= end)
  return {
    sessions: inWeek.length,
    minutes: inWeek.reduce((a, w) => a + (w.duration || 0), 0),
    tonase: inWeek.reduce((a, w) => a + tonaseOf(w), 0),
    bestE1rm: inWeek.reduce((a, w) => Math.max(a, bestE1rmIn(w)), 0),
  }
}

/* ===== Ringkasan Aktivitas (v2.17) ===== */

export interface ActivitySummary {
  /** Total km lari & jalan pekan ini (gabungan, termasuk kombinasi). */
  runKm: number
  /** Jumlah sesi lari & jalan pekan ini. */
  runSessions: number
  /** Total jam bermain badminton pekan ini. */
  badmintonHours: number
  /** Jumlah sesi badminton pekan ini. */
  badmintonSessions: number
  /** Jumlah sesi barbel pekan ini. */
  strengthSessions: number
  /** Jumlah hari dengan aktivitas apa pun pekan ini. */
  activeDays: number
  /** Total menit semua aktivitas pekan ini. */
  minutes: number
  /** Tonase total sesi beban pekan ini. */
  tonase: number
}

/** Ringkasan aktivitas pekan berjalan (Senin–Minggu) — angka hero
 *  "Aktivitas minggu ini" layar Bugar. */
export function activitySummary(workouts: Workout[]): ActivitySummary {
  const { start, end } = weekRange()
  const inWeek = workouts.filter((w) => w.date >= start && w.date <= end)
  const run = inWeek.filter((w) => isCardioKind(w.kind))
  const bad = inWeek.filter((w) => w.kind === 'badminton')
  const str = inWeek.filter((w) => w.kind === 'beban')
  return {
    runKm: run.reduce((a, w) => a + (w.distance ?? 0), 0),
    runSessions: run.length,
    badmintonHours: bad.reduce((a, w) => a + (w.duration || 0), 0) / 60,
    badmintonSessions: bad.length,
    strengthSessions: str.length,
    activeDays: new Set(inWeek.map((w) => w.date)).size,
    minutes: inWeek.reduce((a, w) => a + (w.duration || 0), 0),
    tonase: inWeek.reduce((a, w) => a + tonaseOf(w), 0),
  }
}

/** Filter riwayat aktivitas: jenis + rentang tanggal (v2.17).
 *  Rentang '30'/'90' = hari ke belakang dari hari ini; 'semua' tanpa batas. */
export function filterWorkouts(
  workouts: Workout[],
  filter: WoFilter,
  range: WoRange,
  today: string = todayISO(),
): Workout[] {
  return workouts.filter((w) => {
    if (filter === 'kardio' && !isCardioKind(w.kind)) return false
    if (filter === 'badminton' && w.kind !== 'badminton') return false
    if (filter === 'beban' && w.kind !== 'beban') return false
    if (range !== 'semua') {
      const days = Number(range)
      const from = addDaysISO(today, -(days - 1))
      if (w.date < from || w.date > today) return false
    }
    return true
  })
}

/* ===== Kardio ===== */

export interface CardioSummary {
  sessions: number
  km: number
  /** Jarak terjauh sekali jalan (km). */
  farthest: number
}

/** Rekap jalan/lari/lari-jalan lintas histori. */
export function cardioSummary(workouts: Workout[]): CardioSummary {
  const cardio = workouts.filter((w) => isCardioKind(w.kind))
  return {
    sessions: cardio.length,
    km: cardio.reduce((a, w) => a + (w.distance ?? 0), 0),
    farthest: cardio.reduce((a, w) => Math.max(a, w.distance ?? 0), 0),
  }
}

/** Deret sesi kardio terbaru (terbaru-dulu) — untuk grafik
 *  perkembangan jarak per sesi (v2.17). Diurutkan sendiri per tanggal
 *  agar aman untuk masukan dengan urutan apa pun (pola exStatOf). */
export function cardioSeries(
  workouts: Workout[],
  limit = 8,
): { date: string; km: number; kind: WorkoutKind }[] {
  return workouts
    .filter((w) => isCardioKind(w.kind) && (w.distance ?? 0) > 0)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, limit)
    .map((w) => ({ date: w.date, km: w.distance ?? 0, kind: w.kind }))
}

/** Durasi terformat "38:20"-style (jam:menit atau menit:detik ringkas):
 *  menit penuh ditampilkan apa adanya; dipakai detail lari. */
export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} mnt`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} jam` : `${h} jam ${m} mnt`
}

/* ===== Tubuh & pemulihan ===== */

/** Berat badan terakhir yang tercatat (kg), atau null bila belum pernah. */
export function latestWeight(logs: BodyLogs): number | null {
  const keys = Object.keys(logs).sort().reverse()
  for (const k of keys) {
    const w = logs[k]?.weight
    if (w && w > 0) return w
  }
  return null
}

/** Deret berat badan tercatat (tanggal naik) — untuk grafik tren. */
export function weightSeries(logs: BodyLogs): { date: string; kg: number }[] {
  return Object.keys(logs)
    .filter((d) => logs[d]?.weight && logs[d]!.weight! > 0)
    .sort()
    .map((d) => ({ date: d, kg: logs[d]!.weight! }))
}

/* --- Riwayat tubuh lintas hari (audit visualisasi v2.36, Tahap 2) ---
   Satu titik per TANGGAL KALENDER (bukan per catatan) — hari tanpa
   log tampil null, TIDAK dibiarkan nol: "tidak mencatat" ≠ "0 jam
   tidur". Skala tiap metrik berdiri sendiri (small multiples). */
export interface BodyDayPoint {
  date: string
  label: string
  value: number | null
}

/** Deret harian satu metrik tubuh, N hari terakhir diakhiri hari ini.
 *  `pick` mengembalikan undefined untuk "tidak diisi hari itu". */
export function bodySeries(
  logs: BodyLogs,
  today: string,
  days: number,
  pick: (log: BodyLogs[string]) => number | undefined,
): BodyDayPoint[] {
  const out: BodyDayPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const iso = addDaysISO(today, -i)
    const log = logs[iso]
    const v = log ? pick(log) : undefined
    out.push({
      date: iso,
      label: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][
        new Date(iso + 'T00:00:00').getDay()
      ],
      value: v != null && Number.isFinite(v) ? v : null,
    })
  }
  return out
}

/** Jumlah hari bertenaga (value ≠ null) dari deret bodySeries —
 *  dipakai label cakupan "N dari M hari tercatat". */
export function bodyCoverage(series: BodyDayPoint[]): number {
  return series.filter((p) => p.value != null).length
}

/** Faktor MET per jenis latihan — estimasi pembakaran energi.
    kcal ≈ MET × berat (kg) × durasi (jam). Kombinasi lari+jalan di
    tengah dua kecepatan; badminton santai-aktif ±5,5 MET. */
const KCAL_MET: Record<WorkoutKind, number> = {
  beban: 5,
  jalan: 4.3,
  lari: 8.3,
  'lari-jalan': 6.3,
  badminton: 5.5,
}

/** Kalori satu sesi — angka SMARTWATCH pengguna (w.kcal) menang
    mutlak bila diisi; Rutina tidak mengklaim mengukur kalori, hanya
    menaksir via MET sebagai fallback (v2.17). */
export function kcalOf(w: Workout, bodyWeight: number | null): number {
  if (w.kcal != null && w.kcal > 0) return w.kcal
  const met = KCAL_MET[w.kind] ?? 5
  return Math.round(met * (bodyWeight ?? 60) * ((w.duration || 0) / 60))
}

export interface ReadinessComponent {
  key: 'tidur' | 'nyeri' | 'stres' | 'energi'
  label: string
  /** Skor komponen 0–100. */
  score: number
  /** Bobot asli (total 1.0 bila semua terisi). */
  weight: number
}

export interface Readiness {
  score: number
  label: string
  hint: string
  /** Rincian skor per komponen — untuk kartu Coach Bugar. */
  detail: ReadinessComponent[]
  /** Komponen yang belum diisi check-in hari ini. */
  missing: string[]
}

/** Bobot Coach Bugar lama: tidur 30%, DOMS 30%, stres 20%, energi 20%. */
const READINESS_WEIGHTS = { tidur: 0.3, nyeri: 0.3, stres: 0.2, energi: 0.2 }

/** Kesiapan latihan — empat komponen Coach Bugar (v3.02) lama:
 *  tidur (target 7–8 jam), DOMS/nyeri otot, stres, dan energi.
 *  Bila sebagian komponen belum diisi, bobot dinormalisasi dari yang
 *  terisi dan komponen kosong dilaporkan lewat `missing`. */
export function readinessOf(logs: BodyLogs): Readiness | null {
  const today = logs[todayISO()]
  if (!today) return null
  const parts: ReadinessComponent[] = []
  const missing: string[] = []

  if (today.sleepH != null) {
    parts.push({
      key: 'tidur',
      label: 'Tidur',
      score: Math.min(today.sleepH / 8, 1) * 100,
      weight: READINESS_WEIGHTS.tidur,
    })
  } else missing.push('tidur')

  if (today.soreness != null) {
    parts.push({
      key: 'nyeri',
      label: 'Nyeri otot',
      score: ((6 - today.soreness) / 5) * 100,
      weight: READINESS_WEIGHTS.nyeri,
    })
  } else missing.push('nyeri otot')

  if (today.stress != null) {
    parts.push({
      key: 'stres',
      label: 'Stres',
      score: ((6 - today.stress) / 5) * 100,
      weight: READINESS_WEIGHTS.stres,
    })
  } else missing.push('stres')

  if (today.energy != null) {
    parts.push({
      key: 'energi',
      label: 'Energi',
      score: (today.energy / 5) * 100,
      weight: READINESS_WEIGHTS.energi,
    })
  } else missing.push('energi')

  if (parts.length === 0) return null
  const totalW = parts.reduce((a, p) => a + p.weight, 0)
  const score = Math.round(
    parts.reduce((a, p) => a + p.score * (p.weight / totalW), 0),
  )

  const base = { score, detail: parts, missing }
  if (score >= 75)
    return {
      ...base,
      label: 'Siap latihan',
      hint: 'Tidur & tubuh prima — manfaatkan untuk sesi berkualitas.',
    }
  if (score >= 50)
    return {
      ...base,
      label: 'Cukup siap',
      hint: 'Boleh latihan — jaga volume secukupnya dan dengarkan tubuh.',
    }
  return {
    ...base,
    label: 'Fokus pemulihan',
    hint: 'Tubuh butuh istirahat — pilih sesi ringan atau libur aktif.',
  }
}

/* ===== Coach Bugar — double progression otomatis ===== */

/** Pembulatan ke kelipatan 2,5 kg (inkremen piring terkecil). */
export function round2_5(kg: number): number {
  return Math.round(kg / 2.5) * 2.5
}

export interface ProgressionAdvice {
  action: 'naik' | 'turun' | 'pertahankan'
  nextWeight: number
  reason: string
}

/** Double progression per gerakan (aturan Coach lama):
 *  - Semua set mencapai target repetisi → beban naik 2,5 kg.
 *  - Repetisi jauh tertinggal (rata-rata ≤ target − 2) → beban turun 10%.
 *  - Selain itu → pertahankan beban, kejar target repetisi. */
export function doubleProgression(
  sets: Pick<WorkoutSet, 'weight' | 'reps'>[],
  targetReps: number,
): ProgressionAdvice | null {
  if (sets.length === 0) return null
  const lastWeight = sets[sets.length - 1]!.weight
  const avgReps = sets.reduce((a, s) => a + s.reps, 0) / sets.length
  if (avgReps >= targetReps) {
    return {
      action: 'naik',
      nextWeight: round2_5(lastWeight + 2.5),
      reason: 'Semua set mencapai target repetisi — naikkan beban 2,5 kg.',
    }
  }
  if (avgReps <= targetReps - 2) {
    return {
      action: 'turun',
      nextWeight: round2_5(lastWeight * 0.9),
      reason: 'Repetisi jauh tertinggal — turunkan beban 10% agar teknik terjaga.',
    }
  }
  return {
    action: 'pertahankan',
    nextWeight: lastWeight,
    reason: 'Pertahankan beban — raih target repetisi di semua set dulu.',
  }
}

/* ===== Coach Bugar — deteksi plateau & deload ===== */

export interface PlateauInfo {
  stalled: boolean
  /** e1RM terbaik per tiga sesi terakhir (kronologis). */
  bests: number[]
  /** Rekor e1RM sepanjang histori sebelum tiga sesi terakhir. */
  priorBest: number
}

/** Deteksi stagnasi kekuatan: tiga sesi terakhir sebuah gerakan
 *  tanpa perbaikan e1RM sama sekali → rekomendasi deload. */
export function detectPlateau(
  workouts: Workout[],
  exercise: string,
): PlateauInfo | null {
  /* Sesi berisi gerakan ini, kronologis (terbaru dulu → dibalik). */
  const sessions = workouts
    .filter(
      (w) =>
        w.kind === 'beban' && w.sets.some((s) => s.exercise === exercise),
    )
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .reverse()
  if (sessions.length < 3) return null

  const bestOf = (w: Workout) =>
    Math.max(
      ...w.sets
        .filter((s) => s.exercise === exercise)
        .map((s) => e1rmOf(s.weight, s.reps)),
    )

  const last3 = sessions.slice(-3)
  const bests = last3.map(bestOf)
  const prior = sessions.slice(0, -3)
  const priorBest = prior.length
    ? Math.max(...prior.map(bestOf))
    : Math.max(...bests)

  /* Stagnasi: tidak ada sesi tiga-terakhir yang melampaui rekor
     sebelumnya, dan tidak ada tren naik di dalamnya. */
  const stalled =
    bests.every((b) => b <= priorBest) && bests[2]! <= bests[0]!
  return { stalled, bests, priorBest }
}

/** Apakah sedang masa deload aktif (sampai tanggal deloadUntil). */
export function deloadActive(
  deloadUntil: string | null,
  today: string = todayISO(),
): boolean {
  return deloadUntil != null && today <= deloadUntil
}

/** Target set versi deload — beban dikurangi 50% (aturan Coach lama). */
export function deloadSets(sets: WorkoutSet[]): WorkoutSet[] {
  return sets.map((s) => ({ ...s, weight: round2_5(s.weight * 0.5) }))
}

/* ===== Coach Bugar — guard latihan silang ===== */

export interface GuardInfo {
  tooMuch: boolean
  cardioCount7d: number
  suggestion: string | null
}

/** Guard latihan silang: frekuensi kardio (jalan+lari) 7 hari terakhir
 *  terlalu tinggi (≥ 5 sesi) → sarankan variasi latihan beban/mobilitas. */
export function cardioGuard(
  workouts: Workout[],
  today: string = todayISO(),
): GuardInfo {
  const from = addDaysISO(today, -6)
  const cardioCount7d = workouts.filter(
    (w) => w.kind !== 'beban' && w.date >= from && w.date <= today,
  ).length
  const tooMuch = cardioCount7d >= 5
  return {
    tooMuch,
    cardioCount7d,
    /* v2.45 (audit F10): hitungan memuat badminton juga (semua non-barbel)
       — salinan dulu menyebut "kardio padat" untuk 5 sesi badminton. */
    suggestion: tooMuch
      ? 'Olahraga non-barbel cukup padat 7 hari terakhir — imbangi dengan latihan beban atau mobilitas agar pemulihan tetap seimbang.'
      : null,
  }
}

/* ===== Alat barbel (v3.04 lama) ===== */

export interface PlateSpec {
  kg: number
  /** Warna standar IWF. */
  color: string
}

/** Piring standar IWF — warna resmi. */
export const IWF_PLATES: PlateSpec[] = [
  { kg: 25, color: '#C8102E' }, // merah
  { kg: 20, color: '#1D4E9B' }, // biru
  { kg: 15, color: '#F4C542' }, // kuning
  { kg: 10, color: '#2E7D46' }, // hijau
  { kg: 5, color: '#E8E8E8' }, // putih
  { kg: 2.5, color: '#2B2B2B' }, // hitam
  { kg: 1.25, color: '#B8B8B8' }, // krom
]

export interface PlateLoad {
  spec: PlateSpec
  countPerSide: number
}

export interface PlateLoadResult {
  plates: PlateLoad[]
  /** Total beban yang benar-benar tercapai (kg). */
  achieved: number
  /** Sisa beban yang tak terwakili piring (kg). */
  remainder: number
}

/** Kalkulator Pemuat Piring — piring yang harus dipasang di
 *  MASING-MASING sisi barbel untuk total beban tertentu. */
export function plateLoader(
  totalKg: number,
  barKg = 20,
): PlateLoadResult | null {
  if (!Number.isFinite(totalKg) || totalKg < barKg || barKg <= 0) return null
  let perSide = (totalKg - barKg) / 2
  const plates: PlateLoad[] = []
  for (const spec of IWF_PLATES) {
    const count = Math.floor(perSide / spec.kg + 1e-9)
    if (count > 0) {
      plates.push({ spec, countPerSide: count })
      perSide -= count * spec.kg
    }
  }
  const remainder = Math.round(perSide * 2 * 100) / 100
  const achieved = Math.round((totalKg - remainder) * 100) / 100
  return { plates, achieved, remainder }
}

export interface RmRow {
  pct: number
  kg: number
}

/** Kalkulator 1RM — estimasi Epley + tabel persentase 95–65%
 *  (pembulatan 2,5 kg agar langsung dipakai di barbel). */
export function rmTable(weight: number, reps: number): RmRow[] {
  const e1rm = e1rmOf(weight, reps)
  return [95, 90, 85, 80, 75, 70, 65].map((pct) => ({
    pct,
    kg: round2_5((e1rm * pct) / 100),
  }))
}

/** Tangga pemanasan otomatis: bar kosong → 40% → 60% → 80%
 *  dari beban kerja, pembulatan 2,5 kg (duplikat dilompati). */
export function warmupLadder(
  workKg: number,
  barKg = 20,
): { label: string; kg: number }[] {
  const steps = [
    { label: 'Bar kosong', kg: barKg },
    { label: '40%', kg: round2_5(workKg * 0.4) },
    { label: '60%', kg: round2_5(workKg * 0.6) },
    { label: '80%', kg: round2_5(workKg * 0.8) },
  ]
  const out: { label: string; kg: number }[] = []
  for (const s of steps) {
    if (s.kg >= workKg) continue
    if (out.length > 0 && out[out.length - 1]!.kg === s.kg) continue
    out.push(s)
  }
  return out
}

/* ===== Asupan — neraca kalori dengan kalori aktivitas ===== */

/** Total kalori terbakar hari ini dari sesi latihan (MET × berat ×
 *  durasi) — untuk integrasi neraca Asupan versi lama:
 *  Sisa = Target + Terbakar − Masuk. */
export function burnedToday(
  workouts: Workout[],
  bodyLogs: BodyLogs,
  today: string = todayISO(),
): number {
  const bw = latestWeight(bodyLogs)
  return workouts
    .filter((w) => w.date === today)
    .reduce((a, w) => a + kcalOf(w, bw), 0)
}
