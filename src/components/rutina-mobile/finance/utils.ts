import type { FinPeriod, Tx } from '../store'

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

/* ===== Jendela periode demo (Juni 2025; pekan berjalan 16-22) ===== */

const WEEK = { start: '2025-06-16', end: '2025-06-22' }
const MONTH = { start: '2025-06-01', end: '2025-06-30' }

const inRange = (ts: string, r: { start: string; end: string }) =>
  ts >= r.start && ts <= r.end

export const PERIOD_SCOPE: Record<FinPeriod, string> = {
  minggu: '16 - 22 Jun 2025',
  bulan: 'Juni 2025',
  tahun: 'Jan - Jun 2025',
}

/* ===== Deret data grafik per periode ===== */

export interface PeriodPoint {
  label: string
  masuk: number
  keluar: number
}

/** Profil statis Jan-Mei (untuk mode Tahun); Juni diturunkan dari transaksi. */
const YEAR_PROFILE: PeriodPoint[] = [
  { label: 'Jan', masuk: 8_500_000, keluar: 4_300_000 },
  { label: 'Feb', masuk: 9_150_000, keluar: 3_900_000 },
  { label: 'Mar', masuk: 8_500_000, keluar: 4_600_000 },
  { label: 'Apr', masuk: 8_500_000, keluar: 3_750_000 },
  { label: 'Mei', masuk: 9_750_000, keluar: 4_150_000 },
]

/** Indeks hari dalam pekan (0 = Senin) tanpa objek Date — 16 Jun 2025 adalah Senin. */
const weekdayIdx = (ts: string) => (Number(ts.slice(8, 10)) - 16 + 28) % 7

export const WEEKDAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const zeros = (labels: string[]): PeriodPoint[] =>
  labels.map((label) => ({ label, masuk: 0, keluar: 0 }))

const accumulate = (pts: PeriodPoint[], idx: number, t: Tx) => {
  if (t.type === 'masuk') pts[idx].masuk += t.amount
  else pts[idx].keluar += t.amount
}

/** Deret batang: minggu -> Sen..Min, bulan -> P1..P4, tahun -> Jan..Jun. */
export function buildSeries(txs: Tx[], period: FinPeriod): PeriodPoint[] {
  if (period === 'tahun') {
    const june = zeros(['Jun'])
    for (const t of txs) if (inRange(t.ts, MONTH)) accumulate(june, 0, t)
    return [...YEAR_PROFILE, ...june]
  }
  if (period === 'bulan') {
    const pts = zeros(['P1', 'P2', 'P3', 'P4'])
    for (const t of txs) {
      if (!inRange(t.ts, MONTH)) continue
      const day = Number(t.ts.slice(8, 10))
      accumulate(pts, Math.min(3, Math.floor((day - 1) / 7)), t)
    }
    return pts
  }
  const pts = zeros(WEEKDAY_LABELS)
  for (const t of txs) {
    if (!inRange(t.ts, WEEK)) continue
    accumulate(pts, weekdayIdx(t.ts), t)
  }
  return pts
}

/** Transaksi yang tampil pada daftar, mengikuti periode terpilih. */
export function filterByPeriod(txs: Tx[], period: FinPeriod): Tx[] {
  if (period === 'tahun') return txs
  return txs.filter((t) => inRange(t.ts, period === 'minggu' ? WEEK : MONTH))
}

/** Total belanja Juni per kategori — pemakaian anggaran. */
export function spentByCat(txs: Tx[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const t of txs) {
    if (t.type !== 'keluar' || !inRange(t.ts, MONTH)) continue
    out[t.cat] = (out[t.cat] ?? 0) + t.amount
  }
  return out
}

/** Titik aktif bawaan per periode (titik "hari ini"). */
export function defaultActive(period: FinPeriod): number {
  if (period === 'minggu') return 4 // Jum
  if (period === 'bulan') return 2 // P3 (pekan berjalan)
  return 5 // Jun
}
