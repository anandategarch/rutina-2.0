'use client'

import * as m from 'motion/react-m'
import { useReducedMotion } from 'motion/react'

import { motionTokens } from '@/lib/motion/tokens'
import { pressSnappy } from '@/lib/motion/transitions'
import { useFirstVisit } from '@/lib/motion/first-visit'

import { EXPENSE, INCOME } from '../../finance/cats'
import { formatIDRShort, type PeriodPoint } from '../../finance/utils'
import { ChartLegend, ChartSrSummary } from '../shared/chart-frame'

/**
 * CashflowRiver — mode "Arus" pada FinChart (v2.47, Warm Editorial:
 * Ilustrasi Sungai Arus Kas).
 *
 * Dua pita horizontal mengalir kiri→kanan (kronologis): pita MASUK
 * (success, 75% opasitas) tumbuh ke atas dari garis tengah, pita KELUAR
 * (destructive, 75%) ke bawah. KETEBALAN pita sebanding nilai — kedua
 * pita berbagi SATU skala bersama (maksimum seluruh masuk & keluar
 * deret) sehingga tebal dapat dibandingkan antar arus maupun antar
 * periode. Hairline putus-putus di garis tengah = tempat kedua pita
 * bertemu (batas net) — arah aliran cukup tersirat, tanpa animasi
 * berulang (data dulu, kebijakan gerak v2.37).
 *
 * Kejujuran data: pita bernilai 0 tetap digambar sebagai hairline;
 * transfer tidak pernah masuk deret (sudah difilter di buildSeries).
 * Gerbang anti-replay 'fin-river': pita terungkup kiri→kanan sekali
 * pada kunjungan pertama; kunjungan ulang mode langsung tampil utuh.
 */

const TRACK_H = 118 // ruang pita (px) — selaras FinChart
const LABEL_H = 24 // baris label kolom di bawah pita
const COL_MIN_W = 32 // lebar kolom minimum (px) — pola FinChart
const BAND_OPACITY = 0.75
const VB_MIN_W = 320

/** Titik sampel kurva (koordinat viewBox). */
interface Pt {
  x: number
  y: number
}

/** Bulatkan ke 1 desimal — cukup halus untuk kurva mulus, path ringkas. */
const r1 = (n: number) => Math.round(n * 10) / 10

/** Ruas kurva Catmull-Rom→Bezier yang berangkat di pts[0] (TANPA
 *  perintah M): "x0 y0 C … xN yN" — pemanggil menyusun M/L/Z pita. */
function smoothFrom(pts: Pt[]): string {
  let d = `${r1(pts[0].x)} ${r1(pts[0].y)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${r1(c1x)} ${r1(c1y)} ${r1(c2x)} ${r1(c2y)} ${r1(p2.x)} ${r1(p2.y)}`
  }
  return d
}

/** Label sumbu-x melangkah pada deret panjang — ambang sama dengan
 *  FinChart (informasi lengkap tetap tersedia via aria-label kolom). */
function labelEvery(count: number): number {
  if (count > 24) return 3
  if (count > 12) return 2
  return 1
}

export function CashflowRiver({
  points,
  active,
  onPick,
}: {
  points: PeriodPoint[]
  active: number
  onPick: (i: number) => void
}) {
  const first = useFirstVisit('fin-river')
  const reduced = useReducedMotion()

  const n = points.length
  const totalIn = points.reduce((a, p) => a + p.masuk, 0)
  const totalOut = points.reduce((a, p) => a + p.keluar, 0)
  const every = labelEvery(n)

  /* Ember periode selalu ada (buildSeries), tetap dijaga agar aman. */
  if (n === 0) return null

  /* SATU skala bersama — maksimum seluruh nilai masuk & keluar deret;
     tebal pita = nilai / skala × setengah ruang lagu (pola net FinChart). */
  const maxScale = Math.max(1, ...points.map((p) => Math.max(p.masuk, p.keluar)))
  const half = (TRACK_H - 14) / 2
  /* Nilai 0 → hairline: pita tetap tergambar (kosong terbaca jujur). */
  const thickness = (v: number) =>
    v <= 0 ? 0.75 : Math.max(1.5, (v / maxScale) * half)

  const vbW = Math.max(n * COL_MIN_W, VB_MIN_W)
  const midY = TRACK_H / 2
  const colX = (i: number) => ((i + 0.5) / n) * vbW

  /* Tepi pita: kurva mulus melalui sampel kolom, diperpanjang datar
     sampai tepi kiri-kanan agar "sungai" mengalir memenuhi lebar. */
  const topPts: Pt[] = [
    { x: 0, y: midY - thickness(points[0].masuk) },
    ...points.map((p, i) => ({ x: colX(i), y: midY - thickness(p.masuk) })),
    { x: vbW, y: midY - thickness(points[n - 1].masuk) },
  ]
  const botPts: Pt[] = [
    { x: 0, y: midY + thickness(points[0].keluar) },
    ...points.map((p, i) => ({ x: colX(i), y: midY + thickness(p.keluar) })),
    { x: vbW, y: midY + thickness(points[n - 1].keluar) },
  ]
  const masukBand = `M 0 ${midY} L ${smoothFrom(topPts)} L ${vbW} ${midY} Z`
  const keluarBand = `M 0 ${midY} L ${smoothFrom(botPts)} L ${vbW} ${midY} Z`
  const masukEdge = `M ${smoothFrom(topPts)}`
  const keluarEdge = `M ${smoothFrom(botPts)}`

  const pt = points[Math.min(active, n - 1)]
  const net = pt.masuk - pt.keluar

  return (
    <div
      className="relative select-none"
      role="group"
      aria-label="Grafik arus kas bergaya sungai — masuk dan keluar per periode"
    >
      <ChartSrSummary>
        Ringkasan arus kas deret ini: total masuk{' '}
        {totalIn.toLocaleString('id-ID')}, total keluar{' '}
        {totalOut.toLocaleString('id-ID')}, selisih{' '}
        {(totalIn - totalOut).toLocaleString('id-ID')} rupiah. Ketebalan pita
        sebanding nilai; rincian per periode tersedia pada tiap kolom
        berikut.
      </ChartSrSummary>

      <ChartLegend
        label="Legenda pita arus kas"
        className="mb-1.5 justify-start"
        items={[
          { color: INCOME, label: 'masuk', rawColor: true },
          { color: EXPENSE, label: 'keluar', rawColor: true },
        ]}
      />

      {/* Wadah geser — deret panjang (periode "Semua") melebar mengikuti
          jumlah kolom; ponsel menggeser horizontal (pola FinChart). */}
      <div className="overflow-x-auto no-scrollbar overscroll-x-contain">
        <div
          className="relative"
          style={{
            minWidth: `max(100%, ${n * COL_MIN_W}px)`,
            height: TRACK_H + LABEL_H,
          }}
        >
          {/* Pita sungai — terungkup kiri→kanan sekali (anti-replay);
              preserveAspectRatio none: hanya sumbu-x yang meregang. */}
          <m.svg
            viewBox={`0 0 ${vbW} ${TRACK_H}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            className="absolute inset-x-0 top-0 block w-full"
            style={{ height: TRACK_H }}
            initial={
              first && !reduced ? { clipPath: 'inset(0 100% 0 0)' } : false
            }
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={motionTokens.preset.dataSlow}
          >
            {/* Pita masuk — mengalir di atas garis tengah */}
            <path d={masukBand} fill={INCOME} fillOpacity={BAND_OPACITY} />
            <path
              d={masukEdge}
              fill="none"
              stroke={INCOME}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            {/* Pita keluar — mengalir di bawah garis tengah */}
            <path d={keluarBand} fill={EXPENSE} fillOpacity={BAND_OPACITY} />
            <path
              d={keluarEdge}
              fill="none"
              stroke={EXPENSE}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            {/* Garis pertemuan (net) — hairline putus-putus */}
            <line
              x1={0}
              y1={midY}
              x2={vbW}
              y2={midY}
              stroke="var(--border-strong)"
              strokeWidth={1}
              strokeDasharray="1.5 4"
              strokeLinecap="round"
            />
          </m.svg>

          {/* Lapis tombol per kolom — pola FinChart: sorotan kolom aktif
              meluncur (layoutId), kolom lain diredupkan namun dapat ditekan. */}
          <div className="absolute inset-0 flex items-stretch justify-between gap-1">
            {points.map((p, i) => {
              const isOn = i === active
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onPick(i)}
                  aria-pressed={isOn}
                  aria-label={`${p.label}: masuk ${p.masuk.toLocaleString(
                    'id-ID',
                  )}, keluar ${p.keluar.toLocaleString('id-ID')}`}
                  className={`group relative flex min-w-[26px] flex-1 cursor-pointer flex-col items-center justify-end rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                    isOn
                      ? ''
                      : 'transition-colors duration-200 hover:bg-surface-sunken/70'
                  }`}
                >
                  {isOn && (
                    <m.span
                      aria-hidden="true"
                      layoutId="fin-river-active-col"
                      className="absolute inset-0 rounded-xl bg-primary/10"
                      transition={pressSnappy}
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-[24px] w-max items-center justify-center text-eyebrow font-semibold tracking-wide transition-colors duration-300 ${
                      isOn ? 'text-content-secondary' : 'text-content-muted'
                    }`}
                  >
                    {i % every === 0 ? p.label : ''}
                    {isOn && (
                      <m.span
                        aria-hidden="true"
                        layoutId="fin-river-underline"
                        className="absolute bottom-0 h-[3px] w-5 rounded-full bg-gold"
                        transition={pressSnappy}
                      />
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Garis dasar — tepi bawah area pita (pola FinChart) */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 border-t border-border-strong"
            style={{ bottom: LABEL_H - 2 }}
          />
        </div>
      </div>

      {/* Baris baca titik terpilih — nilai penuh mengikuti pilihan. */}
      <p
        aria-live="polite"
        className="mt-1 px-0.5 text-eyebrow font-medium tabular-nums text-content-muted"
      >
        {pt.label}: masuk {formatIDRShort(pt.masuk)}, keluar{' '}
        {formatIDRShort(pt.keluar)}, net{' '}
        {net > 0
          ? `+${formatIDRShort(net)}`
          : net < 0
            ? formatIDRShort(net)
            : '0'}
      </p>
    </div>
  )
}
