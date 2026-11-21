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

/** "Rp8.500.000" — pemisah ribuan gaya Indonesia; negatif memakai
 *  tanda minus tipografis DI DEPAN "Rp" (v2.45: dulu "Rp-25.000"). */
export function formatIDR(n: number): string {
  const sign = n < 0 ? '−' : ''
  return sign + 'Rp' + Math.abs(n).toLocaleString('id-ID')
}

/** Bentuk ringkas untuk label kecil: 8.500.000 -> "8,5 jt", 250.000 ->
 *  "250 rb", 2,5 miliar -> "2,5 M" (v2.45: tingkat miliar + tanda minus
 *  di depan — dulu nominal ≥ 1 jt yang negatif jatuh ke cabang "rb"). */
export function formatIDRShort(n: number): string {
  const sign = n < 0 ? '−' : ''
  const v = Math.abs(n)
  if (v >= 1_000_000_000) {
    return `${sign}${(v / 1_000_000_000).toLocaleString('id-ID', {
      maximumFractionDigits: 1,
    })} M`
  }
  if (v >= 1_000_000) {
    return `${sign}${(v / 1_000_000).toLocaleString('id-ID', {
      maximumFractionDigits: 1,
    })} jt`
  }
  if (v >= 1_000) return `${sign}${Math.round(v / 1_000)} rb`
  return `${sign}${v}`
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

/* ===== Alat bulanan umum — kalender & laporan (audit 7–10) =====
   Semua fungsi murni: kunci bulan "yyyy-mm" (zero-padded), rentang ISO,
   tanpa menyentuh state. */

/** Rentang ISO bulan dari kunci "yyyy-mm": tanggal 1 s.d. akhir bulan. */
export function monthRange(ym: string): { start: string; end: string } {
  const [y, m] = ym.split('-').map(Number)
  const year = y ?? 1970
  const month = (m ?? 1) - 1
  const lastDay = new Date(year, month + 1, 0).getDate()
  const mm = String((m ?? 1)).padStart(2, '0')
  const dd = String(lastDay).padStart(2, '0')
  return { start: `${ym}-01`, end: `${year}-${mm}-${dd}` }
}

/** Label bulan panjang + tahun: "Juni 2025" (id-ID). */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(y ?? 1970, (m ?? 1) - 1, 1))
}

/** Kunci bulan "yyyy-mm" digeser n bulan (n boleh negatif). */
export function shiftMonthKey(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y ?? 1970, (m ?? 1) - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Total masuk & keluar bulan tertentu (transfer dikecualikan —
 *  sama filosofi dengan grafik arus kas). */
export function monthFlow(txs: Tx[], ym: string): { masuk: number; keluar: number } {
  const r = monthRange(ym)
  let masuk = 0
  let keluar = 0
  for (const t of txs) {
    if (t.type === 'transfer') continue
    if (t.ts < r.start || t.ts > r.end) continue
    if (t.type === 'masuk') masuk += t.amount
    else keluar += t.amount
  }
  return { masuk, keluar }
}

/** Total pengeluaran (keluar, tanpa transfer) satu bulan — versi umum
 *  dari spentByCat: menerima kunci bulan apa pun, bukan hanya berjalan. */
export function monthSpend(txs: Tx[], ym: string): number {
  return monthFlow(txs, ym).keluar
}

/** Pengeluaran per kategori (keluar, tanpa transfer) pada bulan tertentu. */
export function monthSpendByCat(txs: Tx[], ym: string): Record<string, number> {
  const r = monthRange(ym)
  const out: Record<string, number> = {}
  for (const t of txs) {
    if (t.type !== 'keluar') continue
    if (t.ts < r.start || t.ts > r.end) continue
    out[t.cat] = (out[t.cat] ?? 0) + t.amount
  }
  return out
}

/** Rekap pengeluaran satu hari untuk peta panas: total + jumlah transaksi. */
export interface DaySpend {
  total: number
  count: number
}

/** Total & jumlah transaksi keluar per tanggal (tanpa transfer) —
 *  dasar peta panas pengeluaran dan pembanding mingguan. */
export function spendByDay(txs: Tx[]): Record<string, DaySpend> {
  const out: Record<string, DaySpend> = {}
  for (const t of txs) {
    if (t.type !== 'keluar') continue
    const cur = out[t.ts] ?? { total: 0, count: 0 }
    cur.total += t.amount
    cur.count += 1
    out[t.ts] = cur
  }
  return out
}

/* ===== Jatah harian & proyeksi anggaran (v2.22) ===== */

export interface AllowanceInfo {
  /** Total anggaran bulan berjalan (Rp). */
  budgetTotal: number
  /** Pengeluaran kategori teranggarkan bulan ini s.d. hari ini (Rp). */
  spent: number
  /** Sisa anggaran (Rp) — bisa negatif bila sudah lewat batas. */
  remaining: number
  /** Hari tersisa bulan ini (termasuk hari ini). */
  daysLeft: number
  /** Jatah aman per hari: sisa anggaran ÷ hari tersisa (Rp). */
  daily: number
  /** Rata-rata belanja harian sejauh ini (Rp). */
  avgDaily: number
  /** Proyeksi total belanja akhir bulan bila laju tetap (Rp). */
  projection: number
  /** Vonis proyeksi terhadap total anggaran. */
  verdict: 'aman' | 'waspada' | 'lewat'
  /** Persentase anggaran terpakai (0–100+, dibatasi tampilan). */
  pacePct: number
  /** Persentase "ideal" — porsi bulan yang sudah berlalu (0–100). */
  idealPct: number
}

/** Jatah harian + proyeksi akhir bulan dari anggaran & pengeluaran nyata
 *  (v2.22 — reinkarnasi "Jatah Harian" Rutina 1.0 dalam bahasa desain 2.0).
 *  Mengembalikan null bila belum ada anggaran sama sekali. */
export function allowanceInfo(
  budgets: Record<string, number>,
  txs: Tx[],
  today = todayISO(),
): AllowanceInfo | null {
  const budgetCats = Object.keys(budgets).filter((c) => (budgets[c] ?? 0) > 0)
  if (budgetCats.length === 0) return null
  const budgetTotal = budgetCats.reduce((a, c) => a + (budgets[c] ?? 0), 0)

  const ym = today.slice(0, 7)
  const r = monthRange(ym)
  let spent = 0
  for (const t of txs) {
    if (t.type !== 'keluar') continue
    if (t.ts < r.start || t.ts > r.end || t.ts > today) continue
    if (budgetCats.includes(t.cat)) spent += t.amount
  }

  const now = fromISO(today)
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - dayOfMonth + 1
  const remaining = budgetTotal - spent
  const daily = Math.max(0, Math.round(remaining / Math.max(1, daysLeft)))
  const avgDaily = Math.round(spent / Math.max(1, dayOfMonth))
  /* Proyeksi jujur: belanja hari ini sudah termasuk di `spent`; sisa
     hari (daysLeft - 1) berjalan pada laju rata-rata. */
  const projTotal = spent + avgDaily * (daysLeft - 1)
  const verdict =
    projTotal <= budgetTotal
      ? 'aman'
      : projTotal <= budgetTotal * 1.1
        ? 'waspada'
        : 'lewat'
  const pacePct = budgetTotal > 0 ? (spent / budgetTotal) * 100 : 0
  const idealPct = (dayOfMonth / daysInMonth) * 100
  return {
    budgetTotal,
    spent,
    remaining,
    daysLeft,
    daily,
    avgDaily,
    projection: Math.round(projTotal),
    verdict,
    pacePct: Math.min(999, Math.round(pacePct)),
    idealPct: Math.round(idealPct),
  }
}

/* ===== Arus dana per dompet (v2.22) ===== */

export interface WalletFlow {
  masuk: number
  keluar: number
  net: number
  count: number
}

/** Mutasi masuk/keluar satu dompet pada bulan tertentu (transfer dihitung
 *  sebagai perpindahan: keluar dari asal, masuk ke tujuan). */
export function walletFlow(txs: Tx[], walletId: string, ym: string): WalletFlow {
  const r = monthRange(ym)
  let masuk = 0
  let keluar = 0
  let count = 0
  for (const t of txs) {
    if (t.ts < r.start || t.ts > r.end) continue
    if (t.type === 'transfer') {
      if (t.walletId === walletId) {
        keluar += t.amount
        count++
      }
      if (t.toWalletId === walletId) {
        masuk += t.amount
        count++
      }
      continue
    }
    if (t.walletId !== walletId) continue
    count++
    if (t.type === 'masuk') masuk += t.amount
    else keluar += t.amount
  }
  return { masuk, keluar, net: masuk - keluar, count }
}

/* ===== Langganan aktif (v2.22) — agregasi transaksi berulang ===== */

export interface Subscription {
  id: string
  cat: string
  amount: number
  recurrence: 'mingguan' | 'bulanan'
  /** Setara biaya per bulan (mingguan × 52/12). */
  monthly: number
  /** Pencatatan terakhir dalam rantai (templat atau salinan terbaru). */
  lastTs: string
  count: number
}

/** Daftar langganan aktif dari templat transaksi berulang + total per
 *  bulan — dasar kartu "Langgananmu" (v2.22). */
export function subscriptionsOf(txs: Tx[]): {
  items: Subscription[]
  monthlyTotal: number
} {
  const templates = txs.filter((t) => t.recurrence && !t.recurOf)
  const items: Subscription[] = templates.map((tpl) => {
    const chain = txs.filter((t) => t.id === tpl.id || t.recurOf === tpl.id)
    const lastTs = chain.reduce((latest, t) => (t.ts > latest ? t.ts : latest), tpl.ts)
    const recurrence = (tpl.recurrence ?? 'bulanan') as 'mingguan' | 'bulanan'
    return {
      id: tpl.id,
      cat: tpl.cat,
      amount: tpl.amount,
      recurrence,
      monthly:
        recurrence === 'bulanan'
          ? tpl.amount
          : Math.round((tpl.amount * 52) / 12),
      lastTs,
      count: chain.length,
    }
  })
  items.sort((a, b) => b.monthly - a.monthly)
  const monthlyTotal = items.reduce((a, s) => a + s.monthly, 0)
  return { items, monthlyTotal }
}
