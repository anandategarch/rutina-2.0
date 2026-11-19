/* ============================================================
   Sorotan Hari Ini (Daily Highlight) — logika murni.

   Beranda selalu menunjukkan SATU hal paling relevan untuk hari
   itu (v2.14). Kandidat diprioritaskan: mendesak → bernilai →
   rayakan → netral. Tanpa React & efek samping (aman SSR & test).

   Prioritas:
     1. streak-risk     — kebiasaan beruntun ≥3 hari belum selesai hari ini
     2. budget-warning  — kategori anggaran terpakai ≥85% bulan ini
     3. workout-stale   — ≥3 hari tanpa latihan (punya histori latihan)
     4. goal-near       — tujuan tabungan terdanai ≥80% (positif)
     5. bonus           — bonus harian belum diklaim
     6. perfect         — semua misi hari ini selesai (rayakan)
     7. quiet           — tidak ada misi terjadwal hari ini
     8. welcome         — belum punya kebiasaan aktif sama sekali
   ============================================================ */

import { CAT_META } from './finance/cats'
import {
  addDaysISO,
  fromISO,
  habitStreak,
  habitsOn,
  isDoneOn,
  scheduledOn,
  type Budgets,
  type Completions,
  type Goal,
  type Habit,
  type Tx,
  type Workout,
} from './store'

/* ===== Ambang kandidat (diekspor untuk pengujian) ===== */

/** Streak minimum agar kebiasaan yang belum selesai hari ini dianggap
 *  "dipertaruhkan". */
export const STREAK_RISK_MIN = 3
/** Rasio pemakaian anggaran (terpakai / batas) yang memicu peringatan. */
export const BUDGET_WARN_PCT = 0.85
/** Hari tanpa latihan sebelum sorotan "saatnya bergerak". */
export const WORKOUT_STALE_DAYS = 3
/** Rasio danai tujuan yang dianggap "hampir tercapai" (belum 100%). */
export const GOAL_NEAR_PCT = 0.8

export type HighlightKey =
  | 'streak-risk'
  | 'budget-warning'
  | 'workout-stale'
  | 'goal-near'
  | 'bonus'
  | 'perfect'
  | 'quiet'
  | 'welcome'

/** Modul asal sorotan — menentukan aksen warna kartu. */
export type HighlightModule = 'kebiasaan' | 'keuangan' | 'bugar' | 'beranda'

/** Aksi CTA — dipetakan komponen kartu ke aksi store. */
export type HighlightCta =
  | 'complete-habit'
  | 'open-budget'
  | 'log-workout'
  | 'contribute-goal'
  | 'claim-bonus'
  | 'open-stats'
  | 'add-habit'

export interface DailyHighlight {
  key: HighlightKey
  module: HighlightModule
  title: string
  text: string
  cta: HighlightCta
  /** Payload mini-visual per jenis sorotan (discriminated by key). */
  visual:
    | { kind: 'streak'; streak: number; habitId: string }
    | {
        kind: 'budget'
        cat: string
        catLabel: string
        spent: number
        limit: number
        pct: number
      }
    | { kind: 'stale'; daysSince: number }
    | {
        kind: 'goal'
        goalId: string
        goalName: string
        saved: number
        target: number
        pct: number
      }
    | { kind: 'bonus'; xp: number }
    | { kind: 'perfect'; missions: number }
    | { kind: 'plain' }
}

export interface HighlightInput {
  today: string
  habits: Habit[]
  completions: Completions
  txs: Tx[]
  budgets: Budgets
  goals: Goal[]
  workouts: Workout[]
  bonusClaimed: boolean
  /** XP bonus harian — untuk teks CTA klaim. */
  bonusXp: number
}

/** Total pengeluaran bulan berjalan per kategori (tipe keluar saja). */
function monthSpendByCat(txs: Tx[], today: string): Map<string, number> {
  const month = today.slice(0, 7)
  const out = new Map<string, number>()
  for (const t of txs) {
    if (t.type !== 'keluar') continue
    if (t.ts.slice(0, 7) !== month) continue
    out.set(t.cat, (out.get(t.cat) ?? 0) + t.amount)
  }
  return out
}

/** Selisih hari antara dua tanggal ISO (b − a). */
function daysBetween(a: string, b: string): number {
  return Math.round(
    (fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000,
  )
}

/** Pilih SATU sorotan paling relevan untuk hari ini. */
export function pickDailyHighlight(input: HighlightInput): DailyHighlight {
  const {
    today,
    habits,
    completions,
    txs,
    budgets,
    goals,
    workouts,
    bonusClaimed,
    bonusXp,
  } = input

  const active = habits.filter((h) => !h.archived)
  const todayHabits = habitsOn(habits, today)

  /* 1 — Streak dipertaruhkan: terjadwal hari ini, belum selesai,
         runtun aktif terpanjang di antara kandidat. */
  const risky = todayHabits
    .filter(
      (h) =>
        !isDoneOn(completions, today, h.id) &&
        habitStreak(h, completions, today) >= STREAK_RISK_MIN,
    )
    .sort(
      (a, b) =>
        habitStreak(b, completions, today) -
        habitStreak(a, completions, today),
    )
  const top = risky[0]
  if (top) {
    const streak = habitStreak(top, completions, today)
    return {
      key: 'streak-risk',
      module: 'kebiasaan',
      title: `Streak ${streak} hari dipertaruhkan`,
      text: `"${top.title}" belum selesai hari ini — selesaikan sekarang agar runtun tetap hidup.`,
      cta: 'complete-habit',
      visual: { kind: 'streak', streak, habitId: top.id },
    }
  }

  /* 2 — Anggaran hampir lewat: rasio terpakai tertinggi ≥ ambang. */
  const spend = monthSpendByCat(txs, today)
  let worst: { cat: string; spent: number; limit: number; pct: number } | null =
    null
  for (const [cat, limit] of Object.entries(budgets)) {
    if (!(limit > 0)) continue
    const spent = spend.get(cat) ?? 0
    const pct = spent / limit
    if (pct >= BUDGET_WARN_PCT && (!worst || pct > worst.pct)) {
      worst = { cat, spent, limit, pct }
    }
  }
  if (worst) {
    return {
      key: 'budget-warning',
      module: 'keuangan',
      title: `Anggaran ${CAT_META[worst.cat as keyof typeof CAT_META]?.label ?? worst.cat} hampir habis`,
      text: `Sudah terpakai ${Math.round(worst.pct * 100)}% dari batas bulan ini — sisa Rp${(worst.limit - worst.spent).toLocaleString('id-ID')}.`,
      cta: 'open-budget',
      visual: {
        kind: 'budget',
        cat: worst.cat,
        catLabel:
          CAT_META[worst.cat as keyof typeof CAT_META]?.label ?? worst.cat,
        spent: worst.spent,
        limit: worst.limit,
        pct: worst.pct,
      },
    }
  }

  /* 3 — Tubuh menunggu bergerak: punya histori latihan namun lumpuh
         ≥ WORKOUT_STALE_DAYS hari (tanpa latihan tidak dinag — bukan
         domainnya). */
  if (workouts.length > 0) {
    const last = workouts.reduce(
      (max, w) => (w.date > max ? w.date : max),
      workouts[0]!.date,
    )
    const daysSince = daysBetween(last, today)
    if (daysSince >= WORKOUT_STALE_DAYS) {
      return {
        key: 'workout-stale',
        module: 'bugar',
        title: `Sudah ${daysSince} hari tanpa latihan`,
        text: 'Tubuh menunggu bergerak — sesi singkat 20 menit pun berarti.',
        cta: 'log-workout',
        visual: { kind: 'stale', daysSince },
      }
    }
  }

  /* 4 — Tujuan hampir tercapai (positif): rasio danai tertinggi. */
  const near = goals
    .filter((g) => g.target > 0 && g.saved / g.target >= GOAL_NEAR_PCT && g.saved < g.target)
    .sort((a, b) => b.saved / b.target - a.saved / a.target)[0]
  if (near) {
    const pct = near.saved / near.target
    return {
      key: 'goal-near',
      module: 'keuangan',
      title: `"${near.name}" hampir tercapai`,
      text: `Terdanai ${Math.round(pct * 100)}% — sedikit lagi menuju target.`,
      cta: 'contribute-goal',
      visual: {
        kind: 'goal',
        goalId: near.id,
        goalName: near.name,
        saved: near.saved,
        target: near.target,
        pct,
      },
    }
  }

  /* 5 — Bonus harian menunggu (hanya bila pengguna benar-benar
     menjalani ekonomi misi — pengguna baru tanpa kebiasaan lebih
     tepat disambut dulu lewat welcome). */
  if (!bonusClaimed && active.length > 0) {
    return {
      key: 'bonus',
      module: 'beranda',
      title: 'Bonus harian menunggu',
      text: `Klaim +${bonusXp} XP gratis — konsistensi dihargai setiap hari.`,
      cta: 'claim-bonus',
      visual: { kind: 'bonus', xp: bonusXp },
    }
  }

  /* 6 — Hari sempurna: semua misi terjadwal hari ini selesai. */
  const doneToday = todayHabits.filter((h) =>
    isDoneOn(completions, today, h.id),
  ).length
  if (todayHabits.length > 0 && doneToday === todayHabits.length) {
    return {
      key: 'perfect',
      module: 'beranda',
      title: 'Hari yang sempurna!',
      text: `Semua ${todayHabits.length} misi selesai — beristirahatlah dengan bangga.`,
      cta: 'open-stats',
      visual: { kind: 'perfect', missions: todayHabits.length },
    }
  }

  /* 7 — Jadwal kosong: ada kebiasaan aktif tapi tidak terjadwal hari ini. */
  if (active.length > 0 && todayHabits.length === 0) {
    return {
      key: 'quiet',
      module: 'kebiasaan',
      title: 'Tidak ada misi hari ini',
      text: 'Jadwal kosong — hari yang baik untuk merawat diri, atau tumbuhkan kebiasaan baru.',
      cta: 'add-habit',
      visual: { kind: 'plain' },
    }
  }

  /* 8 — Selamat datang: belum ada kebiasaan aktif sama sekali. */
  return {
    key: 'welcome',
    module: 'kebiasaan',
    title: 'Selamat datang di Rutina',
    text: 'Mulai dengan satu kebiasaan kecil — tanaman pertamamu menunggu ditanam.',
    cta: 'add-habit',
    visual: { kind: 'plain' },
  }
}
