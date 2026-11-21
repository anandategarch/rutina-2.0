'use client'

import { useId, useMemo, useState } from 'react'
import * as m from 'motion/react-m'
import {
  BatteryCharging,
  ClipboardList,
  Droplets,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Scale,
  Sparkles,
  Target,
} from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { motionTokens } from '@/lib/motion/tokens'
import { barFill } from '@/lib/motion/transitions'
import { useCheckInSheet } from '../checkin-sheet'
import {
  addDaysISO,
  FIT_TARGETS_DEFAULT,
  todayISO,
  useRutina,
  type BodyLogs,
} from '../store'
import {
  bodyCoverage,
  bodySeries,
  latestWeight,
  readinessOf,
  weightSeries,
} from './fit-utils'

/* ===== Konstanta tubuh ===== */

/** Target gelas air per hari (~2 liter). */
const WATER_TARGET = 8

const ENERGY_OPTIONS: { v: number; label: string }[] = [
  { v: 1, label: 'Lelah banget' },
  { v: 2, label: 'Lelah' },
  { v: 3, label: 'Biasa' },
  { v: 4, label: 'Segar' },
  { v: 5, label: 'Bugar' },
]

/** ===== Tren berat badan — sparkline yang jujur terhadap skalanya =====
 *  Audit visualisasi v2.12: angka terakhir menonjol, perubahan dihitung
 *  terhadap catatan pertama rentang, tanggal awal–akhir ditampilkan, dan
 *  label rentang nilai menjelaskan dramatisme skala. 2 catatan = perbandingan
 *  angka (dua titik belum meyakinkan sebagai "tren"); warna netral —
 *  naik/turun berat belum tentu baik/buruk tanpa konteks target.
 *
 *  v2.45 (review Tahap 2 — F3/F4): jendela waktu **30/90/365 hari**
 *  (ekstrem & perubahan total mengikuti jendela aktif) + **garis tujuan
 *  berat** putus-putus dari sasaran bugar — "apakah jarakku menutup?"
 *  tanpa prediksi tanggal. */
const WEIGHT_WINDOWS: readonly ['30' | '90' | '365', string][] = [
  ['30', '30 hari'],
  ['90', '90 hari'],
  ['365', '1 tahun'],
]

function WeightSpark({ logs, weightGoal }: { logs: BodyLogs; weightGoal: number }) {
  const [win, setWin] = useState<'30' | '90' | '365'>('90')
  const today = todayISO()
  /* Deret jendela aktif — dipotong tanggal, bukan jumlah catatan. */
  const series = useMemo(() => {
    const cutoff = addDaysISO(today, -(Number(win) - 1))
    return weightSeries(logs).filter((s) => s.date >= cutoff)
  }, [logs, win, today])
  const totalRecords = useMemo(() => weightSeries(logs).length, [logs])
  /* Id gradient isian — dibersihkan dari “:” useId agar aman dipakai
     sebagai fragmen url(#…) SVG di semua browser. Dipanggil di puncak
     komponen (sebelum return awal) demi aturan urutan hook. */
  const fillId = `tubuh-weight-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  const fmtKg = (n: number) => n.toFixed(1).replace('.', ',')
  const dateShort = (iso: string) =>
    new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
    }).format(new Date(iso + 'T00:00:00'))

  if (series.length < 2) {
    return (
      <div>
        {/* v2.45: pemilih jendela tetap tampil — pengguna paham kenapa
            kosong dan bisa memperlebar rentangnya. */}
        <WeightWindowPicker win={win} setWin={setWin} />
        <p className="mt-2 text-meta font-medium text-content-muted">
          {totalRecords < 2
            ? 'Catat berat minimal dua kali untuk melihat tren.'
            : `Belum ada cukup catatan dalam ${win === '365' ? 'setahun' : `${win} hari`} terakhir — perlebar jendela di atas.`}
        </p>
      </div>
    )
  }

  const first = series[0]
  const last = series[series.length - 1]
  const delta = last.kg - first.kg
  const deltaText =
    delta === 0
      ? 'berat stabil'
      : delta < 0
        ? `turun ${fmtKg(Math.abs(delta))} kg`
        : `naik ${fmtKg(delta)} kg`

  /* Dua catatan — perbandingan angka saja, tanpa klaim tren. */
  if (series.length === 2) {
    return (
      <div>
        <WeightWindowPicker win={win} setWin={setWin} />
        <p className="mt-2 flex items-baseline gap-2">
          <span className="text-kpi-sm font-semibold leading-none tabular-nums text-content-primary">
            {fmtKg(last.kg)} kg
          </span>
          <span className="text-eyebrow font-medium text-content-muted">
            {dateShort(first.date)} → {dateShort(last.date)} · {deltaText}
          </span>
        </p>
        <p className="mt-1 text-eyebrow font-medium text-content-muted">
          Butuh catatan ketiga sebelum garis tren digambar.
        </p>
      </div>
    )
  }

  const kgs = series.map((s) => s.kg)
  /* v2.45 (F4): garis tujuan ikut menentukan skala — jarak menuju
     sasaran terbaca JUJUR di grafik (pola target-line asupan). */
  const hasGoal = weightGoal > 0
  const min = hasGoal ? Math.min(...kgs, weightGoal) : Math.min(...kgs)
  const max = hasGoal ? Math.max(...kgs, weightGoal) : Math.max(...kgs)
  const span = Math.max(max - min, 0.5)
  const W = 260
  const H = 56
  const pts = series.map((s, i) => {
    const x = (i / (series.length - 1)) * (W - 8) + 4
    const y = H - 6 - ((s.kg - min) / span) * (H - 14)
    return { x, y }
  })
  const goalY = hasGoal ? H - 6 - ((weightGoal - min) / span) * (H - 14) : null
  const path = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  /* Isian lembut di bawah garis (audit Tahap 2): gradasi vertikal dari
     chart-stroke-1 pekat 20% menjadi transparan — garis tetap tegas
     (stroke token chart-stroke), area hanya nuansa. */
  const baseY = H - 6
  const area = `M ${pts[0]!.x.toFixed(1)},${baseY} L ${path.replaceAll(
    ' ',
    ' L ',
  )} L ${pts[pts.length - 1]!.x.toFixed(1)},${baseY} Z`

  return (
    <div>
      <WeightWindowPicker win={win} setWin={setWin} />
      {/* Baris nilai — terbaru menonjol + perubahan rentang + tanggal. */}
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-kpi-sm font-semibold leading-none tabular-nums text-content-primary">
          {fmtKg(last.kg)} kg
        </span>
        <span className="text-eyebrow font-medium text-content-secondary">
          {deltaText}
        </span>
        <span className="text-eyebrow font-medium tabular-nums text-content-muted">
          {dateShort(first.date)} – {dateShort(last.date)} · {series.length} catatan
        </span>
        {hasGoal && (
          <span className="text-eyebrow font-medium tabular-nums text-content-muted">
            · tujuan {fmtKg(weightGoal)} kg
          </span>
        )}
      </p>
      {/* Sparkline + label rentang nilai kiri (atas = terberat, bawah =
          teringan) — pembaca tahu seberapa lebar skala yang digambar. */}
      <div className="mt-2 flex items-stretch gap-1.5">
        <div
          className="flex w-9 shrink-0 flex-col justify-between py-0.5 text-chart-label font-semibold tabular-nums text-content-muted"
          aria-hidden="true"
        >
          <span className="text-right leading-none">{fmtKg(max)}</span>
          <span className="text-right leading-none">{fmtKg(min)}</span>
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-14 min-w-0 flex-1"
          role="img"
          aria-label={`Tren berat badan ${series.length} catatan dalam ${win === '365' ? 'setahun' : `${win} hari`}: dari ${fmtKg(first.kg)} kg menjadi ${fmtKg(last.kg)} kg, ${deltaText}. Rentang ${fmtKg(min)}–${fmtKg(max)} kg${hasGoal ? `, garis tujuan ${fmtKg(weightGoal)} kg` : ''}`}
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--chart-stroke-1)"
                stopOpacity="0.2"
              />
              <stop
                offset="100%"
                stopColor="var(--chart-stroke-1)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${fillId})`} />
          {/* v2.45 (F4): garis tujuan — putus-putus, di belakang deret. */}
          {hasGoal && goalY != null && (
            <g>
              <line
                x1="4"
                x2={W - 4}
                y1={goalY}
                y2={goalY}
                stroke="var(--chart-stroke-2, var(--primary))"
                strokeWidth="1.5"
                strokeDasharray="5 4"
                strokeLinecap="round"
              />
              <text
                x={W - 4}
                y={goalY - 3}
                textAnchor="end"
                className="fill-content-muted"
                style={{ fontSize: 8.5, fontWeight: 600 }}
              >
                tujuan {fmtKg(weightGoal)}
              </text>
            </g>
          )}
          <polyline
            points={path}
            fill="none"
            stroke="var(--chart-stroke-1)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === pts.length - 1 ? 4 : 2.5}
              fill={i === pts.length - 1 ? 'var(--chart-stroke-1)' : 'var(--secondary)'}
            />
          ))}
        </svg>
      </div>
    </div>
  )
}

/** Pemilih jendela tren berat (v2.45 — F3): 30/90/365 hari. */
function WeightWindowPicker({
  win,
  setWin,
}: {
  win: '30' | '90' | '365'
  setWin: (w: '30' | '90' | '365') => void
}) {
  return (
    <div
      role="group"
      aria-label="Rentang tren berat badan"
      className="flex gap-0.5 rounded-full border border-border bg-surface-sunken p-0.5"
    >
      {WEIGHT_WINDOWS.map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={win === id}
          onClick={() => setWin(id)}
          className={`interactive h-7 flex-1 cursor-pointer rounded-full px-2.5 text-chart-label font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            win === id
              ? 'bg-primary text-primary-foreground'
              : 'text-content-secondary hover:text-content-primary'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/* ===== Riwayat Tubuh 14 hari — small multiples (audit visualisasi
 *  v2.36, Tahap 2) =====
 *
 * Lima metrik pemulihan yang selama ini hanya dibaca sebagai angka
 * harian/rata-rata, kini terbaca sebagai PERKEMBANGAN (v2.47, edisi
 * ilustratif): tidur (kolom malam dengan bulan sabit + zona target
 * 7–8 jam), energi (glif baterai skala 1–5), nyeri otot (titik dengan
 * pita zona 1–2/3/4–5), stres (cincin dengan pita zona yang sama),
 * hidrasi (menara gelas vs target). Skala masing-masing berdiri
 * sendiri — jam, skor, dan gelas tidak pernah disatukan. Hari tanpa
 * catatan digambar netral (bukan nol): "tidak mencatat" ≠ "0 jam
 * tidur". */

/** Bulan sabit kecil — glif malam di puncak kolom tidur (dekoratif,
 *  path bulan standar; nilai tetap dibawa aria-label tombol harian). */
function MoonGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="var(--palette-gold)" />
    </svg>
  )
}

function BodyHistory({
  logs,
  waterTarget,
}: {
  logs: BodyLogs
  waterTarget: number
}) {
  const today = todayISO()
  const DAYS = 14

  const sleep = useMemo(
    () => bodySeries(logs, today, DAYS, (l) => l.sleepH),
    [logs, today],
  )
  const energy = useMemo(
    () => bodySeries(logs, today, DAYS, (l) => l.energy),
    [logs, today],
  )
  /* Nyeri & stres (v2.39 audit visual data): dua skala 1–5 yang selama
     ini hanya muncul sebagai komponen kesiapan hari ini — riwayatnya
     tercatat di check-in dan kini tergambar sebagai perkembangan. */
  const soreness = useMemo(
    () => bodySeries(logs, today, DAYS, (l) => l.soreness),
    [logs, today],
  )
  const stress = useMemo(
    () => bodySeries(logs, today, DAYS, (l) => l.stress),
    [logs, today],
  )
  /* Gelas 0 = belum ditrack (tak ada jalur mencatat "0 gelas"
     secara eksplisit) — jujur dibaca sebagai hari tanpa catatan. */
  const water = useMemo(
    () => bodySeries(logs, today, DAYS, (l) => (l.water > 0 ? l.water : undefined)),
    [logs, today],
  )

  const [sel, setSel] = useState<string | null>(null)
  const selSleep = sleep.find((p) => p.date === sel)
  const selEnergy = energy.find((p) => p.date === sel)
  const selWater = water.find((p) => p.date === sel)
  const selSoreness = soreness.find((p) => p.date === sel)
  const selStress = stress.find((p) => p.date === sel)

  const fmtJam = (n: number) => n.toFixed(1).replace('.', ',')
  const avgOf = (xs: { value: number | null }[]) => {
    const vals = xs.map((x) => x.value).filter((v): v is number => v != null)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  const avgSleep = avgOf(sleep)
  const avgEnergy = avgOf(energy)
  const avgWater = avgOf(water)
  const avgSoreness = avgOf(soreness)
  const avgStress = avgOf(stress)

  /* Skala negatif (5 = terburuk): warna titik jujur mengikuti nilai —
     rendah hijau, sedang kuning, tinggi merah; berbeda dari energi
     yang satu arah (makin tinggi makin baik, satu warna cukup).
     Nyeri = titik padat; stres = cincin (bentuk membedakan dua skala
     yang sama-sama 1–5). */
  const negTone = (v: number) =>
    v <= 2 ? 'bg-success' : v === 3 ? 'bg-warning' : 'bg-destructive'
  const negRing = (v: number) =>
    v <= 2 ? 'border-success' : v === 3 ? 'border-warning' : 'border-destructive'

  /* Skala tidur: minimal 8 jam agar zona target 7–8 selalu terlihat
     dan 8 jam tidak terlihat seperti "penuh". */
  const maxSleep = Math.max(8, ...sleep.map((p) => p.value ?? 0))
  const dateShort = (iso: string) =>
    new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(
      new Date(iso + 'T00:00:00'),
    )

  const nothingLogged =
    bodyCoverage(sleep) === 0 &&
    bodyCoverage(energy) === 0 &&
    bodyCoverage(water) === 0 &&
    bodyCoverage(soreness) === 0 &&
    bodyCoverage(stress) === 0

  return (
    <m.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...motionTokens.preset.chipReveal, delay: motionTokens.delay.tight }}
      aria-label="Riwayat tubuh 14 hari"
      className="mt-3 rounded-2xl border border-border bg-surface-primary p-5 shadow-soft"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-success">
          <Moon className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-body font-semibold text-content-primary">Riwayat Tubuh</p>
          <p className="text-meta font-medium text-content-muted">
            14 hari · ketuk hari untuk membaca detail
          </p>
        </div>
      </div>

      {nothingLogged ? (
        <p className="mt-3 text-meta font-medium leading-relaxed text-content-muted">
          Belum ada catatan — isi check-in harian (tidur, energi) dan
          gelas air, riwayatnya tergambar di sini.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {/* --- Tidur: batang + zona target 7–8 jam --- */}
          {bodyCoverage(sleep) > 0 && (
            <div>
              <div className="flex items-baseline justify-between px-0.5">
                <p className="text-eyebrow font-semibold uppercase tracking-[0.12em] text-content-muted">
                  Tidur · zona 7–8 jam
                </p>
                <p className="text-eyebrow font-semibold tabular-nums text-content-muted">
                  rerata {avgSleep != null ? `${fmtJam(avgSleep)} jam` : '–'} ·{' '}
                  {bodyCoverage(sleep)}/{DAYS} hari
                </p>
              </div>
              <div className="relative mt-2 flex h-16 gap-[3px]">
                {/* Zona target 7–8 jam — latar lembut di belakang batang
                    + bulan sabit kecil di tepi kanan zona (dekoratif). */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 rounded-md bg-primary/8"
                  style={{
                    bottom: `${(7 / maxSleep) * 100}%`,
                    height: `${(1 / maxSleep) * 100}%`,
                  }}
                >
                  <MoonGlyph className="absolute right-[-1px] top-1/2 h-2 w-2 -translate-y-1/2 opacity-70" />
                </div>
                {sleep.map((p) => (
                  <button
                    key={p.date}
                    type="button"
                    aria-pressed={sel === p.date}
                    aria-label={`${p.label} ${dateShort(p.date)} — ${
                      p.value != null ? `${fmtJam(p.value)} jam tidur` : 'tidak tercatat'
                    }`}
                    onClick={() => setSel(sel === p.date ? null : p.date)}
                    className="interactive group relative min-w-0 flex-1 cursor-pointer rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span className="flex h-full items-end justify-center">
                      {p.value != null ? (
                        <span
                          className="relative w-full rounded-[3px] bg-module-accent"
                          style={{ height: `${Math.max((p.value / maxSleep) * 100, 4)}%` }}
                        >
                          {/* Glif malam — mahkota bulan di puncak kolom. */}
                          <MoonGlyph className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2" />
                        </span>
                      ) : (
                        <span className="h-1.5 w-full rounded-full bg-surface-sunken shadow-[inset_0_0_0_1px_var(--border)]" />
                      )}
                    </span>
                    {sel === p.date && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-sm ring-2 ring-primary"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* --- Energi: glif baterai skala 1–5 (v2.47) --- */}
          {bodyCoverage(energy) > 0 && (
            <div>
              <div className="flex items-baseline justify-between px-0.5">
                <p className="text-eyebrow font-semibold uppercase tracking-[0.12em] text-content-muted">
                  Energi · skala 1–5
                </p>
                <p className="text-eyebrow font-semibold tabular-nums text-content-muted">
                  rerata {avgEnergy != null ? `${avgEnergy.toFixed(1).replace('.', ',')}/5` : '–'} ·{' '}
                  {bodyCoverage(energy)}/{DAYS} hari
                </p>
              </div>
              <div className="mt-2 flex h-16 gap-[3px]">
                {energy.map((p) => (
                  <button
                    key={p.date}
                    type="button"
                    aria-pressed={sel === p.date}
                    aria-label={`${p.label} ${dateShort(p.date)} — ${
                      p.value != null ? `energi ${p.value} dari 5` : 'tidak tercatat'
                    }`}
                    onClick={() => setSel(sel === p.date ? null : p.date)}
                    className="interactive relative min-w-0 flex-1 cursor-pointer rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {p.value != null ? (
                      /* Glif baterai — tinggi isi ∝ nilai/5; posisi tetap
                         di titik skala seperti titik lama. */
                      <span
                        aria-hidden="true"
                        className="absolute left-1/2 block h-[14px] w-[10px] -translate-x-1/2 rounded-[2.5px] border-[1.5px] border-content-muted/40"
                        style={{ bottom: `calc(${(p.value / 5) * 100}% - 7px)` }}
                      >
                        <span className="absolute -top-[2.5px] left-1/2 h-[2px] w-[4px] -translate-x-1/2 rounded-t-[1px] bg-content-muted/40" />
                        <span className="absolute inset-[1px]">
                          <span
                            className="absolute inset-x-0 bottom-0 rounded-[1px] bg-module-accent"
                            style={{ height: `${(p.value / 5) * 100}%` }}
                          />
                        </span>
                      </span>
                    ) : (
                      <span className="absolute bottom-0 left-1/2 h-1.5 w-2 -translate-x-1/2 rounded-full bg-surface-sunken shadow-[inset_0_0_0_1px_var(--border)]" />
                    )}
                    {sel === p.date && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-sm ring-2 ring-primary"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* --- Nyeri otot: titik skala 1–5 (DOMS, 5 = sangat nyeri)
              dengan pita zona pemulihan di belakang (v2.47) --- */}
          {bodyCoverage(soreness) > 0 && (
            <div>
              <div className="flex items-baseline justify-between px-0.5">
                <p className="text-eyebrow font-semibold uppercase tracking-[0.12em] text-content-muted">
                  Nyeri otot · skala 1–5
                </p>
                <p className="text-eyebrow font-semibold tabular-nums text-content-muted">
                  rerata {avgSoreness != null ? `${avgSoreness.toFixed(1).replace('.', ',')}/5` : '–'} ·{' '}
                  {bodyCoverage(soreness)}/{DAYS} hari
                </p>
              </div>
              <div className="relative mt-2 flex h-16 gap-[3px]">
                {/* Pita zona — 1–2 pulih (hijau), 3 waspada (emas),
                    4–5 berat (lempung); dekoratif, nilai tetap di label. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%] bg-success/10"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-[40%] h-[20%] bg-gold/12"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-[60%] h-[40%] bg-clay/15"
                />
                {soreness.map((p) => (
                  <button
                    key={p.date}
                    type="button"
                    aria-pressed={sel === p.date}
                    aria-label={`${p.label} ${dateShort(p.date)} — ${
                      p.value != null ? `nyeri otot ${p.value} dari 5` : 'tidak tercatat'
                    }`}
                    onClick={() => setSel(sel === p.date ? null : p.date)}
                    className="interactive relative min-w-0 flex-1 cursor-pointer rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {p.value != null ? (
                      <span
                        className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full ${negTone(p.value)}`}
                        style={{ bottom: `calc(${(p.value / 5) * 100}% - 4px)` }}
                      />
                    ) : (
                      <span className="absolute bottom-0 left-1/2 h-1.5 w-2 -translate-x-1/2 rounded-full bg-surface-sunken shadow-[inset_0_0_0_1px_var(--border)]" />
                    )}
                    {sel === p.date && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-sm ring-2 ring-primary"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* --- Stres: cincin skala 1–5 (5 = sangat stres) dengan pita
              zona yang sama seperti nyeri — bentuk cincin memisahkan
              dua skala (v2.47) --- */}
          {bodyCoverage(stress) > 0 && (
            <div>
              <div className="flex items-baseline justify-between px-0.5">
                <p className="text-eyebrow font-semibold uppercase tracking-[0.12em] text-content-muted">
                  Stres · skala 1–5
                </p>
                <p className="text-eyebrow font-semibold tabular-nums text-content-muted">
                  rerata {avgStress != null ? `${avgStress.toFixed(1).replace('.', ',')}/5` : '–'} ·{' '}
                  {bodyCoverage(stress)}/{DAYS} hari
                </p>
              </div>
              <div className="relative mt-2 flex h-16 gap-[3px]">
                {/* Pita zona — makna sama dengan nyeri otot. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%] bg-success/10"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-[40%] h-[20%] bg-gold/12"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-[60%] h-[40%] bg-clay/15"
                />
                {stress.map((p) => (
                  <button
                    key={p.date}
                    type="button"
                    aria-pressed={sel === p.date}
                    aria-label={`${p.label} ${dateShort(p.date)} — ${
                      p.value != null ? `stres ${p.value} dari 5` : 'tidak tercatat'
                    }`}
                    onClick={() => setSel(sel === p.date ? null : p.date)}
                    className="interactive relative min-w-0 flex-1 cursor-pointer rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {p.value != null ? (
                      <span
                        className={`absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 bg-surface-primary ${negRing(p.value)}`}
                        style={{ bottom: `calc(${(p.value / 5) * 100}% - 5px)` }}
                      />
                    ) : (
                      <span className="absolute bottom-0 left-1/2 h-1.5 w-2 -translate-x-1/2 rounded-full bg-surface-sunken shadow-[inset_0_0_0_1px_var(--border)]" />
                    )}
                    {sel === p.date && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-sm ring-2 ring-primary"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* --- Hidrasi: menara gelas terhadap target (v2.47) ---
              Gelas terisi dari bawah; sisa menuju target tampil sebagai
              gelas garis luar; total glyph dibatasi 8 — lebihnya jadi
              label +N di puncak. */}
          {bodyCoverage(water) > 0 && (
            <div>
              <div className="flex items-baseline justify-between px-0.5">
                <p className="text-eyebrow font-semibold uppercase tracking-[0.12em] text-content-muted">
                  Hidrasi · target {waterTarget} gelas
                </p>
                <p className="text-eyebrow font-semibold tabular-nums text-content-muted">
                  rerata {avgWater != null ? `${avgWater.toFixed(1).replace('.', ',')} gelas` : '–'} ·{' '}
                  {bodyCoverage(water)}/{DAYS} hari
                </p>
              </div>
              <div className="relative mt-2 flex h-16 gap-[3px]">
                {water.map((p) => {
                  /* total glyph = min(maks(nilai, target), 8) — gelas
                     terisi + gelas kosong sasaran; lebih dari 8 → +N. */
                  const total = Math.min(Math.max(p.value ?? 0, waterTarget), 8)
                  const filled = Math.min(p.value ?? 0, total)
                  const outline = total - filled
                  const overflow = (p.value ?? 0) - total
                  return (
                    <button
                      key={p.date}
                      type="button"
                      aria-pressed={sel === p.date}
                      aria-label={`${p.label} ${dateShort(p.date)} — ${
                        p.value != null
                          ? `${p.value} dari ${waterTarget} gelas`
                          : 'tidak tercatat'
                      }`}
                      onClick={() => setSel(sel === p.date ? null : p.date)}
                      className="interactive relative min-w-0 flex-1 cursor-pointer rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {p.value != null ? (
                        <>
                          <span
                            aria-hidden="true"
                            className="absolute inset-0 flex flex-col items-center justify-end gap-[1px]"
                          >
                            {Array.from({ length: outline }, (_, i) => (
                              <span
                                key={`o${i}`}
                                className="h-[7px] w-1.5 rounded-[1.5px] border border-module-accent/40"
                              />
                            ))}
                            {Array.from({ length: filled }, (_, i) => (
                              <span
                                key={`f${i}`}
                                className="relative h-[7px] w-1.5 rounded-[1.5px] border border-module-accent/70"
                              >
                                <span className="absolute inset-x-[0.5px] bottom-[0.5px] top-[1.5px] rounded-[1px] bg-module-accent" />
                              </span>
                            ))}
                          </span>
                          {overflow > 0 && (
                            <span
                              aria-hidden="true"
                              className="absolute left-1/2 top-0 -translate-x-1/2 rounded-[2px] bg-surface-primary px-0.5 text-chart-label font-bold leading-none text-module-accent-strong"
                            >
                              +{overflow}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="absolute inset-x-0 bottom-0 flex h-full items-end justify-center">
                          <span className="h-1.5 w-full rounded-full bg-surface-sunken shadow-[inset_0_0_0_1px_var(--border)]" />
                        </span>
                      )}
                      {sel === p.date && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 rounded-sm ring-2 ring-primary"
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Bacaan hari terpilih — selaras pola TonaseStrip (ketuk-untuk-baca). */}
          <p
            aria-live="polite"
            className="text-eyebrow font-medium leading-relaxed text-content-muted"
          >
            {sel
              ? `${selSleep?.label ?? ''} ${dateShort(sel)} — tidur ${
                  selSleep?.value != null ? `${fmtJam(selSleep.value)} jam` : 'tidak tercatat'
                } · energi ${
                  selEnergy?.value != null ? `${selEnergy.value}/5` : '–'
                } · hidrasi ${
                  selWater?.value != null ? `${selWater.value}/${waterTarget} gelas` : '–'
                } · nyeri ${
                  selSoreness?.value != null ? `${selSoreness.value}/5` : '–'
                } · stres ${
                  selStress?.value != null ? `${selStress.value}/5` : '–'
                }`
              : 'Ketuk batang untuk membaca hari tertentu.'}
          </p>
        </div>
      )}
    </m.section>
  )
}

/* ===== Panel Tubuh ===== */

export function TubuhPanel() {
  const bodyLogs = useRutina((s) => s.bodyLogs)
  const setWaterToday = useRutina((s) => s.setWaterToday)
  const logWeightToday = useRutina((s) => s.logWeightToday)
  const logBodyCheckIn = useRutina((s) => s.logBodyCheckIn)
  const openCheckIn = useCheckInSheet((s) => s.openCheckIn)
  const fitTargets = useRutina((s) => s.fitTargets)
  const setFitTargets = useRutina((s) => s.setFitTargets)

  const today = todayISO()
  const log = bodyLogs[today]
  const water = log?.water ?? 0
  const sleepH = log?.sleepH
  const energy = log?.energy
  /* Target air dinamis dari Sasaran Musim (v2.22). */
  const waterTarget = fitTargets.water > 0 ? fitTargets.water : WATER_TARGET

  const readiness = useMemo(() => readinessOf(bodyLogs), [bodyLogs])
  const weight = useMemo(() => latestWeight(bodyLogs), [bodyLogs])
  /* BMI & delta vs tujuan (v2.22) — hanya bila data lengkap. */
  const bmi =
    weight != null && fitTargets.heightCm > 0
      ? Math.round((weight / (fitTargets.heightCm / 100) ** 2) * 10) / 10
      : null
  const bmiLabel =
    bmi == null
      ? null
      : bmi < 18.5
        ? 'kurus'
        : bmi < 25
          ? 'ideal'
          : bmi < 30
            ? 'berlebih'
            : 'obesitas'
  const weightDelta =
    weight != null && fitTargets.weightGoal > 0
      ? Math.round((weight - fitTargets.weightGoal) * 10) / 10
      : null

  const [weightDraft, setWeightDraft] = useState('')

  const saveWeight = () => {
    const kg = Number(weightDraft.replace(',', '.'))
    if (!kg || kg < 25 || kg > 250) {
      toast.warning('Masukkan berat antara 25 – 250 kg')
      return
    }
    logWeightToday(Math.round(kg * 10) / 10)
    setWeightDraft('')
    toast.success(`Berat hari ini: ${String(kg).replace('.', ',')} kg`)
  }

  return (
    <div>
      {/* Check-in tidur & energi */}
      <m.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={motionTokens.preset.chipReveal}
        aria-label="Check-in harian tubuh"
        className="rounded-2xl border border-border bg-surface-primary p-5 shadow-soft"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-success">
            <Moon className="h-4.5 w-4.5" />
          </span>
          <div className="flex-1">
            <p className="text-body font-semibold text-content-primary">
              Check-in Harian
            </p>
            <p className="text-meta font-medium text-content-muted">
              Tidur semalam &amp; energi kamu — dasar kesiapan latihan
            </p>
          </div>
        </div>

        {/* Tidur — stepper 30 menit */}
        <div className="mt-4">
          <div className="flex items-center justify-between px-0.5">
            <p className="text-eyebrow font-semibold uppercase tracking-[0.12em] text-content-muted">
              Jam tidur semalam
            </p>
            <span className="text-note font-bold tabular-nums text-content-primary">
              {sleepH != null ? `${sleepH.toString().replace('.', ',')} jam` : 'belum diisi'}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              aria-label="Kurangi 30 menit tidur"
              onClick={() =>
                logBodyCheckIn({ sleepH: Math.max(0, (sleepH ?? 7) - 0.5) })
              }
              className="interactive flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-surface-sunken text-content-secondary hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="flex h-11 flex-1 items-center justify-center rounded-xl bg-surface-sunken text-section font-bold tabular-nums text-content-primary">
              {sleepH != null ? sleepH.toFixed(1).replace('.', ',') : '–'}
              <span className="ml-1 text-eyebrow font-semibold text-content-muted">
                jam (target 7–8)
              </span>
            </div>
            <button
              type="button"
              aria-label="Tambah 30 menit tidur"
              onClick={() =>
                logBodyCheckIn({ sleepH: Math.min(12, (sleepH ?? 7) + 0.5) })
              }
              className="interactive flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-surface-sunken text-content-secondary hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Energi 1–5 */}
        <div className="mt-3.5">
          <p className="px-0.5 text-eyebrow font-semibold uppercase tracking-[0.12em] text-content-muted">
            Energi hari ini
          </p>
          <div className="mt-2 flex gap-1.5">
            {ENERGY_OPTIONS.map((o) => {
              const on = energy === o.v
              return (
                <button
                  key={o.v}
                  type="button"
                  aria-pressed={on}
                  aria-label={`Energi ${o.v} — ${o.label}`}
                  onClick={() => logBodyCheckIn({ energy: o.v })}
                  className={`interactive flex h-[52px] flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl text-meta font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    on
                      ? 'bg-primary text-primary-foreground shadow-soft'
                      : 'border border-border bg-surface-sunken text-content-muted'
                  }`}
                >
                  <BatteryCharging className="h-4 w-4" />
                  {o.v}
                </button>
              )
            })}
          </div>
          <p className="mt-1.5 px-0.5 text-eyebrow font-medium text-content-muted">
            {energy != null
              ? ENERGY_OPTIONS[energy - 1].label
              : 'Pilih tingkat energimu — 1 lelah banget, 5 bugar'}
          </p>
        </div>
      </m.section>

      {/* Kesiapan latihan — turunan check-in */}
      <m.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...motionTokens.preset.chipReveal, delay: motionTokens.delay.tight }}
        aria-label="Kesiapan latihan"
        className={`mt-3 overflow-hidden rounded-2xl p-5 shadow-leaf ${
          readiness
            ? readiness.score >= 75
              ? 'bg-primary text-primary-foreground'
              : readiness.score >= 50
                ? 'bg-warning text-primary-foreground'
                : 'bg-destructive text-destructive-foreground'
            : 'bg-surface-inverse text-content-inverse'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-primary-foreground/75">
              Kesiapan latihan
            </p>
            {readiness ? (
              <>
                <p className="mt-0.5 text-lead font-bold tracking-tight">
                  {readiness.label} · {readiness.score}
                  <span className="text-meta font-semibold text-primary-foreground/75">/100</span>
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary-foreground/25">
                  <m.div
                    initial={false}
                    className="h-full rounded-full bg-primary-foreground"
                    animate={{ width: `${readiness.score}%` }}
                    transition={barFill}
                  />
                </div>
                <p className="mt-2 text-meta leading-relaxed text-primary-foreground/85">
                  {readiness.hint}
                </p>
              </>
            ) : (
              <>
                <p className="mt-0.5 text-note leading-relaxed text-primary-foreground/85">
                  Isi check-in — kesiapan dihitung otomatis dari empat
                  komponen: tidur, nyeri otot, stres, dan energi.
                </p>
                <button
                  type="button"
                  onClick={openCheckIn}
                  className="interactive mt-2.5 flex h-10 items-center justify-center gap-1.5 rounded-full bg-primary-foreground/15 px-4 text-meta font-bold text-primary-foreground hover:bg-primary-foreground/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
                >
                  <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                  Isi check-in pagi
                </button>
              </>
            )}
          </div>
        </div>
      </m.section>

      {/* Rincian kesiapan per komponen — Coach Bugar v3.02
          (tidur 30% · nyeri 30% · stres 20% · energi 20%) */}
      {readiness && (
        <m.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...motionTokens.preset.chipReveal, delay: motionTokens.delay.step }}
          aria-label="Rincian kesiapan latihan"
          className="mt-3 rounded-2xl border border-border bg-surface-primary p-5 shadow-soft"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-success">
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-body font-semibold text-content-primary">
                Rincian Kesiapan
              </p>
              <p className="text-meta font-medium text-content-muted">
                Bobot komponen Coach Bugar — skor rendah jadi perhatian
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {readiness.detail.map((c) => {
              const low = c.score < 50
              return (
                <div key={c.key}>
                  <div className="flex items-baseline justify-between gap-2 px-0.5">
                    <p className="text-meta font-bold text-content-primary">
                      {c.label}
                    </p>
                    <p className="text-eyebrow font-semibold tabular-nums text-content-muted">
                      {Math.round(c.weight * 100)}% bobot
                    </p>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                    <m.div
                      initial={false}
                      className={`h-full rounded-full ${
                        low
                          ? 'bg-clay'
                          : 'bg-gradient-to-r from-primary to-pistachio'
                      }`}
                      animate={{ width: `${c.score}%` }}
                      transition={barFill}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {readiness.missing.length > 0 && (
            <button
              type="button"
              onClick={openCheckIn}
              className="interactive mt-4 flex w-full cursor-pointer items-start gap-2.5 rounded-xl bg-surface-sunken p-3.5 text-left hover:bg-secondary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <ClipboardList
                className="mt-0.5 h-4 w-4 shrink-0 text-content-muted"
                aria-hidden="true"
              />
              <span className="text-meta leading-relaxed text-content-muted">
                Lengkapi check-in:{' '}
                <span className="font-bold text-content-secondary">
                  {readiness.missing.join(', ')}
                </span>{' '}
                agar Coach lebih akurat.
              </span>
            </button>
          )}
        </m.section>
      )}

      {/* Hidrasi */}
      <m.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...motionTokens.preset.chipReveal, delay: motionTokens.delay.normal }}
        aria-label="Hidrasi hari ini"
        className="mt-3 rounded-2xl border border-border bg-surface-primary p-5 shadow-soft"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-success">
              <Droplets className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-body font-semibold text-content-primary">
                Hidrasi
              </p>
              <p className="text-meta font-medium text-content-muted">
                {water} dari {waterTarget} gelas
                {waterTarget === 8 ? ' (≈2 liter)' : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Kurangi satu gelas"
              onClick={() => setWaterToday(-1)}
              className="interactive flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-surface-sunken text-content-secondary hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Minus className="h-4 w-4" />
            </button>
            <m.button
              type="button"
              aria-label="Tambah satu gelas"
              onClick={() => {
                setWaterToday(1)
                if (water + 1 === waterTarget) {
                  toast.success('Target hidrasi tercapai — kerja bagus!')
                }
              }}
              whileTap={{ scale: 0.92 }}
              className="interactive flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </m.button>
          </div>
        </div>

        {/* Visual gelas */}
        <div className="mt-3.5 flex flex-wrap gap-1.5" aria-hidden="true">
          {Array.from({ length: Math.max(waterTarget, water) }, (_, i) => {
            const filled = i < water
            return (
              <m.span
                key={i}
                initial={false}
                animate={{
                  scale: filled ? 1 : 0.85,
                  backgroundColor: filled ? 'var(--primary)' : 'var(--surface-sunken)',
                }}
                transition={motionTokens.spring.snappy}
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${filled ? 'text-primary-foreground' : 'text-content-muted'}`}
              >
                <Droplets className="h-4 w-4" />
              </m.span>
            )
          })}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
          <m.div
            initial={false}
            className="h-full rounded-full bg-primary"
            animate={{ width: `${Math.min((water / waterTarget) * 100, 100)}%` }}
            transition={barFill}
          />
        </div>
      </m.section>

      {/* Riwayat tubuh 14 hari — v2.36 Tahap 2 */}
      <BodyHistory logs={bodyLogs} waterTarget={waterTarget} />

      {/* Berat badan */}
      <m.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...motionTokens.preset.chipReveal, delay: motionTokens.delay.relaxed }}
        aria-label="Berat badan"
        className="mt-3 rounded-2xl border border-border bg-surface-primary p-5 shadow-soft"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-success">
            <Scale className="h-4.5 w-4.5" />
          </span>
          <div className="flex-1">
            <p className="text-body font-semibold text-content-primary">
              Berat Badan
            </p>
            <p className="text-meta font-medium text-content-muted">
              {weight != null
                ? `Terakhir tercatat ${weight.toString().replace('.', ',')} kg`
                : 'Belum pernah ditimbang'}
              {bmi != null && (
                <span className="text-content-secondary">
                  {' '}
                  · BMI {bmi.toString().replace('.', ',')} ({bmiLabel})
                </span>
              )}
              {weightDelta != null && (
                <span
                  className={
                    weightDelta > 0 ? 'text-content-danger' : 'text-success'
                  }
                >
                  {' '}
                  ·{' '}
                  {weightDelta > 0
                    ? `${weightDelta.toString().replace('.', ',')} kg dari tujuan`
                    : weightDelta < 0
                      ? `${Math.abs(weightDelta).toString().replace('.', ',')} kg di bawah tujuan`
                      : 'tepat di tujuan'}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Input timbang hari ini */}
        <div className="mt-3.5 flex gap-2">
          <Input
            aria-label="Berat badan hari ini (kg)"
            inputMode="decimal"
            value={weightDraft}
            onChange={(e) =>
              setWeightDraft(e.target.value.replace(/[^\d.,]/g, '').slice(0, 5))
            }
            placeholder={weight != null ? String(weight).replace('.', ',') : 'mis. 68,5'}
            className="h-11 flex-1 rounded-xl border-border bg-surface-sunken text-section font-bold tabular-nums text-content-primary placeholder:font-medium placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
          />
          <button
            type="button"
            onClick={saveWeight}
            className="interactive h-11 shrink-0 cursor-pointer rounded-xl bg-primary px-5 text-note font-bold text-primary-foreground shadow-soft hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Catat
          </button>
        </div>

        {/* Tren */}
        <div className="mt-4">
          <WeightSpark logs={bodyLogs} weightGoal={fitTargets.weightGoal} />
        </div>
      </m.section>

      {/* Sasaran Musim (v2.22) — delapan target bugar lengkap:
          menit/sesi per pekan, air, makro (protein/karbo/lemak), berat
          tujuan, dan tinggi badan (dasar BMI). Semua dipakai lintas
          panel: Latihan (menit vs sasaran), Asupan (makro), Tubuh ini. */}
      <m.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...motionTokens.preset.chipReveal, delay: motionTokens.delay.sweep }}
        aria-label="Sasaran bugar musim ini"
        className="mt-3 rounded-2xl border border-border bg-surface-primary p-5 shadow-soft"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-success">
              <Target className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-body font-semibold text-content-primary">
                Sasaran Musim
              </p>
              <p className="text-meta font-medium text-content-muted">
                Dipakai di Latihan, Asupan &amp; Tubuh — bukan angka hiasan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setFitTargets({ ...FIT_TARGETS_DEFAULT })
              toast.success('Sasaran dikembalikan ke bawaan')
            }}
            aria-label="Kembalikan sasaran ke bawaan"
            className="interactive flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 text-eyebrow font-semibold text-content-secondary hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Bawaan
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5">
          {(
            [
              {
                key: 'minutes' as const,
                label: 'Menit gerak / pekan',
                step: 15,
                min: 0,
                max: 1200,
                unit: 'mnt',
              },
              {
                key: 'sessions' as const,
                label: 'Sesi latihan / pekan',
                step: 1,
                min: 0,
                max: 14,
                unit: 'sesi',
              },
              {
                key: 'water' as const,
                label: 'Gelas air / hari',
                step: 1,
                min: 1,
                max: 20,
                unit: 'gelas',
              },
              {
                key: 'protein' as const,
                label: 'Protein / hari',
                step: 5,
                min: 0,
                max: 400,
                unit: 'g',
              },
              {
                key: 'carb' as const,
                label: 'Karbo / hari',
                step: 10,
                min: 0,
                max: 1000,
                unit: 'g',
              },
              {
                key: 'fat' as const,
                label: 'Lemak / hari',
                step: 5,
                min: 0,
                max: 300,
                unit: 'g',
              },
              {
                key: 'weightGoal' as const,
                label: 'Berat tujuan (kg)',
                step: 1,
                min: 0,
                max: 200,
                unit: 'kg',
              },
              {
                key: 'heightCm' as const,
                label: 'Tinggi badan (cm)',
                step: 1,
                min: 0,
                max: 230,
                unit: 'cm',
              },
            ]
          ).map((f) => (
            <div key={f.key} className="min-w-0">
              <p className="text-eyebrow font-semibold uppercase tracking-[0.1em] text-content-muted">
                {f.label}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Kurangi ${f.label}`}
                  onClick={() =>
                    setFitTargets({
                      [f.key]: Math.max(f.min, fitTargets[f.key] - f.step),
                    })
                  }
                  className="interactive flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface-sunken text-content-secondary hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <p className="min-w-0 flex-1 truncate text-center text-note font-bold tabular-nums text-content-primary">
                  {fitTargets[f.key]}
                  <span className="ml-0.5 text-eyebrow font-semibold text-content-muted">
                    {f.unit}
                  </span>
                </p>
                <button
                  type="button"
                  aria-label={`Tambah ${f.label}`}
                  onClick={() =>
                    setFitTargets({
                      [f.key]: Math.min(f.max, fitTargets[f.key] + f.step),
                    })
                  }
                  className="interactive flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface-sunken text-content-secondary hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-eyebrow leading-relaxed text-content-muted">
          Tinggi badan menghidupkan BMI di kartu Berat; berat tujuan
          menampilkan jarakmu darinya; makro dipakai bar target di tab Asupan.
        </p>
      </m.section>
    </div>
  )
}
