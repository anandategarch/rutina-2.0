'use client'

import * as m from 'motion/react-m'
import { ArrowUpRight, Bell, Minimize2, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'

import { DailyHighlightCard } from './daily-highlight-card'
import { pickDailyHighlight } from './daily-highlight'
import { goldilocksGroups } from './habit-coach'
import { RutinaSectionHeader } from './rutina-section-header'
import {
  habitsOn,
  todayISO,
  useRutina,
  type Habit,
} from './store'

/* ===== Untuk Hari Ini — SATU area rekomendasi kontekstual (v2.56) =====

   Audit Tahap 2 (pengurangan utang visual): kolom samping agenda dulu
   menumpuk TIGA blok yang bisa tampil BERSAMAAN — Sorotan Hari Ini,
   kartu pemulihan "Jangan Bolong Dua Kali", dan deretan kartu Saran
   Coach — tiga suara berebut perhatian di satu layar pertama.

   Kini SATU keputusan prioritas memilih SATU rekomendasi:

     1. PEMULIHAN — kebiasaan terlewat kemarin yang TIDAK terjadwal
        hari ini (satu-satunya tempat kebiasaan ini bisa dicentang
        hari ini; yang terjadwal sudah punya baris Agenda berbadge).
     2. SOROTAN MENDESAK/AKSI — sorotan lintas modul yang TIDAK
        digambarkan di mana pun di Beranda (anggaran, latihan basi,
        tujuan tabungan hampir tercapai, runtun berisiko). Kunci
        'nearly-done'/'bonus' sengaja TIDAK masuk prioritas — keduanya
        sudah terwakili hero persen & seksi Bonus harian (dan sejak
        v2.95 sorotan 'bonus' sepenuhnya dipensiunkan dari rantai).
     3. PRATINJAU COACH — satu inti saran Goldilocks (judul + pesan
        agregat) + pintu ke ruang Kebiasaan; detail lengkap tetap
        hidup di layar Kebiasaan (aturan: Beranda hanya pratampil).
     4. SOROTAN NETRAL — pengisi tenang (hari sempurna / jeda /
        selamat datang) bila tak ada yang lebih penting.

   Semua panel FLAT editorial: satu permukaan tingkat-panel, tanpa
   kartu-di-dalam-kartu, tanpa bayangan. */

/** Kunci sorotan yang layak mengalahkan pratinjau coach — aksi lintas
 *  modul yang tidak digambarkan bagian lain Beranda. */
const HL_PRIORITY_KEYS = new Set([
  'streak-risk',
  'budget-warning',
  'workout-stale',
  'goal-near',
])

export function ForTodaySection({
  recovery,
  excludeHabitIds,
}: {
  /** Kandidat pemulihan "Jangan Bolong Dua Kali" — dari derivasi
   *  homeAttention (maks 2, sudah disaring "tidak terjadwal hari ini"). */
  recovery: Habit[]
  /** habit.id yang sudah punya baris aksi di Agenda/pemulihan —
   *  diteruskan ke Sorotan agar tak pernah ada tombol centang kedua. */
  excludeHabitIds: Set<string>
}) {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  const txs = useRutina((s) => s.txs)
  const budgets = useRutina((s) => s.budgets)
  const goals = useRutina((s) => s.goals)
  const workouts = useRutina((s) => s.workouts)
  const toggleHabit = useRutina((s) => s.toggleHabit)
  const setScreen = useRutina((s) => s.setScreen)

  const playEntrance = useFirstVisit('home-untuk-hari-ini')
  const today = todayISO()

  /* Kunci sorotan saat ini — fungsi pemilih murni yang sama dengan
     kartu Sorotan (deterministik; kartu menghitung ulang tipis di
     dalam rendernya sendiri). v2.95: sorotan 'bonus' dipensiunkan —
     klaim bonus hanya lewat seksi "Bonus harian" Beranda. */
  const hlKey = pickDailyHighlight({
    today,
    habits,
    completions,
    txs,
    budgets,
    goals,
    workouts,
    excludeHabitIds,
  }).key

  /* Saran coach Goldilocks — SATU inti saran untuk pratinjau; detail
     lengkap tetap di Kebiasaan. */
  const coach = goldilocksGroups(habitsOn(habits, today), completions, today)

  const mode: 'recovery' | 'highlight' | 'coach' =
    recovery.length > 0
      ? 'recovery'
      : HL_PRIORITY_KEYS.has(hlKey)
        ? 'highlight'
        : coach.length > 0
          ? 'coach'
          : 'highlight'

  return (
    <section aria-label="Untuk hari ini" className="h-full">
      <RutinaSectionHeader
        title="Untuk Hari Ini"
        description="satu rekomendasi teratas — sisanya di ruangnya"
      />
      <div className="mt-3">
        {mode === 'recovery' ? (
          <m.div
            initial={playEntrance ? { opacity: 0, y: 14 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={motionTokens.preset.data}
          >
            <div className="rounded-lg border border-gold/40 bg-gold/12 p-4">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/30 text-warning"
                >
                  <Bell className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-body font-semibold text-content-primary">
                    Jangan bolong dua kali
                  </h3>
                  <p className="mt-0.5 text-pretty text-meta leading-relaxed text-content-muted">
                    Terlewat kemarin tak apa — selesaikan hari ini supaya
                    tidak bolong dua kali berturut-turut.
                  </p>
                </div>
              </div>
              {/* Baris kebiasaan FLAT — pembatas hairline, tanpa kotak
                  bersarang (audit Tahap 2: kartu-di-dalam-kartu). */}
              <div className="mt-3 divide-y divide-gold/20">
                {recovery.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 py-2 first:pt-0.5 last:pb-0"
                  >
                    <span className="min-w-0 flex-1 truncate text-note font-semibold text-content-primary">
                      {h.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        /* Jangan janjikan streak — hari jadwal yang
                           terlewat kemarin sudah putus; menyelesaikannya
                           hari ini memulai runtun baru besok. */
                        toggleHabit(h.id, today)
                        toast.success(`"${h.title}" tercatat untuk hari ini.`)
                      }}
                      className="h-9 shrink-0 cursor-pointer rounded-full bg-primary px-3.5 text-eyebrow font-semibold text-primary-foreground transition-all hover:bg-action-hover active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      Selesaikan
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </m.div>
        ) : mode === 'coach' ? (
          <m.div
            initial={playEntrance ? { opacity: 0, y: 14 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={motionTokens.preset.data}
          >
            <div className="rounded-lg border border-border bg-surface-primary p-4">
              {(() => {
                const group = coach[0]
                const naik = group.tone === 'naik'
                const Icon = naik ? TrendingUp : Minimize2
                return (
                  <>
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className={
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full ' +
                          (naik
                            ? 'bg-secondary text-success'
                            : 'bg-gold/25 text-warning')
                        }
                      >
                        <Icon className="h-4 w-4" strokeWidth={2.2} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-content-muted">
                          Saran Coach
                        </p>
                        <h3 className="mt-0.5 text-body font-semibold text-content-primary">
                          {group.title}
                        </h3>
                        <p className="mt-0.5 text-pretty text-meta leading-relaxed text-content-muted">
                          {group.text}
                        </p>
                        {coach.length > 1 && (
                          <p className="mt-1 text-eyebrow font-medium text-content-muted">
                            +{coach.length - 1} saran lain menunggu di Kebiasaan
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setScreen('kebiasaan')}
                      className="mt-3 h-10 rounded-full border-border px-4 text-meta font-bold text-content-secondary hover:bg-surface-sunken hover:text-content-primary"
                    >
                      Buka saran lengkap
                      <ArrowUpRight
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                        strokeWidth={2.2}
                      />
                    </Button>
                  </>
                )
              })()}
            </div>
          </m.div>
        ) : (
          /* Sorotan (mendesa/aksi lintas modul, atau netral sebagai
             pengisi tenang) — kartu Sorotan yang sama, kini satu-satunya
             penghuni kolom saat terpilih. */
          <DailyHighlightCard excludeHabitIds={excludeHabitIds} />
        )}
      </div>
    </section>
  )
}
