import {
  addDaysISO,
  fromISO,
  isoOf,
  todayISO,
  type FinPeriod,
  type Tx,
  type Wallet,
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
  /* Transfer antar-dompet bukan arus kas — dilewati di grafik. */
  if (t.type === 'transfer') return
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

/** Transaksi yang tampil pada daftar, mengikuti periode terpilih.
    Transfer tetap tampil di daftar mutasi (uang memang berpindah). */
export function filterByPeriod(txs: Tx[], period: FinPeriod): Tx[] {
  if (period === 'tahun') return txs
  return txs.filter((t) =>
    inRange(t.ts, period === 'minggu' ? currentWeek() : currentMonth()),
  )
}

/** Total belanja bulan berjalan per kategori — pemakaian anggaran.
    Transfer dikecualikan (bukan pengeluaran). */
export function spentByCat(txs: Tx[]): Record<string, number> {
  const out: Record<string, number> = {}
  const m = currentMonth()
  for (const t of txs) {
    if (t.type !== 'keluar' || !inRange(t.ts, m)) continue
    out[t.cat] = (out[t.cat] ?? 0) + t.amount
  }
  return out
}

/* ===== Dompet & saldo ===== */

/** Saldo satu dompet: saldo awal + seluruh mutasi terkait.
    Transaksi tanpa dompet (data lama pra-multi-dompet) TIDAK dihitung
    di sini — ditangani sekali di totalSaldo agar tidak terhitung ganda. */
export function walletBalance(txs: Tx[], w: Wallet): number {
  let bal = w.initial
  for (const t of txs) {
    if (t.type === 'transfer') {
      if (t.walletId === w.id) bal -= t.amount
      if (t.toWalletId === w.id) bal += t.amount
      continue
    }
    if (t.walletId !== w.id) continue
    if (t.type === 'masuk') bal += t.amount
    else if (t.type === 'keluar') bal -= t.amount
  }
  return bal
}

/** Saldo keseluruhan: penjumlahan seluruh dompet + arus transaksi yang
    belum ditautkan ke dompet mana pun (kompatibilitas data lama).
    Bila belum ada dompet sama sekali, hitung langsung dari arus
    masuk-keluar (mode tunggal). */
export function totalSaldo(txs: Tx[], wallets: Wallet[]): number {
  let total = wallets.reduce((a, w) => a + walletBalance(txs, w), 0)
  /* Arus tanpa dompet dihitung sekali secara global. */
  for (const t of txs) {
    if (t.type === 'transfer') continue
    if (t.walletId) continue
    total += t.type === 'masuk' ? t.amount : -t.amount
  }
  return total
}

/* ===== Grup mutasi harian (tab Mutasi) ===== */

export interface DayGroup {
  date: string
  txs: Tx[]
  masuk: number
  keluar: number
}

/** Kelompokkan transaksi per tanggal (terbaru dulu) + ringkasan harian. */
export function groupByDay(txs: Tx[]): DayGroup[] {
  const map = new Map<string, Tx[]>()
  for (const t of txs) {
    const list = map.get(t.ts) ?? []
    list.push(t)
    map.set(t.ts, list)
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, list]) => ({
      date,
      txs: list.sort((a, b) => b.id.localeCompare(a.id)),
      masuk: list.reduce(
        (a, t) => a + (t.type === 'masuk' ? t.amount : 0),
        0,
      ),
      keluar: list.reduce(
        (a, t) => a + (t.type === 'keluar' ? t.amount : 0),
        0,
      ),
    }))
}

/** Label bulan berjalan untuk judul anggaran — selalu tanggal nyata. */
export function currentMonthLabel(): string {
  const now = fromISO(todayISO())
  return new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(now)
}

/** Kunci bulan berjalan "yyyy-mm" — untuk hitung transaksi bulan ini. */
export function currentMonthKey(): string {
  return todayISO().slice(0, 7)
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
