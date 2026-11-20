/* ============================================================
   Perhatian Beranda — SATU derivasi data pusat (audit v2.37).

   Agenda prioritas, kartu pemulihan "Jangan Bolong Dua Kali",
   dan Sorotan Hari Ini semuanya membaca dari hasil fungsi ini —
   mengakhiri tiga jalur yang masing-masing menghitung kandidat
   sendiri tanpa deduplikasi (aturan: satu habit.id = satu baris
   aksi di Beranda).

   Murni tanpa React & efek samping — aman SSR & pengujian.
   ============================================================ */

import { missedYesterday } from './habit-coach'
import {
  habitStreak,
  habitsOn,
  isDoneOn,
  scheduledOn,
  type Completions,
  type Habit,
} from './store'
import { STREAK_RISK_MIN } from './daily-highlight'

/** Maksimal tugas prioritas yang tampil di Agenda Beranda. */
export const HOME_AGENDA_LIMIT = 4
/** Maksimal kartu pemulihan "Jangan Bolong Dua Kali". */
export const HOME_RECOVERY_LIMIT = 2

export interface HomeAttentionItem {
  habit: Habit
  /** Runtun aktif per tanggal yang dilihat. */
  streak: number
  /** Terlewat kemarin & terjadwal hari ini — badge di baris Agenda
   *  (kartu pemulihan terpisah DILARANG untuk kasus ini). */
  missedYesterday: boolean
  /** Runtun ≥ ambang & belum selesai — berisiko putus hari ini. */
  streakRisk: boolean
}

export interface HomeAttention {
  /** SEMUA tugas tertunda terjadwal tanggal lihat — sudah terurut
   *  prioritas; konsumen memangkas sendiri (slice) sesuai konteks. */
  items: HomeAttentionItem[]
  /** Terlewat kemarin, TIDAK terjadwal hari ini, belum selesai hari
   *  ini — kandidat kartu pemulihan, maksimal HOME_RECOVERY_LIMIT. */
  recovery: Habit[]
  /** Semua habit.id yang sudah punya baris aksi di Beranda (agenda
   *  penuh + pemulihan) — dipakai Sorotan agar tidak pernah membuat
   *  tombol centang kedua untuk kebiasaan yang sama. */
  actionIds: Set<string>
}

/** Bandingkan jam pengingat — tanpa pengingat selalu terakhir. */
function byReminder(a: Habit, b: Habit): number {
  const ra = a.reminder ?? '99:99'
  const rb = b.reminder ?? '99:99'
  return ra === rb ? a.title.localeCompare(b.title) : ra < rb ? -1 : 1
}

/**
 * Derivasi pusat perhatian Beranda untuk `viewDate` (tanggal kalender
 * yang sedang dilihat; "kemarin" selalu relatif terhadap `today`).
 *
 * Prioritas Agenda (saat melihat hari ini):
 *   1. Runtun berisiko (≥ STREAK_RISK_MIN, belum selesai) — terpanjang dulu.
 *   2. Terlewat kemarin & terjadwal hari ini.
 *   3. Jam pengingat terdekat (pagi → malam).
 *   4. Tanpa pengingat.
 * Saat melihat tanggal lain: cukup urutan jam pengingat (histori murni).
 */
export function homeAttention(
  habits: Habit[],
  completions: Completions,
  today: string,
  viewDate: string,
): HomeAttention {
  const scheduled = habitsOn(habits, viewDate)
  const pending = scheduled.filter((h) => !isDoneOn(completions, viewDate, h.id))
  const viewingToday = viewDate === today

  /* Badge "terlewat kemarin" hanya bermakna saat melihat hari ini —
     melihat tanggal lampau adalah histori, bukan ajakan aksi. */
  const missedSet = new Set(
    viewingToday ? missedYesterday(habits, completions, today).map((h) => h.id) : [],
  )

  const scored: HomeAttentionItem[] = pending.map((h) => {
    const streak = habitStreak(h, completions, viewDate)
    return {
      habit: h,
      streak,
      missedYesterday: missedSet.has(h.id),
      streakRisk: viewingToday && !isDoneOn(completions, viewDate, h.id) && streak >= STREAK_RISK_MIN,
    }
  })

  const sorted = viewingToday
    ? [...scored].sort((a, b) => {
        /* 1 — runtun berisiko dulu (terpanjang menang). */
        if (a.streakRisk !== b.streakRisk) return a.streakRisk ? -1 : 1
        /* 2 — terlewat kemarin & terjadwal hari ini. */
        if (a.missedYesterday !== b.missedYesterday) return a.missedYesterday ? -1 : 1
        /* 3/4 — jam pengingat terdekat, tanpa pengingat terakhir. */
        return byReminder(a.habit, b.habit)
      })
    : [...scored].sort((a, b) => byReminder(a.habit, b.habit))

  /* Pemulihan: terlewat kemarin, TIDAK terjadwal hari ini, dan belum
     diselesaikan hari ini — hanya inilah yang boleh menjadi kartu
     pemulihan terpisah (yang terjadwal hari ini sudah punya baris
     Agenda + badge, tidak boleh dobel). */
  const recovery = viewingToday
    ? missedYesterday(habits, completions, today)
        .filter(
          (h) =>
            !scheduledOn(h, today) && !isDoneOn(completions, today, h.id),
        )
        .sort((a, b) => byReminder(a, b))
        .slice(0, HOME_RECOVERY_LIMIT)
    : []

  const actionIds = new Set<string>([...pending.map((h) => h.id), ...recovery.map((h) => h.id)])

  return {
    items: sorted,
    recovery,
    actionIds,
  }
}
