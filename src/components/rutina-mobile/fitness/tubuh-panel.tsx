'use client'

import { useMemo, useState } from 'react'
import * as m from 'motion/react-m'
import {
  BatteryCharging,
  ClipboardList,
  Droplets,
  Minus,
  Moon,
  Plus,
  Scale,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { motionTokens } from '@/lib/motion/tokens'
import { barFill } from '@/lib/motion/transitions'
import { useCheckInSheet } from '../checkin-sheet'
import { todayISO, useRutina, type BodyLogs } from '../store'
import {
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
 *  naik/turun berat belum tentu baik/buruk tanpa konteks target. */
function WeightSpark({ logs }: { logs: BodyLogs }) {
  const series = useMemo(() => weightSeries(logs).slice(-14), [logs])

  const fmtKg = (n: number) => n.toFixed(1).replace('.', ',')
  const dateShort = (iso: string) =>
    new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
    }).format(new Date(iso + 'T00:00:00'))

  if (series.length < 2) {
    return (
      <p className="text-meta font-medium text-content-muted">
        Catat berat minimal dua kali untuk melihat tren.
      </p>
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
        <p className="flex items-baseline gap-2">
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
  const min = Math.min(...kgs)
  const max = Math.max(...kgs)
  const span = Math.max(max - min, 0.5)
  const W = 260
  const H = 56
  const pts = series.map((s, i) => {
    const x = (i / (series.length - 1)) * (W - 8) + 4
    const y = H - 6 - ((s.kg - min) / span) * (H - 14)
    return { x, y }
  })
  const path = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <div>
      {/* Baris nilai — terbaru menonjol + perubahan rentang + tanggal. */}
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-kpi-sm font-semibold leading-none tabular-nums text-content-primary">
          {fmtKg(last.kg)} kg
        </span>
        <span className="text-eyebrow font-medium text-content-secondary">
          {deltaText}
        </span>
        <span className="text-eyebrow font-medium tabular-nums text-content-muted">
          {dateShort(first.date)} – {dateShort(last.date)}
        </span>
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
          aria-label={`Tren berat badan ${series.length} catatan terakhir: dari ${fmtKg(first.kg)} kg menjadi ${fmtKg(last.kg)} kg, ${deltaText}. Rentang ${fmtKg(min)}–${fmtKg(max)} kg`}
        >
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

/* ===== Panel Tubuh ===== */

export function TubuhPanel() {
  const bodyLogs = useRutina((s) => s.bodyLogs)
  const setWaterToday = useRutina((s) => s.setWaterToday)
  const logWeightToday = useRutina((s) => s.logWeightToday)
  const logBodyCheckIn = useRutina((s) => s.logBodyCheckIn)
  const openCheckIn = useCheckInSheet((s) => s.openCheckIn)

  const today = todayISO()
  const log = bodyLogs[today]
  const water = log?.water ?? 0
  const sleepH = log?.sleepH
  const energy = log?.energy

  const readiness = useMemo(() => readinessOf(bodyLogs), [bodyLogs])
  const weight = useMemo(() => latestWeight(bodyLogs), [bodyLogs])

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
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: motionTokens.easing.standard }}
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
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-surface-sunken text-content-secondary transition-all hover:bg-surface-secondary active:scale-[0.94] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-surface-sunken text-content-secondary transition-all hover:bg-surface-secondary active:scale-[0.94] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
                  className={`flex h-[52px] flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl text-meta font-bold transition-all active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
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
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.06, ease: motionTokens.easing.standard }}
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
                  className="mt-2.5 flex h-10 items-center justify-center gap-1.5 rounded-full bg-primary-foreground/15 px-4 text-meta font-bold text-primary-foreground transition-colors hover:bg-primary-foreground/25 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.09, ease: motionTokens.easing.standard }}
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
              className="mt-4 flex w-full cursor-pointer items-start gap-2.5 rounded-xl bg-surface-sunken p-3.5 text-left transition-all hover:bg-secondary/60 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1, ease: motionTokens.easing.standard }}
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
                {water} dari {WATER_TARGET} gelas (≈2 liter)
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Kurangi satu gelas"
              onClick={() => setWaterToday(-1)}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-surface-sunken text-content-secondary transition-all hover:bg-surface-secondary active:scale-[0.94] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Minus className="h-4 w-4" />
            </button>
            <m.button
              type="button"
              aria-label="Tambah satu gelas"
              onClick={() => {
                setWaterToday(1)
                if (water + 1 === WATER_TARGET) {
                  toast.success('Target hidrasi tercapai — kerja bagus!')
                }
              }}
              whileTap={{ scale: 0.92 }}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </m.button>
          </div>
        </div>

        {/* Visual gelas */}
        <div className="mt-3.5 flex flex-wrap gap-1.5" aria-hidden="true">
          {Array.from({ length: Math.max(WATER_TARGET, water) }, (_, i) => {
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
            animate={{ width: `${Math.min((water / WATER_TARGET) * 100, 100)}%` }}
            transition={barFill}
          />
        </div>
      </m.section>

      {/* Berat badan */}
      <m.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.14, ease: motionTokens.easing.standard }}
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
            className="h-11 shrink-0 cursor-pointer rounded-xl bg-primary px-5 text-note font-bold text-primary-foreground shadow-soft transition-all hover:bg-action-hover active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Catat
          </button>
        </div>

        {/* Tren */}
        <div className="mt-4">
          <WeightSpark logs={bodyLogs} />
        </div>
      </m.section>
    </div>
  )
}
