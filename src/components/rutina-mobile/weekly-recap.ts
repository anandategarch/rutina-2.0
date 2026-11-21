/* ============================================================
   Rekap Pekan (Weekly Recap) — logika murni.

   Ringkasan perjalanan pekan berjalan (Senin–Minggu) yang
   membandingkan capaian dengan pekan lalu pada rentang hari
   yang sama — dasar visual "perjalanan pertumbuhan" di Beranda
   (v2.14). Tanpa React & efek samping (aman SSR & unit test).
   ============================================================ */

import {
  addDaysISO,
  bestStreak,
  habitsOn,
  weekStartISO,
  WEEKDAY_MIN,
  XP_PER_TASK,
  fromISO,
  type Completions,
  type Habit,
  type Tx,
  type Workout,
} from './store'

export interface RecapDayInfo {
  iso: string
  /** Label hari singkat (Sen..Min). */
  label: string
  /** Jumlah misi selesai hari itu — SADAR-JADWAL (audit v2.47 (3-d)):
   *  hanya penyelsaian kebiasaan terjadwal hari itu, senada pembilang
   *  hero Beranda v2.45 (habitsOn + isDoneOn); centang luar jadwal
   *  (bonus kartu pemulihan) tidak dihitung. */
  done: number
  /** Kebiasaan terjadwal hari itu (v2.36 — proporsi & kepatuhan). */
  scheduled: number
  /** Target harian tercapai (done ≥ dailyGoal). */
  metGoal: boolean
  isToday: boolean
  isFuture: boolean
}

export interface WeeklyRecapInfo {
  /** Senin..Minggu pekan berjalan (Selalu 7 hari). */
  days: RecapDayInfo[]
  /** Total misi selesai Senin..hari ini pekan berjalan (sadar-jadwal). */
  missionsDone: number
  /** Total misi selesai pekan lalu, Senin..hari yang sama (sadar-jadwal). */
  missionsPrev: number
  /** missionsDone − missionsPrev. */
  delta: number
  /** Sesi latihan pekan ini. */
  workouts: number
  /** XP misi pekan ini (missionsDone × XP_PER_TASK). */
  xp: number
  /** Arus kas bersih pekan ini: masuk − keluar (transfer netral). */
  netFlow: number
  /** Streak aktif terpanjang hari ini. */
  streak: number
  /** Label rentang kompak, mis. "12 – 18 Mei" / "28 Apr – 4 Mei". */
  rangeLabel: string
}

export interface WeeklyRecapInput {
  today: string
  habits: Habit[]
  completions: Completions
  dailyGoal: number
  workouts: Workout[]
  txs: Tx[]
}

/* Bulan singkat Indonesia untuk label rentang kompak. */
const MONTHS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

/** Label rentang kompak: "16 – 22 Nov" (sebulan) atau "28 Okt – 3 Nov"
 *  (lintas bulan) — pendek agar tak ter-truncate di layar 320px. */
export function recapRangeLabel(start: string, end: string): string {
  const s = fromISO(start)
  const e = fromISO(end)
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()} – ${e.getDate()} ${MONTHS_ID[e.getMonth()]}`
  }
  return `${s.getDate()} ${MONTHS_ID[s.getMonth()]} – ${e.getDate()} ${MONTHS_ID[e.getMonth()]}`
}

/** Hitungan misi selesai yang SADAR-JADWAL untuk sebuah tanggal
 *  (audit v2.47 (3-d)): penyelsaian kebiasaan yang dikenal
 *  namun TIDAK terjadwal tanggal itu (bonus kartu pemulihan / Sorotan
 *  risiko runtun) tidak dihitung — senada pembilang hero Beranda v2.45
 *  (habitsOn + isDoneOn), sehingga daun sulur rekap (metGoal) tidak
 *  bertunas dari centang luar jadwal. Entri ber-id yang tak dikenal
 *  tetap dihitung: deleteHabit membersihkan jejak completions-nya,
 *  jadi id yatim bukan buatan aplikasi — dan jadwalnya memang tak
 *  bisa dipastikan. */
function scheduledDoneCountOn(
  habits: Habit[],
  c: Completions,
  dateISO: string,
): number {
  const known = new Set(habits.map((h) => h.id))
  const scheduled = new Set(habitsOn(habits, dateISO).map((h) => h.id))
  let done = 0
  for (const [id, v] of Object.entries(c[dateISO] ?? {})) {
    if (v !== true) continue
    if (known.has(id) && !scheduled.has(id)) continue
    done++
  }
  return done
}

/** Ringkasan pekan berjalan + pembanding pekan lalu. */
export function weeklyRecapOf(input: WeeklyRecapInput): WeeklyRecapInfo {
  const { today, habits, completions, dailyGoal, workouts, txs } = input
  const start = weekStartISO(today)
  const dayIdx = (fromISO(today).getDay() + 6) % 7 // Senin = 0

  /* Strip perjalanan: Senin..Minggu pekan berjalan. Hari setelah
     hari ini ditandai masa depan (belum ada jejak). */
  const days: RecapDayInfo[] = []
  let missionsDone = 0
  for (let d = 0; d < 7; d++) {
    const iso = addDaysISO(start, d)
    const isFuture = iso > today
    const done = scheduledDoneCountOn(habits, completions, iso)
    if (!isFuture) missionsDone += done
    days.push({
      iso,
      label: WEEKDAY_MIN[fromISO(iso).getDay()],
      done,
      scheduled: habitsOn(habits, iso).length,
      metGoal: done >= dailyGoal && dailyGoal > 0,
      isToday: iso === today,
      isFuture,
    })
  }

  /* Pembanding jujur: pekan lalu pada rentang hari yang sama
     (Senin..hari-setara-hari-ini) — bukan pekan penuh 7 hari. Hitungan
     sama-sama sadar-jadwal supaya delta membandingkan apel ke apel
     (audit v2.47 (3-d)). */
  const prevStart = addDaysISO(start, -7)
  let missionsPrev = 0
  for (let d = 0; d <= dayIdx; d++) {
    missionsPrev += scheduledDoneCountOn(
      habits,
      completions,
      addDaysISO(prevStart, d),
    )
  }

  /* Latihan & arus kas pekan berjalan (Senin..hari ini). */
  const end = addDaysISO(start, 6)
  const inWeek = (iso: string) => iso >= start && iso <= end
  const workoutCount = workouts.filter((w) => inWeek(w.date)).length
  let netFlow = 0
  for (const t of txs) {
    if (!inWeek(t.ts)) continue
    if (t.type === 'masuk') netFlow += t.amount
    else if (t.type === 'keluar') netFlow -= t.amount
  }

  return {
    days,
    missionsDone,
    missionsPrev,
    delta: missionsDone - missionsPrev,
    workouts: workoutCount,
    xp: missionsDone * XP_PER_TASK,
    netFlow,
    streak: bestStreak(habits, completions, today).streak,
    rangeLabel: recapRangeLabel(start, end),
  }
}
