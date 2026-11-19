'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { Check, ChevronDown, Copy, Leaf, Search, X } from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { motionTokens } from '@/lib/motion/tokens'

import { playfair } from './serif'
import { RutinaEmptyState } from './rutina-empty-state'
import { CONTENT_W } from './layout-widths'
import { useFocusTrap } from './use-focus-trap'

/**
 * CSS Lab — pustaka efek CSS hidup (audit #26).
 *
 * Penerus "CSS Lab" Rutina lama (131 efek, 13 kategori): versi ini
 * mengkurasi efek yang benar-benar dipakai produk ke dalam fondasi
 * yang ringkas. Setiap efek:
 * - dipratinjau LANGSUNG di dalam kartu (kelas fx-* di atas kanvas sand),
 * - disalin sebagai CSS murni yang berdiri sendiri (kelas + @keyframes),
 * - menghormati prefers-reduced-motion.
 *
 * Inti efek TIDAK memakai utilitas Tailwind — string CSS yang
 * ditampilkan adalah string yang dijalankan (modulo prefiks skop
 * `.css-lab-scope` agar tidak pernah bocor ke luar lab).
 */

/* ---------- Kategori ---------- */

const CATEGORIES = [
  { key: 'kartu', label: 'Kartu' },
  { key: 'teks', label: 'Teks' },
  { key: 'latar', label: 'Latar' },
  { key: 'gerak', label: 'Gerak' },
  { key: 'umpan-balik', label: 'Umpan Balik' },
  { key: 'beban', label: 'Beban' },
] as const

type CategoryKey = (typeof CATEGORIES)[number]['key']

const CHIP_ALL: { key: CategoryKey | 'semua'; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  ...CATEGORIES,
]

/* ---------- Katalog efek (CSS murni, siap salin-tempel) ---------- */

interface CssEffect {
  id: string
  title: string
  category: CategoryKey
  /** Aturan kelas — inti efek, tanpa utilitas Tailwind. */
  css: string
  /** @keyframes pendamping (nama unik fxk-*) — ikut tersalin. */
  keyframes?: string
  /** Elemen pratinjau hidup (chrome boleh Tailwind, inti fx-*). */
  preview: ReactNode
}

const EFFECTS: CssEffect[] = [
  /* ===== Kartu ===== */
  {
    id: 'glass',
    title: 'Kartu Kaca',
    category: 'kartu',
    css: `.fx-glass {
  padding: 1rem 1.25rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px rgba(35, 31, 30, 0.18);
}`,
    preview: (
      <>
        <span
          aria-hidden="true"
          className="absolute left-3 top-2 h-12 w-12 rounded-full bg-gradient-to-br from-[#A3C489] to-[#B25E3F]"
        />
        <span
          aria-hidden="true"
          className="absolute bottom-1.5 right-4 h-10 w-10 rounded-full bg-[#C7A17A]/80"
        />
        <div className="fx-glass text-[12px] font-bold text-white">Kaca</div>
      </>
    ),
  },
  {
    id: 'gradient-border',
    title: 'Bingkai Gradien',
    category: 'kartu',
    css: `.fx-border {
  padding: 1rem 1.25rem;
  border: 2px solid transparent;
  border-radius: 14px;
  background:
    linear-gradient(#FFFCF5, #FFFCF5) padding-box,
    linear-gradient(135deg, #A3C489, #C7A17A, #749B58) border-box;
}`,
    preview: (
      <div className="fx-border text-[12px] font-bold text-[#4A3B32]">
        Bingkai
      </div>
    ),
  },
  {
    id: 'hover-lift',
    title: 'Terangkat saat Disorot',
    category: 'kartu',
    css: `.fx-lift {
  padding: 1rem 1.25rem;
  border-radius: 14px;
  background: #FFFCF5;
  border: 1px solid #E3DDD0;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.fx-lift:hover {
  transform: translateY(-6px);
  box-shadow: 0 14px 28px rgba(35, 31, 30, 0.16);
}`,
    preview: (
      <div className="fx-lift text-[12px] font-bold text-[#4A3B32]">
        Sorot aku
      </div>
    ),
  },

  /* ===== Teks ===== */
  {
    id: 'neon',
    title: 'Cahaya Neon',
    category: 'teks',
    css: `.fx-neon {
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #A3C489;
  text-shadow:
    0 0 6px rgba(163, 196, 137, 0.9),
    0 0 18px rgba(163, 196, 137, 0.55),
    0 0 42px rgba(116, 155, 88, 0.45);
}`,
    preview: <span className="fx-neon text-[22px]">NEON</span>,
  },
  {
    id: 'gradient-text',
    title: 'Teks Gradien',
    category: 'teks',
    css: `.fx-text-grad {
  font-weight: 700;
  background: linear-gradient(90deg, #749B58, #C7A17A 55%, #B25E3F);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}`,
    preview: <span className="fx-text-grad text-[26px]">Gradien</span>,
  },
  {
    id: 'typewriter',
    title: 'Mesin Tik',
    category: 'teks',
    css: `.fx-typewriter {
  display: inline-block;
  width: 13ch;
  overflow: hidden;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  border-right: 2px solid #749B58;
  animation: fxk-type 3.4s steps(13, end) infinite alternate,
    fxk-caret 0.75s step-end infinite;
}`,
    keyframes: `@keyframes fxk-type {
  from {
    width: 0;
  }
  to {
    width: 13ch;
  }
}
@keyframes fxk-caret {
  50% {
    border-color: transparent;
  }
}`,
    preview: (
      <span className="fx-typewriter text-[13px] text-[#4A3B32]">
        Halo, Rutina!
      </span>
    ),
  },
  {
    id: 'shimmer-text',
    title: 'Teks Berkilau',
    category: 'teks',
    css: `.fx-shimmer {
  font-weight: 700;
  background: linear-gradient(110deg, #8A7460 38%, #F5F3EE 50%, #8A7460 62%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: fxk-shimmer 2.4s linear infinite;
}`,
    keyframes: `@keyframes fxk-shimmer {
  to {
    background-position: -200% 0;
  }
}`,
    preview: <span className="fx-shimmer text-[20px]">Berkilau</span>,
  },

  /* ===== Latar ===== */
  {
    id: 'animated-gradient',
    title: 'Gradien Hidup',
    category: 'latar',
    css: `.fx-bg-anim {
  border-radius: 12px;
  background: linear-gradient(120deg, #A3C489, #C7A17A, #749B58);
  animation: fxk-hue 6s linear infinite;
}`,
    keyframes: `@keyframes fxk-hue {
  to {
    filter: hue-rotate(360deg);
  }
}`,
    preview: <div className="fx-bg-anim h-16 w-36" />,
  },
  {
    id: 'dot-grid',
    title: 'Kisi Titik',
    category: 'latar',
    css: `.fx-dots {
  border-radius: 12px;
  background-color: #F0EDE3;
  background-image: radial-gradient(#749B58 1.2px, transparent 1.3px);
  background-size: 14px 14px;
}`,
    preview: <div className="fx-dots h-16 w-36" />,
  },
  {
    id: 'noise',
    title: 'Tekstur Noise',
    category: 'latar',
    css: `.fx-noise {
  position: relative;
  border-radius: 12px;
  background: #E4EFE0;
}
.fx-noise::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
}`,
    preview: <div className="fx-noise h-16 w-36" />,
  },

  /* ===== Gerak ===== */
  {
    id: 'float',
    title: 'Mengapung',
    category: 'gerak',
    css: `.fx-float {
  animation: fxk-float 3s ease-in-out infinite;
}`,
    keyframes: `@keyframes fxk-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}`,
    preview: (
      <div className="fx-float flex h-14 w-14 items-center justify-center rounded-full bg-[#749B58] text-white">
        <Leaf className="h-6 w-6" aria-hidden="true" />
      </div>
    ),
  },
  {
    id: 'pulse-ring',
    title: 'Cincin Denyut',
    category: 'gerak',
    css: `.fx-pulse {
  animation: fxk-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}`,
    keyframes: `@keyframes fxk-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(116, 155, 88, 0.5);
  }
  70% {
    box-shadow: 0 0 0 14px rgba(116, 155, 88, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(116, 155, 88, 0);
  }
}`,
    preview: <div className="fx-pulse h-12 w-12 rounded-full bg-[#749B58]" />,
  },
  {
    id: 'morph-blob',
    title: 'Blob Bermorf',
    category: 'gerak',
    css: `.fx-blob {
  background: linear-gradient(135deg, #A3C489, #C7A17A);
  animation: fxk-blob 8s ease-in-out infinite;
}`,
    keyframes: `@keyframes fxk-blob {
  0%,
  100% {
    border-radius: 60% 40% 55% 45% / 55% 45% 60% 40%;
  }
  33% {
    border-radius: 45% 55% 40% 60% / 60% 40% 55% 45%;
  }
  66% {
    border-radius: 55% 45% 60% 40% / 40% 60% 45% 55%;
  }
}`,
    preview: <div className="fx-blob h-14 w-14" />,
  },

  /* ===== Umpan Balik ===== */
  {
    id: 'ripple',
    title: 'Riak Tombol',
    category: 'umpan-balik',
    css: `.fx-ripple {
  position: relative;
  overflow: hidden;
  padding: 0.65rem 1.4rem;
  border: none;
  border-radius: 999px;
  background: #749B58;
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}
.fx-ripple::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 140%;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: translate(-50%, -50%) scale(0);
  opacity: 0;
  transition: transform 0.5s ease-out, opacity 0.6s ease-out;
}
.fx-ripple:active::after {
  transform: translate(-50%, -50%) scale(1);
  opacity: 1;
  transition: 0s;
}`,
    preview: (
      <button type="button" className="fx-ripple">
        Tekan aku
      </button>
    ),
  },
  {
    id: 'press-scale',
    title: 'Skala Tekan',
    category: 'umpan-balik',
    css: `.fx-press {
  padding: 0.65rem 1.4rem;
  border: none;
  border-radius: 999px;
  background: #C7A17A;
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.12s ease;
}
.fx-press:active {
  transform: scale(0.94);
}`,
    preview: (
      <button type="button" className="fx-press">
        Tekan
      </button>
    ),
  },

  /* ===== Beban ===== */
  {
    id: 'skeleton',
    title: 'Kerangka Berkilau',
    category: 'beban',
    css: `.fx-skeleton {
  border-radius: 8px;
  background: linear-gradient(90deg, #E3DDD0 25%, #F0EBE0 50%, #E3DDD0 75%);
  background-size: 200% 100%;
  animation: fxk-skeleton 1.4s ease-in-out infinite;
}`,
    keyframes: `@keyframes fxk-skeleton {
  to {
    background-position: -200% 0;
  }
}`,
    preview: (
      <div className="w-40 space-y-2">
        <div className="fx-skeleton h-3 w-full" />
        <div className="fx-skeleton h-3 w-3/4" />
        <div className="fx-skeleton h-3 w-1/2" />
      </div>
    ),
  },
  {
    id: 'spinner',
    title: 'Spinner Konik',
    category: 'beban',
    css: `.fx-spinner {
  width: 30px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  background: conic-gradient(#749B58 0 25%, #E3DDD0 25% 100%);
  animation: fxk-spin 0.9s linear infinite;
  -webkit-mask: radial-gradient(farthest-side, transparent 55%, #000 56%);
  mask: radial-gradient(farthest-side, transparent 55%, #000 56%);
}`,
    keyframes: `@keyframes fxk-spin {
  to {
    transform: rotate(1turn);
  }
}`,
    preview: <div className="fx-spinner" />,
  },
]

/* ---------- CSS yang dijalankan lab (skop .css-lab-scope) ---------- */

/** Salinan berdiri-sendiri yang dikopi pengguna: kelas + keyframes. */
function copyableCss(e: CssEffect): string {
  return e.keyframes ? `${e.css}\n\n${e.keyframes}` : e.css
}

/** Prefiks tiap selektor aturan dengan skop lab — keyframes terpisah
 *  (di dalamnya selektor persentase tidak boleh diprefiks). */
function scopeCss(css: string): string {
  return css.replace(
    /(^|\n)(\.[^{]+\{)/g,
    (_match: string, lineBreak: string, rule: string) =>
      `${lineBreak}.css-lab-scope ${rule}`,
  )
}

const LAB_STYLE = [
  scopeCss(EFFECTS.map((e) => e.css).join('\n\n')),
  EFFECTS.map((e) => e.keyframes)
    .filter(Boolean)
    .join('\n\n'),
  `@media (prefers-reduced-motion: reduce) {
  .css-lab-scope *,
  .css-lab-scope *::before,
  .css-lab-scope *::after {
    animation: none !important;
    transition: none !important;
  }
}`,
].join('\n\n')

/* ---------- Komponen utama ---------- */

export function CssLab({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(open, panelRef)

  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<CategoryKey | 'semua'>('semua')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* Escape menutup lab (papan desain di belakang sengaja menunggu —
     satu ketukan menutup satu lapis). */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  /* Filter segar setiap kali lab dibuka. */
  useEffect(() => {
    if (open) {
      setQuery('')
      setCat('semua')
      setExpandedId(null)
    }
  }, [open])

  /* Bersihkan timer indikator "Tersalin" saat unmount. */
  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    },
    [],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return EFFECTS.filter((e) => {
      if (cat !== 'semua' && e.category !== cat) return false
      if (!q) return true
      const catLabel =
        CATEGORIES.find((c) => c.key === e.category)?.label ?? ''
      return (
        e.title.toLowerCase().includes(q) ||
        catLabel.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q)
      )
    })
  }, [query, cat])

  const copyEffect = async (e: CssEffect) => {
    try {
      if (!navigator.clipboard) throw new Error('clipboard tidak tersedia')
      await navigator.clipboard.writeText(copyableCss(e))
      toast.success('CSS disalin')
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      setCopiedId(e.id)
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 1600)
    } catch {
      toast.error('Gagal menyalin CSS — coba lagi.')
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <m.div
          key="css-lab-backdrop"
          aria-hidden="true"
          onClick={onClose}
          className="absolute inset-0 z-[65] bg-[#231F1E]/45"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}
      {open && (
        <m.div
          key="css-lab-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          aria-label="CSS Lab — pustaka efek CSS Rutina"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={motionTokens.spring.sheet}
          className={`absolute inset-0 z-[70] mx-auto flex w-full flex-col overflow-hidden bg-background ${CONTENT_W}`}
        >
          {/* Gaya efek — skop .css-lab-scope, hilang saat lab ditutup */}
          <style>{LAB_STYLE}</style>

          <div className="css-lab-scope flex min-h-0 flex-1 flex-col">
            {/* Kepala lab */}
            <div className="relative shrink-0 border-b border-border-default bg-surface-primary px-5 pb-4 pt-[max(1.1rem,env(safe-area-inset-top))]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#B25E3F]">
                    Lab efek · CSS murni
                  </p>
                  <h1
                    className={`${playfair.className} mt-1 text-[26px] font-semibold leading-none tracking-tight text-content-primary`}
                  >
                    CSS Lab
                  </h1>
                  <p className="mt-1.5 text-[12px] font-medium text-content-muted">
                    {EFFECTS.length} efek hidup dalam {CATEGORIES.length}{' '}
                    kategori — salin, tempel, pakai.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup CSS Lab"
                  className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-inverse text-content-inverse transition-transform hover:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <X className="h-5 w-5" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Pencarian + filter kategori */}
            <div className="shrink-0 space-y-3 border-b border-border-default bg-surface-primary px-5 pb-3.5">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted"
                  aria-hidden="true"
                />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari efek atau kategori…"
                  aria-label="Cari efek CSS"
                  className="h-11 rounded-xl border-border bg-surface-sunken pl-9 text-[13px]"
                />
              </div>
              <div
                className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5"
                role="group"
                aria-label="Filter kategori efek"
              >
                {CHIP_ALL.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    aria-pressed={cat === chip.key}
                    onClick={() => setCat(chip.key)}
                    className={cn(
                      'flex h-9 shrink-0 cursor-pointer items-center rounded-full px-3.5 text-[12px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      cat === chip.key
                        ? 'bg-surface-inverse text-content-inverse'
                        : 'border border-border-default bg-surface-primary text-content-secondary hover:bg-surface-secondary',
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Kisi kartu efek */}
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4">
              {filtered.length === 0 ? (
                <RutinaEmptyState
                  icon={<Search className="h-6 w-6" aria-hidden="true" />}
                  title="Tidak ada efek yang cocok"
                  description="Coba kata kunci lain atau ganti filter kategori."
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((e, i) => {
                    const isExpanded = expandedId === e.id
                    const isCopied = copiedId === e.id
                    const catLabel =
                      CATEGORIES.find((c) => c.key === e.category)?.label ?? ''
                    return (
                      <m.div
                        key={e.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: Math.min(i * 0.035, 0.35),
                          ease: motionTokens.easing.standard,
                        }}
                      >
                        <article className="overflow-hidden rounded-xl border border-border-default bg-surface-primary">
                          {/* Pratinjau hidup — kanvas sand agar efek terbaca */}
                          <div className="relative flex h-24 items-center justify-center overflow-hidden bg-[#ECE8DC]">
                            {e.preview}
                          </div>

                          {/* Judul — ketuk untuk membuka/tutup kode */}
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(isExpanded ? null : e.id)
                            }
                            aria-expanded={isExpanded}
                            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-bold text-content-primary">
                                {e.title}
                              </span>
                              <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-content-muted">
                                {catLabel}
                              </span>
                            </span>
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 shrink-0 text-content-muted transition-transform duration-200',
                                isExpanded && 'rotate-180',
                              )}
                              aria-hidden="true"
                            />
                          </button>

                          {/* Kode CSS — meluas saat kartu diketuk */}
                          {isExpanded && (
                            <pre className="max-h-56 overflow-auto border-t border-border-default bg-surface-sunken px-3 py-2.5 font-mono text-[11px] leading-relaxed text-content-secondary">
                              {copyableCss(e)}
                            </pre>
                          )}

                          {/* Kaki — nama kelas + salin */}
                          <div className="flex items-center justify-between gap-2 border-t border-border-default px-3 py-2">
                            <code className="truncate font-mono text-[10px] font-semibold text-content-muted">
                              .fx-{e.id}
                            </code>
                            <button
                              type="button"
                              onClick={() => copyEffect(e)}
                              className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-secondary px-3.5 text-[11px] font-bold text-success transition-colors hover:bg-secondary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                              {isCopied ? (
                                <Check
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Copy
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                              )}
                              {isCopied ? 'Tersalin' : 'Salin CSS'}
                            </button>
                          </div>
                        </article>
                      </m.div>
                    )
                  })}
                </div>
              )}
              <p className="mt-6 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-content-muted">
                Rutina 2.0 · CSS Lab
              </p>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
