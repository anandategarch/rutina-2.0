'use client'

import * as m from 'motion/react-m'

import { barFill } from '@/lib/motion/transitions'
import { formatIDRShort } from '../../finance/utils'

/**
 * BudgetRunway — landasan pacu laju anggaran bulanan (v2.47, Warm
 * Editorial: ilustrasi data keuangan). Mengganti batang laju tunggal
 * pada panel "Laju vs waktu bulan" tab Anggaran.
 *
 * Kejujuran data (audit K1): skala landasan membentang 0% →
 * maks(100%, persentase aktual dibulatkan KE ATAS ke kelipatan 25%)
 * sehingga penanda koin AKTUAL tidak pernah di-clamp — laju 130%
 * harus terbaca 130%. Hanya ISIAN bar yang di-clamp pada gerbang
 * 100%. Zona di balik gerbang diberi tint clay; koin yang masuk zona
 * itu = melewati batas, terlihat di posisinya yang sebenarnya.
 *
 * Penanda: gerbang "100% batas" (tiang + bendera label) = jumlah
 * anggaran; wajik "waktu bulan" = laju ideal hari ke-N (selaras
 * graduasi hari di dasar landasan); koin Rp (gold) = pemakaian
 * aktual. Vonis & salinan tiga varian dipertahankan persis.
 */

/** Bentuk memo laju dari layar Keuangan (lihat pace di keuangan.tsx). */
export interface BudgetRunwayPace {
  elapsed: number
  dim: number
  idealPct: number
  daysLeft: number
  remainingTotal: number
  daily: number
  diff: number
}

export function BudgetRunway({
  pace,
  totalPct,
  rawTotalPct,
  playEntrance,
}: {
  pace: BudgetRunwayPace
  /** Persentase terpakai versi clamp (≤100) — HANYA lebar isian. */
  totalPct: number
  /** Persentase terpakai TANPA clamp — posisi koin, label, aria. */
  rawTotalPct: number
  /** Gerbang anti-replay pemanggil (kunci 'keuangan-anggaran-total'). */
  playEntrance: boolean
}) {
  /* Skala landasan — dibulatkan ke atas ke 25% berikutnya. */
  const scaleMax = Math.max(100, Math.ceil(rawTotalPct / 25) * 25)
  const pctOf = (v: number) => (Math.min(v, scaleMax) / scaleMax) * 100
  const gateLeft = pctOf(100)
  const idealLeft = pctOf(Math.min(pace.idealPct, 100))
  const coinLeft = pctOf(rawTotalPct)
  const beyond = scaleMax > 100
  /* Label ideal disembunyikan bila menabrak label gerbang (angka tetap
     utuh di baris ringkasan & aria-label). v2.47.1: 13 → 22 — label
     "100% batas" panjang; pada ideal ≥78% keduanya bertabrakan di kartu
     320–390px. */
  const showIdealLabel = gateLeft - idealLeft > 22

  /* Salinan vonis — TIDAK berubah dari versi batang tunggal (K12). */
  const verdict =
    pace.diff > 10
      ? `Lebih cepat ${pace.diff}% dari laju ideal — kecilkan porsi pekan sisa agar batas tak jebol.`
      : pace.diff < -10
        ? `Lebih hemat ${Math.abs(pace.diff)}% dari laju ideal — aman melaju di bawah waktu bulan.`
        : 'Selaras laju waktu bulan — pengeluaran mengikuti hari yang berjalan.'

  return (
    <div className="mt-3 rounded-xl bg-surface-sunken px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
          Laju vs waktu bulan
        </p>
        <p className="text-eyebrow font-medium tabular-nums text-content-muted">
          hari ke-{pace.elapsed} dari {pace.dim}
        </p>
      </div>

      {/* Landasan pacu — ringkasan nonvisual memuat seluruh angka. */}
      <div
        className="relative mt-2.5"
        role="img"
        aria-label={`Laju anggaran bulan ini: aktual ${rawTotalPct}% vs ideal ${pace.idealPct}% pada hari ke-${pace.elapsed} — ${verdict}`}
      >
        <div className="relative">
          {/* Baris koin — koin "Rp" berdiri di atas landasan; posisi
              TANPA clamp (bisa masuk zona clay di balik gerbang). */}
          <div className="relative h-[18px]">
            <m.div
              aria-hidden="true"
              initial={playEntrance ? { left: '0%' } : false}
              animate={{ left: `${coinLeft}%` }}
              transition={barFill}
              className="absolute bottom-0 z-10 flex h-[18px] w-[18px] -translate-x-1/2 items-center justify-center rounded-full border-[1.5px] border-espresso/40 bg-gold"
            >
              <span className="text-[8px] font-bold leading-none text-espresso">
                Rp
              </span>
            </m.div>
          </div>

          {/* Landasan + isian — isian di-clamp di gerbang (penanda koin
              tidak); warna mengikuti ambang vonis ±10 (K12). */}
          <div className="relative h-2.5 rounded-full bg-border">
            {beyond && (
              <span
                aria-hidden="true"
                className="absolute inset-y-0 right-0 rounded-r-full bg-clay/20"
                style={{ left: `${gateLeft}%` }}
              />
            )}
            <m.div
              aria-hidden="true"
              initial={playEntrance ? { scaleX: 0 } : false}
              animate={{ scaleX: pctOf(Math.min(100, totalPct)) / 100 }}
              transition={barFill}
              className={
                'h-full origin-left rounded-full ' +
                (pace.diff > 10 ? 'bg-destructive' : 'bg-primary')
              }
              style={{ width: '100%' }}
            />
            {/* Penanda ideal — wajik "waktu bulan" di atas landasan */}
            <span
              aria-hidden="true"
              className="absolute top-1/2 z-[5] h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[1px] bg-content-primary/70"
              style={{ left: `${idealLeft}%` }}
            />
          </div>

          {/* Graduasi hari — tiap hari 1 garis, tiap 5 hari lebih tinggi;
              hari ke-N jatuh tepat pada posisi wajik ideal. */}
          <div aria-hidden="true" className="relative mt-1 h-1.5">
            {Array.from({ length: pace.dim }, (_, d) => {
              const day = d + 1
              const major = day % 5 === 0
              return (
                <span
                  key={day}
                  className={`absolute bottom-0 w-px ${
                    major ? 'h-1.5 bg-border-strong' : 'h-1 bg-border-strong/50'
                  }`}
                  style={{ left: `${(day / pace.dim) * gateLeft}%` }}
                />
              )
            })}
          </div>

          {/* Tiang gerbang 100% — menembus landasan dari atas koin
              sampai dasar graduasi. */}
          <span
            aria-hidden="true"
            className="absolute w-[2px] -translate-x-1/2 rounded-full bg-content-secondary/60"
            style={{ left: `${gateLeft}%`, top: 2, bottom: 0 }}
          />
        </div>

        {/* Label penanda — "100% batas" & "ideal N%" */}
        <div aria-hidden="true" className="relative mt-1 h-4">
          <span
            className={`absolute top-0 whitespace-nowrap text-eyebrow font-semibold uppercase tracking-[0.1em] text-content-secondary ${
              beyond ? '-translate-x-1/2' : '-translate-x-full'
            }`}
            style={{ left: `${gateLeft}%` }}
          >
            100% batas
          </span>
          {showIdealLabel && (
            <span
              className={`absolute top-0 whitespace-nowrap text-eyebrow text-content-muted ${
                idealLeft < 10 ? '' : '-translate-x-1/2'
              }`}
              style={{ left: `${idealLeft}%` }}
            >
              ideal {pace.idealPct}%
            </span>
          )}
        </div>
      </div>

      {/* Baris angka — aktual (tebal) · ideal & hari · sisa. */}
      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-eyebrow tabular-nums">
        <span className="font-semibold text-content-secondary">
          Aktual {rawTotalPct}%
        </span>
        <span className="text-content-muted">
          Ideal {pace.idealPct}% · hari ke-{pace.elapsed} dari {pace.dim}
        </span>
        <span className="text-content-muted">
          sisa {formatIDRShort(pace.remainingTotal)}
        </span>
      </div>

      <p
        className={`mt-1.5 text-eyebrow leading-snug ${
          pace.diff > 10
            ? 'font-semibold text-content-danger'
            : pace.diff < -10
              ? 'font-semibold text-success'
              : 'text-content-secondary'
        }`}
      >
        {verdict}{' '}
        <span className="text-content-muted">
          Jatah aman total ±{formatIDRShort(pace.daily)}/hari ·{' '}
          {pace.daysLeft} hari tersisa.
        </span>
      </p>
    </div>
  )
}
