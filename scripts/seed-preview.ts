/**
 * seed-preview.ts — isi database LOKAL (sandbox) dengan dataset contoh
 * yang realistis untuk peninjauan visual mobile (Rutina 2.0).
 *
 * Hanya untuk lingkungan pengembangan: menjalankan PUT /api/state penuh
 * ke server dev (localhost:3000). TIDAK menyentuh Turso produksi.
 *
 *   bun run scripts/seed-preview.ts
 */

const BASE = process.env.SEED_BASE_URL ?? 'http://localhost:3000'

/* ===== Util tanggal ===== */
function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function daysAgo(n: number): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return iso(d)
}

/* ===== Kebiasaan — 11 aktif lintas 5 kategori ===== */
const habitSeeds: {
  id: string
  title: string
  cat: string
  schedule: number[]
  weeklyTarget: number
  target?: number
  unit?: string
}[] = [
  { id: 'sd-h1', title: 'Minum 8 gelas air', cat: 'Kesehatan', schedule: [0, 1, 2, 3, 4, 5, 6], weeklyTarget: 7, target: 8, unit: 'gelas' },
  { id: 'sd-h2', title: 'Sarapan sehat', cat: 'Kesehatan', schedule: [0, 1, 2, 3, 4, 5, 6], weeklyTarget: 6 },
  { id: 'sd-h3', title: 'Tidur sebelum 23.00', cat: 'Kesehatan', schedule: [0, 1, 2, 3, 4], weeklyTarget: 5 },
  { id: 'sd-h4', title: 'Fokus kerja 90 menit', cat: 'Kerja', schedule: [1, 2, 3, 4, 5], weeklyTarget: 5 },
  { id: 'sd-h5', title: 'Rapikan meja kerja', cat: 'Kerja', schedule: [5], weeklyTarget: 1 },
  { id: 'sd-h6', title: 'Baca 10 halaman', cat: 'Belajar', schedule: [0, 1, 2, 3, 4, 5, 6], weeklyTarget: 7 },
  { id: 'sd-h7', title: 'Belajar Bahasa Jepang', cat: 'Belajar', schedule: [1, 3, 5], weeklyTarget: 3 },
  { id: 'sd-h8', title: 'Meditasi 10 menit', cat: 'Pribadi', schedule: [0, 1, 2, 3, 4, 5, 6], weeklyTarget: 7 },
  { id: 'sd-h9', title: 'Jalan pagi 30 menit', cat: 'Kebiasaan', schedule: [0, 2, 4, 6], weeklyTarget: 4 },
  { id: 'sd-h10', title: 'Jurnal malam', cat: 'Kebiasaan', schedule: [0, 1, 2, 3, 4, 5, 6], weeklyTarget: 7 },
  { id: 'sd-h11', title: 'Siram tanaman', cat: 'Kebiasaan', schedule: [2, 6], weeklyTarget: 2 },
]

const habits = habitSeeds.map((h, i) => ({
  id: h.id,
  title: h.title,
  desc: '',
  cat: h.cat,
  schedule: h.schedule,
  weeklyTarget: h.weeklyTarget,
  reminder: null,
  restDays: [] as string[],
  afterId: null,
  mini: '',
  target: h.target ?? null,
  unit: h.unit ?? null,
  groupId: null,
  linkedActivity: null,
  archived: false,
  createdAt: daysAgo(60 - i),
}))

/* ===== Completions — 35 hari, pola meyakinkan (akhir pekan lebih longgar) */
const completions: Record<string, Record<string, boolean | number>> = {}
for (let back = 34; back >= 0; back--) {
  const date = daysAgo(back)
  const dow = new Date(`${date}T12:00:00`).getDay()
  const day: Record<string, boolean | number> = {}
  for (const h of habitSeeds) {
    if (!h.schedule.includes(dow)) continue
    /* probabilitas selesai: hari kerja 0.78, akhir pekan 0.5 */
    const p = dow === 0 || dow === 6 ? 0.5 : 0.78
    if (Math.random() < p) {
      day[h.id] =
        h.id === 'sd-h1'
          ? Math.min(8, 4 + Math.floor(Math.random() * 5))
          : true
    }
  }
  if (Object.keys(day).length > 0) completions[date] = day
}

/* ===== Mood 14 hari — ada celah (tanpa check-in) ===== */
const moodCycle = ['Ceria', 'Baik', 'Biasa', 'Baik', null, 'Lelah', 'Baik']
const moodLogs: Record<string, string> = {}
for (let back = 13; back >= 0; back--) {
  const m = moodCycle[back % moodCycle.length]
  if (m) moodLogs[daysAgo(back)] = m
}

/* ===== Keuangan ===== */
const wallets = [
  { id: 'sd-w1', name: 'Dompet Utama', initial: 2_500_000 },
  { id: 'sd-w2', name: 'Tabungan', initial: 12_000_000 },
]
const txs: unknown[] = []
let txSeq = 0
for (let back = 30; back >= 0; back--) {
  const date = daysAgo(back)
  /* Gaji bulanan sekali */
  if (back === 28) {
    txs.push({ id: `sd-t${txSeq++}`, type: 'masuk', cat: 'Gaji', amount: 8_500_000, note: '', ts: date, walletId: 'sd-w1' })
  }
  /* Pengeluaran harian acak */
  if (Math.random() < 0.8) {
    const cats: [string, number, number][] = [
      ['Makan & Minum', 15000, 65000],
      ['Transportasi', 10000, 40000],
      ['Belanja', 30000, 180000],
      [' Hiburan', 20000, 90000],
      ['Tagihan', 50000, 300000],
    ]
    const [cat, lo, hi] = cats[Math.floor(Math.random() * cats.length)]
    txs.push({
      id: `sd-t${txSeq++}`,
      type: 'keluar',
      cat: cat.trim(),
      amount: lo + Math.floor(Math.random() * (hi - lo)),
      note: '',
      ts: date,
      walletId: 'sd-w1',
    })
  }
}
/* Transfer antar dompet — tidak boleh dihitung sebagai arus */
txs.push({ id: `sd-t${txSeq++}`, type: 'transfer', cat: 'Transfer', amount: 1_000_000, note: '', ts: daysAgo(5), walletId: 'sd-w1', toWalletId: 'sd-w2' })

const budgets: Record<string, number> = {
  'Makan & Minum': 1_500_000,
  Transportasi: 600_000,
  Belanja: 1_000_000,
  Hiburan: 500_000,
  Tagihan: 1_200_000,
}

const goals = [
  { id: 'sd-g1', name: 'Dana Darurat', target: 20_000_000, saved: 12_000_000, contributions: [] },
  { id: 'sd-g2', name: 'Laptop Baru', target: 15_000_000, saved: 4_500_000, contributions: [] },
]

/* ===== Bugar — sesi campuran 3 pekan ===== */
const workouts: unknown[] = []
const exLib: Record<string, { exercise: string; weight: number; reps: number }[]> = {
  beban: [
    { exercise: 'Bench Press', weight: 60, reps: 8 },
    { exercise: 'Squat', weight: 90, reps: 6 },
    { exercise: 'Barbell Row', weight: 55, reps: 8 },
    { exercise: 'Overhead Press', weight: 35, reps: 8 },
  ],
}
for (let back = 20; back >= 0; back -= 2) {
  const kind = back % 6 === 0 ? 'beban' : back % 6 === 2 ? 'jalan' : 'lari'
  workouts.push({
    id: `sd-wo${back}`,
    kind,
    date: daysAgo(back),
    duration: kind === 'beban' ? 55 : kind === 'jalan' ? 40 : 30,
    note: '',
    sets: kind === 'beban' ? exLib.beban : [],
    distance: kind === 'jalan' ? 4.2 : kind === 'lari' ? 5.8 : null,
    kcal: kind === 'beban' ? 320 : 280,
  })
}

/* ===== Asupan & body log ===== */
const foodEntries: unknown[] = []
for (const [back, meal] of [
  [0, 'sarapan'], [0, 'makan-siang'], [0, 'makan-malam'], [1, 'makan-siang'], [1, 'makan-malam'],
] as [number, string][]) {
  foodEntries.push({
    id: `sd-f${back}-${meal}`,
    date: daysAgo(back),
    name: meal === 'sarapan' ? 'Nasi + ayam + sayur' : 'Ayam geprek + es teh',
    cat: 'Makanan Indonesia',
    unit: 'porsi',
    portion: 1,
    meal,
    kcal: meal === 'sarapan' ? 520 : 710,
    protein: meal === 'sarapan' ? 32 : 28,
    carb: meal === 'sarapan' ? 65 : 78,
    fat: meal === 'sarapan' ? 14 : 26,
  })
}
const bodyLogs: Record<string, unknown> = {}
for (let back = 13; back >= 0; back--) {
  bodyLogs[daysAgo(back)] = {
    water: 5 + Math.floor(Math.random() * 4),
    weight: 74 + Math.random() * 1.2,
    sleepH: 6 + Math.random() * 2.5,
    energy: 2 + Math.floor(Math.random() * 3),
    soreness: 1 + Math.floor(Math.random() * 3),
    stress: 1 + Math.floor(Math.random() * 3),
  }
}

/* ===== Jurnal ===== */
const notes = [
  { id: 'sd-n1', title: 'Refleksi minggu', body: 'Pekan yang cukup padat — fokus kerja mulai stabil, tinggal menjaga ritme tidur.', date: daysAgo(3), pinned: false, tone: 1, folder: 'utama' },
  { id: 'sd-n2', title: 'Ide proyek', body: 'Konsep aplikasi pencatat keuangan sederhana untuk keluarga.', date: daysAgo(7), pinned: true, tone: 2, folder: 'ide' },
]

/* ===== Rakit snapshot ===== */
const state = {
  habits,
  completions,
  habitAuto: {},
  notes,
  txs,
  goals,
  wallets,
  budgets,
  customCats: [{ id: 'sd-cc1', name: 'Kopi', type: 'keluar' }],
  workouts,
  foodEntries,
  calorieTarget: 2100,
  bodyLogs,
  dailyGoal: 5,
  mood: 'Baik',
  moodLogs,
  identityText: 'Aku orang yang menjaga ritme',
  deloadUntil: null,
  bonusClaimedOn: null,
  quoteSaved: false,
  quoteSavedDate: null,
  habitGroups: [],
  catRenames: {},
  hiddenCats: [],
  fitTargets: { minutes: 150, sessions: 3, water: 8, protein: 110, carb: 250, fat: 60, weightGoal: 70, heightCm: 172 },
}

async function main() {
  const res = await fetch(`${BASE}/api/state`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ state }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PUT gagal ${res.status}: ${text.slice(0, 500)}`)
  }
  const json = (await res.json()) as { counts: Record<string, number> }
  console.log('Seed OK —', JSON.stringify(json.counts))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
