'use client'

import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { ChevronDown } from 'lucide-react'

import { chartBar, pressSnappy } from '@/lib/motion/transitions'
import { motionTokens } from '@/lib/motion/tokens'
import { CashflowRiver } from '../visualizations/finance/cashflow-river'
import { EXPENSE, INCOME } from './cats'
import type { PeriodPoint } from './utils'

/**
 * Grafik batang arus kas — sepasang batang (masuk & keluar) per titik.
 * Tinggi mengikuti nilai maksimum deret. Titik aktif menyala penuh dan
 * mendapat sorotan kolom lembut yang meluncur mengikuti pilihan
 * (layoutId); titik lain diredupkan namun tetap dapat ditekan.
 * Lebar batang & kepadatan label menyesuaikan jumlah titik sehingga
 * deret panjang (mode "Semua") tetap muat tanpa bertumpuk.
 * v2.37 (audit P1): ganti periode/data memorf tinggi batang lewat
 * spring.chart — batang tidak pernah ditumbuhkan ulang dari nol.
 *
 * v2.45 (review Tahap 2 — K6): pemilih mode baca **Pasangan / Masuk /
 * Keluar / Net**. Mode net memakai batang bertanda di sekitar garis
 * nol tengah (surplus tumbuh ke atas warna masuk, defisit ke bawah
 * warna keluar) — tanda TIDAK disampaikan lewat warna saja; tiap
 * kolom tetap ber-aria-label lengkap.
 *
 * v2.47 (Warm Editorial): mode ke-5 **Arus** — CashflowRiver, dua pita
 * sungai masuk/keluar yang ketebalannya sebanding nilai pada SATU
 * skala bersama (lihat visualizations/finance/cashflow-river.tsx).
 * Empat mode lama tidak tersentuh.
 *
 * v2.68 (audit Fewer Choices): LIMA mode serentak menyulitkan pemindaian
 * di layar sempit. Baris pertama kini menampilkan TIGA mode baca utama
 * (Pasangan · Net · Arus); Masuk & Keluar tetap utuh sebagai mode data —
 * dijangkau lewat tombol "Lainnya" (chevron; baris tambahan terbuka
 * otomatis bila mode itu sedang aktif agar pilihan tak pernah hilang).
 */

const TRACK_H = 118 // ruang tumbuh batang (px)
const LABEL_H = 24 // baris label di bawah
const BAR_MIN = 5
const MODE_H = 46 // baris pemilih mode di atas grafik (tombol h-10 + p-0.5 + tepi)
const MORE_H = 46 // baris mode tambahan terbuka (mt-1.5 + tombol h-10)

/* Easing standar — dari motionTokens (governance: tanpa kurva bebas). */
const EASE = motionTokens.easing.standard

export type FinChartMode = 'pair' | 'masuk' | 'keluar' | 'net' | 'arus'

/** Mode yang tampil langsung pada baris pertama pemilih. */
const PRIMARY_MODES: readonly [FinChartMode, string][] = [
  ['pair', 'Pasangan'],
  ['net', 'Net'],
  ['arus', 'Arus'],
]

/** Mode data tambahan — di balik "Lainnya", tidak dihapus. */
const OVERFLOW_MODES: readonly [FinChartMode, string][] = [
  ['masuk', 'Masuk'],
  ['keluar', 'Keluar'],
]

/** Ukuran batang & jarak antar batang menurut kepadatan deret.
 *  Audit visualisasi v2.12: batang 4px pada deret panjang sulit dibaca
 *  di ponsel — lebar minimum kini 7px dan kolom diberi lantai 32px;
 *  kelebihan histori digulir horizontal (lihat COL_MIN_W di bawah). */
function barMetrics(count: number): { bar: number; gap: number } {
  if (count > 24) return { bar: 7, gap: 2 }
  if (count > 16) return { bar: 8, gap: 2.5 }
  if (count > 10) return { bar: 9, gap: 3 }
  return { bar: 9, gap: 3 }
}

/** Lebar kolom minimum (px) — menjamin batang & label tetap nyaman
    dibaca; konten melebihi wadah digeser horizontal, bukan diremjak. */
const COL_MIN_W = 32

/** Label sumbu-x ditampilkan melangkah agar tidak bertumpuk pada
    deret panjang (informasi lengkap tetap tersedia via aria-label). */
function labelEvery(count: number): number {
  if (count > 24) return 3
  if (count > 12) return 2
  return 1
}

export function FinChart({
  points,
  active,
  onPick,
}: {
  points: PeriodPoint[]
  active: number
  onPick: (i: number) => void
}) {
  /* v2.45 (revisi audit): mode awal 'pair' + pemilih selalu tampil —
     prop initialMode/allowModeToggle dulunya API spekulatif tanpa satu
     pun pemakai; dilepas demi satu jalur perilaku yang teruji. */
  const [mode, setMode] = useState<FinChartMode>('pair')

  /* v2.68 (Fewer Choices): baris mode tambahan terbuka bila pengguna
     meminta ATAU mode aktif memang tinggal di sana — pilihan aktif
     tidak pernah menghilang dari pandangan. */
  const [moreOpen, setMoreOpen] = useState(false)
  const modeInOverflow = mode === 'masuk' || mode === 'keluar'
  const showMore = moreOpen || modeInOverflow

  /* Skala per mode — tiap mode punya maksimum sendiri agar batang
     memenuhi ruang yang ada (bukan dipenjara maksimum mode lain). */
  const max =
    mode === 'masuk'
      ? Math.max(1, ...points.map((p) => p.masuk))
      : mode === 'keluar'
        ? Math.max(1, ...points.map((p) => p.keluar))
        : mode === 'net'
          ? Math.max(1, ...points.map((p) => Math.abs(p.masuk - p.keluar)))
          : Math.max(1, ...points.map((p) => Math.max(p.masuk, p.keluar)))
  const h = (v: number) =>
    Math.max(BAR_MIN, Math.round((v / max) * (TRACK_H - 14)))
  const { bar: BAR_W, gap: BAR_GAP } = barMetrics(points.length)
  const every = labelEvery(points.length)
  /* Mode net: garis nol di tengah; batang tumbuh setengah ruang ke atas
     (surplus) atau ke bawah (defisit). */
  const half = (TRACK_H - 14) / 2
  const netOf = (p: PeriodPoint) => p.masuk - p.keluar

  /* v2.37 (audit P1): batang MEMORF saat data berganti — tanpa initial
     tersembunyi & stagger, tinggi cukup menunggangi transisi chartBar
     (spring.chart). Entrance blok ditangani pemanggil (gerbang
     firstVisit), bukan per batang. */

  /* Ringkasan nonvisual — total masuk/keluar/selisih seluruh deret;
     pembaca layar mendapat gambaran umum tanpa menelusuri tiap kolom. */
  const totalIn = points.reduce((a, p) => a + p.masuk, 0)
  const totalOut = points.reduce((a, p) => a + p.keluar, 0)

  return (
    <div
      className="relative select-none"
      /* Mode Arus membawa legenda sendiri — tinggi wadah
         mengikuti konten; mode batang tetap kotak tetap seperti dahulu.
         (v2.47 audit: baris baca titik terpilih kini hanya di kartu
         "Ringkasan titik terpilih" layar Keuangan — tidak didobel.) */
      style={
        mode === 'arus'
          ? undefined
          : { height: MODE_H + (showMore ? MORE_H : 0) + TRACK_H + LABEL_H }
      }
      role="group"
      aria-label="Grafik arus kas per periode — geser menyamping untuk histori panjang"
    >
      {/* Ringkasan nonvisual — mode Arus punya ringkasan ekuivalen
          di dalam CashflowRiver (tidak didobel). */}
      {mode !== 'arus' && (
        <p className="sr-only">
          Ringkasan arus kas deret ini: total masuk
          {' '}
          {totalIn.toLocaleString('id-ID')}, total keluar{' '}
          {totalOut.toLocaleString('id-ID')}, selisih{' '}
          {(totalIn - totalOut).toLocaleString('id-ID')}
          {' '}rupiah. Rincian per periode tersedia pada tiap kolom berikut.
        </p>
      )}

      {/* v2.45: pemilih mode baca; v2.47: + Arus (sungai); v2.68 (Fewer
          Choices): tiga mode utama terlihat + "Lainnya" (Masuk/Keluar)
          dalam lipatan — baris terbuka otomatis bila mode tambahan
          sedang aktif. */}
      <div
        role="group"
        aria-label="Mode pembacaan grafik arus kas"
        className="flex gap-0.5 rounded-full border border-border bg-surface-sunken p-0.5"
        style={{ height: MODE_H }}
      >
        {PRIMARY_MODES.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => setMode(id)}
            className={`interactive h-10 flex-1 cursor-pointer rounded-full px-2 text-meta font-bold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              mode === id
                ? 'bg-primary text-primary-foreground'
                : 'text-content-secondary hover:text-content-primary'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={showMore}
          aria-controls="finchart-more-modes"
          className={`interactive flex h-10 shrink-0 cursor-pointer items-center gap-1 rounded-full px-3 text-meta font-bold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            modeInOverflow
              ? 'bg-primary text-primary-foreground'
              : 'text-content-secondary hover:text-content-primary'
          }`}
        >
          Lainnya
          <m.span
            aria-hidden="true"
            animate={{ rotate: showMore ? 180 : 0 }}
            transition={motionTokens.spring.snappy}
            className="flex"
          >
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.4} />
          </m.span>
        </button>
      </div>

      {/* Baris mode tambahan — Masuk & Keluar (mode data tidak dihapus,
          hanya diberi pintu). */}
      <AnimatePresence initial={false}>
        {showMore && (
          <m.div
            id="finchart-more-modes"
            key="fin-more-modes"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: motionTokens.duration.fast,
              ease: motionTokens.easing.smooth,
            }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 flex gap-1">
              {OVERFLOW_MODES.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={mode === id}
                  onClick={() => setMode(id)}
                  className={`interactive h-10 flex-1 cursor-pointer rounded-full border border-border bg-surface-sunken px-3 text-meta font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    mode === id
                      ? 'border-transparent bg-primary text-primary-foreground'
                      : 'text-content-secondary hover:text-content-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {mode === 'arus' ? (
        /* v2.47: mode Arus — sungai arus kas ilustratif (pita tebal ∝
           nilai, satu skala bersama); menggantikan seluruh badan batang
           di bawah pemilih mode. */
        <CashflowRiver points={points} active={active} onPick={onPick} />
      ) : (
      <>
      {/* Wadah geser — histori panjang (mode "Semua") melebar mengikuti
          jumlah kolom, bukan mengecilkan batang; ponsel menggeser
          horizontal. Garis bantu & garis dasar ikut melebar bersama
          konten agar tetap sejajar batang.
          v2.49 (audit): tinggi EKSLISIT TRACK_H+LABEL_H — `h-full` lama
          mengambil 100% dari akar (MODE_H+TRACK_H+LABEL_H) sehingga
          badan grafik meluber 42px: label periode menimpa kartu
          "Ringkasan titik terpilih" & ada celah mati di bawah pemilih
          mode (v2.45 menambah pemilih tanpa menyesuaikan h-full). */}
      <div
        className="overflow-x-auto no-scrollbar overscroll-x-contain"
        style={{ height: TRACK_H + LABEL_H }}
      >
        <div
          className="relative h-full"
          style={{ minWidth: `max(100%, ${points.length * COL_MIN_W}px)` }}
        >
          {/* Garis bantu horizontal (25/50/75/100%) — mode net hanya
              garis nol tengah (sumbu bertanda). */}
          {mode === 'net' ? (
            <span
              aria-hidden="true"
              className="absolute inset-x-0 border-t border-dashed border-border-strong"
              style={{ bottom: LABEL_H + half }}
            />
          ) : (
            [0.25, 0.5, 0.75, 1].map((f) => (
              <span
                key={f}
                aria-hidden="true"
                className="absolute inset-x-0 border-t border-border"
                style={{ bottom: LABEL_H + f * (TRACK_H - 14) }}
              />
            ))
          )}

          <div className="absolute inset-0 flex items-end justify-between gap-1">
        {points.map((p, i) => {
          const isOn = i === active
          /* Kunci indeks (pola Observatory stats.tsx): node DOM batang
             dipertahankan antar periode sehingga pergantian deret memorf
             tinggi batang — bukan remount & tumbuh ulang dari nol. */
          const net = netOf(p)
          const netH = Math.max(2, Math.round((Math.abs(net) / max) * half))
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(i)}
              aria-pressed={isOn}
              aria-label={
                mode === 'net'
                  ? `${p.label}: net ${net >= 0 ? '+' : '−'}${Math.abs(net).toLocaleString('id-ID')} (masuk ${p.masuk.toLocaleString('id-ID')}, keluar ${p.keluar.toLocaleString('id-ID')})`
                  : `${p.label}: masuk ${p.masuk.toLocaleString('id-ID')}, keluar ${p.keluar.toLocaleString('id-ID')}`
              }
              className={`group relative flex h-full min-w-[26px] flex-1 cursor-pointer flex-col items-center justify-end rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                isOn
                  ? ''
                  : 'transition-colors duration-200 hover:bg-surface-sunken/70'
              }`}
            >
              {/* Sorotan kolom titik aktif — meluncur antar titik */}
              {isOn && (
                <m.span
                  aria-hidden="true"
                  layoutId="fin-active-col"
                  className="absolute inset-0 rounded-xl bg-primary/10"
                  transition={pressSnappy}
                />
              )}

              {mode === 'net' ? (
                /* Batang bertanda — surplus tumbuh ke atas dari garis
                   nol, defisit ke bawah; tanda juga ada di aria-label. */
                <div
                  className="relative z-10"
                  style={{ height: TRACK_H, width: BAR_W * 1.6 }}
                >
                  {net !== 0 && (
                    <m.span
                      aria-hidden="true"
                      animate={{ height: netH }}
                      transition={chartBar}
                      style={
                        net > 0
                          ? {
                              position: 'absolute',
                              bottom: half,
                              left: 0,
                              width: '100%',
                              backgroundColor: INCOME,
                            }
                          : {
                              position: 'absolute',
                              top: half,
                              left: 0,
                              width: '100%',
                              backgroundColor: EXPENSE,
                            }
                      }
                      className={`rounded-full transition-opacity duration-300 ${
                        isOn ? 'opacity-100' : 'opacity-60 group-hover:opacity-85'
                      }`}
                    />
                  )}
                </div>
              ) : (
                /* Sepasang batang / batang tunggal sesuai mode. */
                <div
                  className="relative z-10 flex items-end justify-center"
                  style={{ height: TRACK_H, gap: BAR_GAP }}
                >
                  {(mode === 'pair' || mode === 'masuk') && (
                    <m.span
                      aria-hidden="true"
                      animate={{ height: h(p.masuk) }}
                      transition={chartBar}
                      style={{ backgroundColor: INCOME, width: BAR_W }}
                      className={`rounded-full transition-opacity duration-300 ${
                        isOn ? 'opacity-100' : 'opacity-60 group-hover:opacity-85'
                      }`}
                    />
                  )}
                  {(mode === 'pair' || mode === 'keluar') && (
                    <m.span
                      aria-hidden="true"
                      animate={{ height: h(p.keluar) }}
                      transition={chartBar}
                      style={{ backgroundColor: EXPENSE, width: BAR_W }}
                      className={`rounded-full transition-opacity duration-300 ${
                        isOn ? 'opacity-100' : 'opacity-60 group-hover:opacity-85'
                      }`}
                    />
                  )}
                </div>
              )}

              {/* Label + garis bawah aktif — span berukuran konten (w-max)
                  agar teks 3 huruf tidak terjepit lebar kolom sempit. */}
              <span
                className={`relative z-10 flex h-[24px] w-max items-center justify-center text-eyebrow font-semibold tracking-wide transition-colors duration-300 ${
                  isOn ? 'text-content-secondary' : 'text-content-muted'
                }`}
              >
                {i % every === 0 ? p.label : ''}
                {isOn && (
                  <m.span
                    aria-hidden="true"
                    layoutId="fin-underline"
                    className="absolute bottom-0 h-[3px] w-5 rounded-full bg-gold"
                    transition={pressSnappy}
                  />
                )}
              </span>
            </button>
          )
        })}
      </div>

      {/* Garis dasar */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 border-t border-border-strong"
        style={{ bottom: LABEL_H - 2, transition: `all .3s ${EASE.join(',')}` }}
      />
        </div>
      </div>
      </>
      )}
    </div>
  )
}
