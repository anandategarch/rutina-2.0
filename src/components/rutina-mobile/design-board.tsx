'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { FlaskConical, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motionTokens } from '@/lib/motion/tokens'

import { playfair } from './serif'
import { CssLab } from './css-lab'
import { RutinaCard } from './rutina-card'
import { HABIT_CATS, HABIT_CAT_COLORS } from './store'
import { CONTENT_W } from './layout-widths'
import { useFocusTrap } from './use-focus-trap'

/**
 * Papan Sistem Desain Rutina 2.0 — satu spesifikasi visual yang hidup:
 * warna, tipografi, radius, spacing, elevasi, tombol, kartu, form,
 * dan bahasa gerak. Semua contoh MEMBACA token nyata dari CSS sehingga
 * papan ini tidak pernah berbohong saat token berubah.
 *
 * Papan ini sendiri ditulis memakai token semantic — mempraktikkan
 * governance yang ditetapkannya.
 */

/* ---------- Data token yang dibaca runtime dari :root ---------- */

const PALETTE_KEYS = [
  { key: 'matcha', note: 'Aksi utama' },
  { key: 'matcha-deep', note: 'Aksi hover' },
  { key: 'pistachio', note: 'Aksen lembut' },
  { key: 'mist', note: 'Permukaan lembut' },
  { key: 'sand', note: 'Kanvas' },
  { key: 'parchment', note: 'Kartu / kertas' },
  { key: 'linen', note: 'Permukaan sekunder' },
  { key: 'espresso', note: 'Tinta / teks' },
  { key: 'cocoa', note: 'Teks sekunder' },
  { key: 'terracotta', note: 'Destruktif' },
  { key: 'clay', note: 'Aksen hangat' },
  { key: 'gold', note: 'Kilau / premium' },
]

const SEMANTIC_KEYS = [
  { token: '--background', label: 'Kanvas aplikasi' },
  { token: '--surface-primary', label: 'Kartu / kertas' },
  { token: '--surface-secondary', label: 'Permukaan sekunder' },
  { token: '--surface-inverse', label: 'Permukaan tinta' },
  { token: '--content-primary', label: 'Teks utama' },
  { token: '--content-secondary', label: 'Teks sekunder' },
  { token: '--content-muted', label: 'Teks redup' },
  { token: '--border-default', label: 'Garis bawaan' },
  { token: '--action-primary', label: 'Aksi utama' },
  { token: '--destructive', label: 'Destruktif' },
]

const RADIUS_TOKENS = [
  { token: 'radius-sm', cls: 'rounded-sm', px: 8 },
  { token: 'radius-md', cls: 'rounded-md', px: 12 },
  { token: 'radius-lg', cls: 'rounded-lg', px: 16 },
  { token: 'radius-xl', cls: 'rounded-xl', px: 20 },
  { token: 'radius-2xl', cls: 'rounded-2xl', px: 24 },
  { token: 'radius-sheet', cls: 'rounded-sheet', px: 28 },
]

const SPACE_TOKENS = [
  { token: 'space-1', px: 4, use: 'Icon gap' },
  { token: 'space-2', px: 8, use: 'Element gap' },
  { token: 'space-3', px: 12, use: 'Compact' },
  { token: 'space-4', px: 16, use: 'Standar' },
  { token: 'space-5', px: 20, use: 'Kartu' },
  { token: 'space-6', px: 24, use: 'Seksi' },
  { token: 'space-8', px: 32, use: 'Seksi besar' },
]

const SHADOW_TOKENS = [
  { token: 'shadow-soft', cls: 'shadow-soft', note: 'Permukaan tenang' },
  { token: 'shadow-card', cls: 'shadow-card', note: 'Kartu utama' },
  { token: 'shadow-lift', cls: 'shadow-lift', note: 'Mengangkat' },
  { token: 'shadow-pop', cls: 'shadow-pop', note: 'Modal / hero' },
]

/* ---------- Pembaca token CSS runtime ----------
   Menulis textContent langsung (bukan setState) — bebas aturan
   set-state-in-effect, tanpa hydration mismatch, dan tetap reaktif
   terhadap nilai token yang tersimpan di :root. */

function CssVarText({
  token,
  className,
}: {
  token: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement)
    if (ref.current) {
      ref.current.textContent = cs.getPropertyValue(token).trim() || '—'
    }
  }, [token])
  return (
    <span ref={ref} className={className}>
      —
    </span>
  )
}

/* ---------- Kartu seksi ---------- */

function BoardSection({
  index,
  title,
  desc,
  children,
}: {
  index: string
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-6" aria-label={title}>
      <div className="flex items-baseline gap-2.5">
        <span className="text-[11px] font-bold tabular-nums text-[#749B58]">
          {index}
        </span>
        <div>
          <h2
            className={`${playfair.className} text-[20px] font-semibold leading-tight tracking-tight`}
          >
            {title}
          </h2>
          <p className="mt-0.5 text-[12px] leading-relaxed text-[#4A3B32]/70">
            {desc}
          </p>
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}

/* ---------- Demo spring (dapat diputar ulang) ---------- */

function SpringDemo({
  label,
  transition,
}: {
  label: string
  transition: { type: 'spring'; stiffness: number; damping: number }
}) {
  const [n, setN] = useState(0)
  const reduced = useReducedMotion()
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 shrink-0 rounded-full border border-border-default bg-surface-primary">
        {/* Spring fisik hanya mendukung dua keyframe — lenturan/overshoot
            lahir dari parameter spring itu sendiri, bukan keyframe ekstra. */}
        <m.div
          key={n}
          initial={false}
          animate={reduced ? { scale: 1 } : { scale: [0.4, 1] }}
          transition={reduced ? { duration: 0 } : transition}
          className="flex h-full w-full items-center justify-center rounded-full bg-action-primary text-[15px] font-bold text-white"
          aria-hidden="true"
        >
          ●
        </m.div>
      </div>
      <button
        type="button"
        onClick={() => setN((v) => v + 1)}
        className="flex-1 cursor-pointer rounded-lg border border-border-default bg-surface-primary px-3 py-2 text-left transition-colors hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="block text-[12.5px] font-semibold text-content-primary">
          {label}
        </span>
        <span className="block text-[10.5px] font-medium tabular-nums text-content-muted">
          stiffness {transition.stiffness} · damping {transition.damping}
        </span>
      </button>
    </div>
  )
}

/* ---------- Kurva easing sebagai SVG ---------- */

function EaseCurve({
  points,
  label,
}: {
  points: readonly [number, number, number, number]
  label: string
}) {
  const [x1, y1, x2, y2] = points
  /* Koordinat SVG: y dibalik (100 = atas). */
  const d = `M 4 96 C ${x1 * 100} ${100 - y1 * 100}, ${x2 * 100} ${
    100 - y2 * 100
  }, 96 4`
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg viewBox="0 0 100 100" className="h-16 w-16" aria-hidden="true">
        <rect x="0" y="0" width="100" height="100" rx="10" className="fill-surface-secondary" />
        <path d={d} fill="none" stroke="var(--palette-matcha)" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      <span className="text-[10.5px] font-bold text-content-secondary">
        {label}
      </span>
    </div>
  )
}

/* ---------- Papan utama ---------- */

export function DesignBoard({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(open, panelRef)

  /* CSS Lab — lapisan di atas papan (dibuka dari tombol kepala). */
  const [labOpen, setLabOpen] = useState(false)

  /* Escape untuk menutup — saat CSS Lab terbuka, lab menangani
     Escape-nya sendiri (satu ketukan, satu lapis). */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !labOpen) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, labOpen])

  return (
    <AnimatePresence>
      {open && (
        <m.div
          key="board-backdrop"
          aria-hidden="true"
          onClick={onClose}
          className="absolute inset-0 z-[55] bg-[#231F1E]/45"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}
      {open && (
        <m.div
          key="board-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          aria-label="Papan Sistem Desain Rutina 2.0"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={motionTokens.spring.sheet}
          className={`absolute inset-0 z-[60] mx-auto flex w-full flex-col overflow-hidden bg-background ${CONTENT_W}`}
        >
          {/* Kepala papan */}
          <div className="relative shrink-0 border-b border-border-default bg-surface-primary px-5 pb-4 pt-[max(1.1rem,env(safe-area-inset-top))]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-[#B25E3F]">
                  Spesifikasi visual · v2.0
                </p>
                <h1
                  className={`${playfair.className} mt-1 text-[26px] font-semibold leading-none tracking-tight text-content-primary`}
                >
                  Papan Sistem Desain
                </h1>
                <p className="mt-1.5 text-[11.5px] font-medium text-content-muted">
                  Calm by design. Precise by engineering.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLabOpen(true)}
                  aria-label="Buka CSS Lab"
                  className="flex h-11 cursor-pointer items-center gap-1.5 rounded-full border border-border-default bg-surface-secondary px-4 text-[12px] font-bold text-content-secondary transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <FlaskConical className="h-4 w-4" aria-hidden="true" />
                  CSS Lab
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup papan sistem desain"
                  className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-inverse text-content-inverse transition-transform hover:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <X className="h-5 w-5" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          {/* Isi papan */}
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
            {/* 01 · Primitives */}
            <BoardSection
              index="01"
              title="Palet Brand"
              desc="Token primitive — nilai dasar earth-tone. Hanya dirujuk oleh lapisan semantic, tidak pernah langsung oleh komponen."
            >
              <div className="grid grid-cols-3 gap-2.5">
                {PALETTE_KEYS.map((p) => (
                  <div
                    key={p.key}
                    className="overflow-hidden rounded-xl border border-border-default bg-surface-primary"
                  >
                    <div
                      className="h-12 w-full border-b border-border-default"
                      style={{ background: `var(--palette-${p.key})` }}
                    />
                    <div className="px-2.5 py-2">
                      <p className="truncate text-[10.5px] font-bold text-content-primary">
                        {p.key}
                      </p>
                      <CssVarText
                        token={`--palette-${p.key}`}
                        className="text-[9.5px] font-medium tabular-nums uppercase text-content-muted"
                      />
                      <p className="mt-0.5 text-[9.5px] font-medium text-content-muted">
                        {p.note}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </BoardSection>

            {/* 02 · Semantic */}
            <BoardSection
              index="02"
              title="Peran Warna"
              desc="Token semantic — bagaimana primitive dipakai UI. Dari sini shadcn/ui (primary, card, border…) ikut tersinkron."
            >
              <RutinaCard variant="elevated" radius="lg" className="divide-y divide-border-default">
                {SEMANTIC_KEYS.map((s) => (
                  <div key={s.token} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span
                      className="h-8 w-8 shrink-0 rounded-lg border border-border-default"
                      style={{ background: `var(${s.token})` }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[10.5px] font-semibold text-content-primary">
                        {s.token}
                      </p>
                      <p className="text-[10px] text-content-muted">{s.label}</p>
                    </div>
                    <CssVarText
                      token={s.token}
                      className="shrink-0 font-mono text-[9.5px] tabular-nums text-content-muted"
                    />
                  </div>
                ))}
              </RutinaCard>
            </BoardSection>

            {/* 03 · Tipografi */}
            <BoardSection
              index="03"
              title="Tipografi"
              desc="Playfair Display untuk suara editorial; Geist untuk teks fungsional. Skala fluid berbasis container (cqi)."
            >
              <div className="space-y-3">
                <RutinaCard radius="lg">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-content-muted">
                    Display · Playfair · text-fluid-hero
                  </p>
                  <p
                    className={`${playfair.className} text-fluid-hero mt-1 font-semibold text-content-primary`}
                  >
                    Rutina.
                  </p>
                </RutinaCard>
                <RutinaCard radius="lg">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-content-muted">
                    Judul · Playfair · text-fluid-title
                  </p>
                  <p
                    className={`${playfair.className} text-fluid-title mt-1 font-semibold text-content-primary`}
                  >
                    Jurnal &amp; Refleksi
                  </p>
                </RutinaCard>
                <RutinaCard radius="lg">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-content-muted">
                    Body · Geist · text-fluid-body
                  </p>
                  <p className="text-fluid-body mt-1 font-normal text-content-secondary">
                    Kebiasaan kecil yang konsisten mengalahkan motivasi besar
                    yang sesaat.
                  </p>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-content-muted">
                    Label ketat · 11px · 0.14em
                  </p>
                  <p className="text-[11px] font-medium text-content-muted">
                    Metadata · 11px — batas bawah keterbacaan; tidak ada teks
                    di bawah ini.
                  </p>
                </RutinaCard>
              </div>
            </BoardSection>

            {/* 04 · Radius & Spacing */}
            <BoardSection
              index="04"
              title="Radius &amp; Jarak"
              desc="Ritme geometri tetap: 8/12/16/20/24/28 untuk sudut; 4–32px untuk jarak (ekuivalen p-1 … p-8)."
            >
              <RutinaCard radius="lg" className="space-y-2.5">
                <div className="flex flex-wrap gap-2.5">
                  {RADIUS_TOKENS.map((r) => (
                    <div key={r.token} className="flex flex-col items-center gap-1">
                      <div
                        className={`h-11 w-14 border-2 border-[#749B58] bg-[#E4EFE0] ${r.cls}`}
                      />
                      <span className="text-[9.5px] font-bold tabular-nums text-content-secondary">
                        {r.px}px
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-1">
                  {SPACE_TOKENS.map((s) => (
                    <div key={s.token} className="flex items-center gap-2.5 py-[3px]">
                      <span
                        className="h-3.5 shrink-0 rounded-[3px] bg-[#B25E3F]"
                        style={{ width: s.px }}
                      />
                      <span className="font-mono text-[10px] font-semibold text-content-secondary">
                        {s.token}
                      </span>
                      <span className="text-[10px] tabular-nums text-content-muted">
                        {s.px}px · {s.use}
                      </span>
                    </div>
                  ))}
                </div>
              </RutinaCard>
            </BoardSection>

            {/* 05 · Elevasi */}
            <BoardSection
              index="05"
              title="Elevasi"
              desc="Bayangan bertint cokelat hangat — permukaan terasa naik tanpa kesan abu dingin."
            >
              <div className="grid grid-cols-2 gap-3">
                {SHADOW_TOKENS.map((s) => (
                  <div
                    key={s.token}
                    className={`flex h-20 flex-col justify-end rounded-xl bg-surface-primary p-3 ${s.cls}`}
                  >
                    <p className="font-mono text-[10px] font-bold text-content-primary">
                      {s.token}
                    </p>
                    <p className="text-[9.5px] font-medium text-content-muted">
                      {s.note}
                    </p>
                  </div>
                ))}
              </div>
            </BoardSection>

            {/* 06 · Tombol */}
            <BoardSection
              index="06"
              title="Tombol"
              desc="shadcn/ui Button — kini primary menyatu dengan brand (matcha) lewat token, bukan warna netral."
            >
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button>Utama</Button>
                  <Button variant="secondary">Sekunder</Button>
                  <Button variant="outline">Garis</Button>
                  <Button variant="ghost">Hantu</Button>
                  <Button variant="destructive">Hapus</Button>
                  <Button variant="link">Tautan</Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm">Kecil</Button>
                  <Button size="default">Normal</Button>
                  <Button size="lg" className="rounded-full">
                    Pil besar
                  </Button>
                  <button
                    type="button"
                    aria-label="Contoh tombol ikon"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-inverse text-content-inverse shadow-soft transition-transform hover:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    +
                  </button>
                </div>
                <p className="text-[10.5px] font-medium tabular-nums text-content-muted">
                  --button-height: <CssVarText token="--button-height" /> (target
                  sentuh minimum) · --nav-height: <CssVarText token="--nav-height" />
                </p>
              </div>
            </BoardSection>

            {/* 07 · Kartu */}
            <BoardSection
              index="07"
              title="Kartu"
              desc="RutinaCard (CVA) — varian × densitas. Satu komponen, seluruh karakter kartu produk."
            >
              <div className="grid grid-cols-2 gap-3">
                <RutinaCard variant="default" density="compact">
                  <p className="text-[11px] font-bold text-content-primary">
                    default
                  </p>
                  <p className="text-[10px] text-content-muted">compact · p-3</p>
                </RutinaCard>
                <RutinaCard variant="elevated" density="comfortable">
                  <p className="text-[11px] font-bold text-content-primary">
                    elevated
                  </p>
                  <p className="text-[10px] text-content-muted">
                    comfortable · p-4
                  </p>
                </RutinaCard>
                <RutinaCard variant="dark" density="comfortable">
                  <p className="text-[11px] font-bold">dark</p>
                  <p className="text-[10px] opacity-70">surface-inverse</p>
                </RutinaCard>
                <RutinaCard variant="brand" density="spacious">
                  <p className="text-[11px] font-bold">brand</p>
                  <p className="text-[10px] opacity-80">spacious · p-6</p>
                </RutinaCard>
              </div>
            </BoardSection>

            {/* 08 · Chip, badge & kategori */}
            <BoardSection
              index="08"
              title="Chip &amp; Lencana"
              desc="Pil folder, lencana shadcn, dan titik kategori kebiasaan — identitas warna hidup di aksen, bukan di navigasi."
            >
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge className="rounded-full bg-[#E4EFE0] text-[11px] font-bold text-[#658A4C] hover:bg-[#E4EFE0]">
                    Konsisten
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border-border-default bg-surface-primary px-3 py-1 text-[11px] font-bold text-content-secondary"
                  >
                    Aktif sejak Juni
                  </Badge>
                  <span className="flex items-center gap-1.5 rounded-full border border-border-default bg-surface-primary px-3.5 py-1.5 text-[11px] font-bold text-content-secondary">
                    Kerja
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-surface-inverse px-3.5 py-1.5 text-[11px] font-bold text-content-inverse">
                    Semua
                  </span>
                </div>
                <RutinaCard radius="lg" className="flex flex-wrap gap-x-4 gap-y-2">
                  {HABIT_CATS.map((c) => (
                    <span
                      key={c}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-content-secondary"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: HABIT_CAT_COLORS[c] }}
                      />
                      {c}
                    </span>
                  ))}
                </RutinaCard>
              </div>
            </BoardSection>

            {/* 09 · Form */}
            <BoardSection
              index="09"
              title="Form"
              desc="Input dengan status jelas — kosong, terisi, dan tidak-valid (isyarat hanya setelah interaksi pengguna)."
            >
              <div className="space-y-2.5">
                <Input placeholder="Placeholder — menunggu input" className="h-11 rounded-xl" />
                <Input
                  defaultValue="Meditasi 10 menit"
                  className="h-11 rounded-xl"
                  aria-label="Contoh terisi"
                />
                <Input
                  required
                  type="email"
                  defaultValue="bukan-email"
                  className="h-11 rounded-xl"
                  aria-label="Contoh tidak valid"
                />
              </div>
            </BoardSection>

            {/* 10 · Bottom sheet — anatomi */}
            <BoardSection
              index="10"
              title="Anatomi Bottom Sheet"
              desc="Satu pola untuk semua sheet (catatan, transaksi, kebiasaan): handle seret, kepala, isi, kaki + safe-area."
            >
              <RutinaCard radius="2xl" className="mx-auto max-w-[280px] overflow-hidden">
                <div className="flex h-7 items-center justify-center" aria-hidden="true">
                  <span className="h-1.5 w-10 rounded-full bg-[#4A3B32]/15" />
                </div>
                <div className="space-y-2.5 px-4 pb-5 pt-1">
                  <div className="rounded-lg bg-surface-secondary px-3 py-2 text-[10px] font-semibold text-content-secondary">
                    Kepala — judul &amp; deskripsi
                  </div>
                  <div className="rounded-lg bg-surface-secondary px-3 py-5 text-center text-[10px] font-semibold text-content-muted">
                    Isi — form / daftar (gulir bila panjang)
                  </div>
                  <div className="rounded-lg bg-action-primary px-3 py-2 text-center text-[10px] font-bold text-white">
                    Kaki — aksi utama (tinggi 44px)
                  </div>
                  <p className="text-center text-[9.5px] font-medium text-content-muted">
                    + env(safe-area-inset-bottom) · drag-to-dismiss · focus trap
                  </p>
                </div>
              </RutinaCard>
            </BoardSection>

            {/* 11 · Motion */}
            <BoardSection
              index="11"
              title="Bahasa Gerak"
              desc="Satu engine token (lib/motion): durasi, easing, dan spring per karakter interaksi. Ketuk untuk memutar ulang — menghormati reduced-motion."
            >
              <div className="space-y-4">
                <RutinaCard radius="lg">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-content-muted">
                    Easing
                  </p>
                  <div className="mt-2.5 flex justify-around">
                    {(
                      [
                        ['standard', motionTokens.easing.standard],
                        ['smooth', motionTokens.easing.smooth],
                        ['entrance', motionTokens.easing.entrance],
                      ] as const
                    ).map(([label, pts]) => (
                      <EaseCurve key={label} points={pts} label={label} />
                    ))}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {Object.entries(motionTokens.duration).map(([k, v]) => (
                      <span
                        key={k}
                        className="rounded-full bg-surface-secondary px-2.5 py-1 font-mono text-[9.5px] font-bold text-content-secondary"
                      >
                        {k} {v}s
                      </span>
                    ))}
                  </div>
                </RutinaCard>
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-content-muted">
                    Spring — ketuk untuk mencoba
                  </p>
                  <SpringDemo label="snappy — tombol" transition={motionTokens.spring.snappy} />
                  <SpringDemo label="sheet — bottom sheet" transition={motionTokens.spring.sheet} />
                  <SpringDemo label="playful — perayaan" transition={motionTokens.spring.playful} />
                  <SpringDemo label="ticker — angka statistik" transition={motionTokens.spring.ticker} />
                </div>
              </div>
            </BoardSection>

            {/* 12 · Governance */}
            <BoardSection
              index="12"
              title="Aturan Governance"
              desc="Ringkasan kontrak yang menjaga konsistensi saat produk membesar."
            >
              <RutinaCard variant="dark" radius="lg" className="space-y-2">
                {[
                  'Design System — token 3 lapis: primitive → semantic → component.',
                  'Interaction System — gestur, sheet, dialog, keyboard, focus, umpan balik.',
                  'Motion System — durasi/easing/spring dari lib/motion; tidak ada angka bebas.',
                  'Animation Ownership Rule — satu properti, satu pemilik animasi.',
                  'Aksesibilitas — reduced-motion, focus-visible, target sentuh 44px, teks ≥ 11px.',
                ].map((rule) => (
                  <p
                    key={rule}
                    className="flex gap-2 text-[11.5px] font-medium leading-relaxed"
                  >
                    <span className="text-[#A3C489]" aria-hidden="true">
                      ✓
                    </span>
                    {rule}
                  </p>
                ))}
              </RutinaCard>
              <p className="mt-4 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-content-muted">
                Rutina 2.0 · Earth Tone Edition
              </p>
            </BoardSection>
          </div>
        </m.div>
      )}
      {/* CSS Lab — lapisan laboratorium efek di atas papan (z-65/70). */}
      {open && (
        <CssLab
          key="css-lab"
          open={labOpen}
          onClose={() => setLabOpen(false)}
        />
      )}
    </AnimatePresence>
  )
}
