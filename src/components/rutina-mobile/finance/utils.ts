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

/** Label cakupan periode terpilih — mengikuti tanggal nyata. Untuk tahun,
    cakupan mengikuti bulan terawal yang benar-benar punya transaksi. */
export function periodScope(period: FinPeriod, txs: Tx[] = []): string {
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
  const w = yearWindow(txs)
  return w.first === w.now
    ? `${MONTHS_ID[w.now]} ${y}`
    : `${MONTHS_ID[w.first]} – ${MONTHS_ID[w.now]} ${y}`
}

/* ===== Deret data grafik per periode ===== */

export interface PeriodPoint {
  label: string
  masuk: number
  keluar: number
}

/** Cakupan tampilan Tahun: dari bulan terawal yang benar-benar memiliki
    transaksi tahun berjalan (minimal bulan ini) hingga bulan berjalan.
    Bulan tanpa data tidak direkayasa — grafik hanya memuat bulan nyata. */
export function yearWindow(txs: Tx[]): {
  first: number
  now: number
  year: number
} {
  const now = fromISO(todayISO())
  const year = now.getFullYear()
  let first = now.getMonth()
  for (const t of txs) {
    if (Number(t.ts.slice(0, 4)) !== year) continue
    const tm = Number(t.ts.slice(5, 7)) - 1
    if (tm < first) first = tm
  }
  return { first, now: now.getMonth(), year }
}

/** Indeks hari dalam pekan (0 = Senin) — dari tanggal nyata. */
const weekdayIdx = (ts: string) => (fromISO(ts).getDay() + 6) % 7

export const WEEKDAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const zeros = (labels: string[]): PeriodPoint[] =>
  labels.map((label) => ({ label, masuk: 0, keluar: 0 }))

const accumulate = (pts: PeriodPoint[], idx: number, t: Tx) => {
  if (t.type === 'masuk') pts[idx].masuk += t.amount
  else pts[idx].keluar += t.amount
}

/** Deret batang: minggu -> Sen..Min, bulan -> P1..P4, tahun -> bulan
    terawal bertransaksi..bulan berjalan — semuanya dari data nyata. */
export function buildSeries(txs: Tx[], period: FinPeriod): PeriodPoint[] {
  if (period === 'tahun') {
    const w = yearWindow(txs)
    const pts = zeros(MONTHS_ID.slice(w.first, w.now + 1))
    for (const t of txs) {
      const ty = Number(t.ts.slice(0, 4))
      const tm = Number(t.ts.slice(5, 7)) - 1
      if (ty !== w.year || tm < w.first || tm > w.now) continue
      accumulate(pts, tm - w.first, t)
    }
    return pts
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
export function defaultActive(period: FinPeriod, txs: Tx[] = []): number {
  const now = fromISO(todayISO())
  if (period === 'minggu') return (now.getDay() + 6) % 7
  if (period === 'bulan') {
    return Math.min(3, Math.floor((now.getDate() - 1) / 7))
  }
  return now.getMonth() - yearWindow(txs).first
}
