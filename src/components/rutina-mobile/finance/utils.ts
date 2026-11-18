import {
  addDaysISO,
  fromISO,
  isoOf,
  todayISO,
  type FinPeriod,
  type Tx,
} from '../store'

/* ===== Format angka Rupiah ===== */

/** "Rp8.500.000" — pemisah ribuan gaya Indonesia. */
export function formatIDR(n: number): string {
  return 'Rp' + n.toLocaleString('id-ID')
}

/** Bentuk ringkas untuk label kecil: 8.500.000 -> "8,5 jt", 250.000 -> "250 rb". */
export function formatIDRShort(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000
    return `${v.toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)} rb`
  return String(n)
}

const MONTHS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

/** '2025-06-18' -> "18 Jun". */
export function fmtDate(ts: string): string {
  const m = Number(ts.slice(5, 7))
  const d = Number(ts.slice(8, 10))
  return `${d} ${MONTHS_ID[m - 1]}`
}

/* ===== Jendela periode — dihitung dari HARI INI, bukan konstanta demo.
   Sebelumnya WEEK/MONTH/PERIOD_SCOPE/weekdayIdx ter-hardcode Juni 2025
   sehingga transaksi baru berseberangan bulan dari jendela filter. ===== */

/** Pekan berjalan: Senin s.d. Minggu meliputi hari ini. */
function currentWeek(): { start: string; end: string } {
  const today = todayISO()
  const dow = (fromISO(today).getDay() + 6) % 7 // Senin = 0
  const start = addDaysISO(today, -dow)
  return { start, end: addDaysISO(start, 6) }
}

/** Bulan berjalan: tanggal 1 s.d. akhir bulan hari ini. */
function currentMonth(): { start: string; end: string } {
  const now = fromISO(todayISO())
  const start = todayISO().slice(0, 8) + '01'
  const end = isoOf(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  return { start, end }
}

const inRange = (ts: string, r: { start: string; end: string }) =>
  ts >= r.start && ts <= r.end

/** Label cakupan periode terpilih — mengikuti tanggal nyata. */
export function periodScope(period: FinPeriod): string {
  const now = fromISO(todayISO())
  const y = now.getFullYear()
  if (period === 'minggu') {
    const w = currentWeek()
    return `${fmtDate(w.start)} – ${fmtDate(w.end)} ${y}`
  }
  if (period === 'bulan') {
    const monthName = new Intl.DateTimeFormat('id-ID', {
      month: 'long',
    }).format(now)
    return `${monthName} ${y}`
  }
  return `Jan – ${MONTHS_ID[now.getMonth()]} ${y}`
}

/* ===== Deret data grafik per periode ===== */

export interface PeriodPoint {
  label: string
  masuk: number
  keluar: number
}

/** Profil statis bulan-bulan lampau (untuk mode Tahun); bulan berjalan
    selalu diturunkan dari transaksi nyata. */
const YEAR_PROFILE: PeriodPoint[] = [
  { label: 'Jan', masuk: 8_500_000, keluar: 4_300_000 },
  { label: 'Feb', masuk: 9_150_000, keluar: 3_900_000 },
  { label: 'Mar', masuk: 8_500_000, keluar: 4_600_000 },
  { label: 'Apr', masuk: 8_500_000, keluar: 3_750_000 },
  { label: 'Mei', masuk: 9_750_000, keluar: 4_150_000 },
]

/** Indeks hari dalam pekan (0 = Senin) — dari tanggal nyata. */
const weekdayIdx = (ts: string) => (fromISO(ts).getDay() + 6) % 7

export const WEEKDAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const zeros = (labels: string[]): PeriodPoint[] =>
  labels.map((label) => ({ label, masuk: 0, keluar: 0 }))

const accumulate = (pts: PeriodPoint[], idx: number, t: Tx) => {
  if (t.type === 'masuk') pts[idx].masuk += t.amount
  else pts[idx].keluar += t.amount
}

/** Deret batang: minggu -> Sen..Min, bulan -> P1..P4, tahun -> Jan..kini. */
export function buildSeries(txs: Tx[], period: FinPeriod): PeriodPoint[] {
  if (period === 'tahun') {
    const mIdx = fromISO(todayISO()).getMonth()
    /* Bulan berjalan diturunkan dari transaksi; bulan sebelumnya memakai
       profil demo (siklus deterministik untuk tahun > 6 bulan). */
    const current = zeros([MONTHS_ID[mIdx]])
    const m = currentMonth()
    for (const t of txs) if (inRange(t.ts, m)) accumulate(current, 0, t)
    const past = Array.from({ length: mIdx }, (_, i) => ({
      ...YEAR_PROFILE[i % YEAR_PROFILE.length],
      label: MONTHS_ID[i],
    }))
    return [...past, ...current]
  }
  if (period === 'bulan') {
    const pts = zeros(['P1', 'P2', 'P3', 'P4'])
    const m = currentMonth()
    for (const t of txs) {
      if (!inRange(t.ts, m)) continue
      const day = Number(t.ts.slice(8, 10))
      accumulate(pts, Math.min(3, Math.floor((day - 1) / 7)), t)
    }
    return pts
  }
  const pts = zeros(WEEKDAY_LABELS)
  const w = currentWeek()
  for (const t of txs) {
    if (!inRange(t.ts, w)) continue
    accumulate(pts, weekdayIdx(t.ts), t)
  }
  return pts
}

/** Transaksi yang tampil pada daftar, mengikuti periode terpilih. */
export function filterByPeriod(txs: Tx[], period: FinPeriod): Tx[] {
  if (period === 'tahun') return txs
  return txs.filter((t) =>
    inRange(t.ts, period === 'minggu' ? currentWeek() : currentMonth()),
  )
}

/** Total belanja bulan berjalan per kategori — pemakaian anggaran. */
export function spentByCat(txs: Tx[]): Record<string, number> {
  const out: Record<string, number> = {}
  const m = currentMonth()
  for (const t of txs) {
    if (t.type !== 'keluar' || !inRange(t.ts, m)) continue
    out[t.cat] = (out[t.cat] ?? 0) + t.amount
  }
  return out
}

/** Titik aktif bawaan per periode (titik "hari ini"). */
export function defaultActive(period: FinPeriod): number {
  const now = fromISO(todayISO())
  if (period === 'minggu') return (now.getDay() + 6) % 7
  if (period === 'bulan') {
    return Math.min(3, Math.floor((now.getDate() - 1) / 7))
  }
  return now.getMonth()
}
