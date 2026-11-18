'use client'

import { useRef, useState } from 'react'
import { useScroll, useTransform } from 'motion/react'
import * as m from 'motion/react-m'
import { BookOpen, Feather, Pin, Plus, Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { journalCard, journalList } from '@/lib/motion/variants'

import { playfair } from '../serif'
import { FOLDERS, FOLDER_SHORT, useRutina, type FolderKey } from '../store'

/** Variasi latar kartu jurnal: putih, pistachio muda, warm sand —
    semuanya kartu terang di atas kanvas Warm Sand yang seragam. */
const NOTE_TONES = [
  'border border-[#4A3B321F] bg-white',
  'bg-[#E4EFE0]',
  'bg-[#EAE5D9]',
]

const FILTERS: { key: FolderKey | 'semua'; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  ...FOLDERS.map((f) => ({ key: f.key, label: FOLDER_SHORT[f.key] })),
]

export default function JournalScreen() {
  const [query, setQuery] = useState('')
  const notes = useRutina((s) => s.notes)
  const journalFilter = useRutina((s) => s.journalFilter)
  const setJournalFilter = useRutina((s) => s.setJournalFilter)
  const openCompose = useRutina((s) => s.openCompose)
  const togglePin = useRutina((s) => s.togglePin)
  const openReading = useRutina((s) => s.openReading)

  const scrollRef = useRef<HTMLDivElement>(null)

  /* Parallax editorial: judul serif bergeser & memudar saat menggulir */
  const { scrollY } = useScroll({ container: scrollRef })
  const titleY = useTransform(scrollY, [0, 120], [0, -28])
  const titleOpacity = useTransform(scrollY, [0, 110], [1, 0.25])

  /* ANIMATION OWNERSHIP RULE — sebelumnya anime.js menulis translateY+opacity
     pada <article> yang transform-nya juga dikendalikan Motion (whileTap).
     Kini Motion memegang seluruh siklus hidup kartu: entrance (variants
     journalList/journalCard dengan stagger) + umpan balik sentuh. Kartu yang
     baru terpasang (hasil filter/pencarian) otomatis masuk dengan animasi;
     kartu yang sudah ada tidak mengulang animasi saat mengetik. */

  const pinnedCount = notes.filter((n) => n.pinned).length
  const filtered = notes.filter(
    (n) =>
      (journalFilter === 'semua' || n.folder === journalFilter) &&
      (query.trim() === '' ||
        (n.title + ' ' + n.body)
          .toLowerCase()
          .includes(query.trim().toLowerCase())),
  )
  // Sort stabil — urutan kronologis tetap terjaga di dalam tiap kelompok.
  const sorted = [...filtered].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned),
  )

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto no-scrollbar overscroll-contain px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] text-[#231F1E]"
    >
      {/* Header editorial — serif besar, gaya Clean Typography */}
      <m.header style={{ y: titleY, opacity: titleOpacity }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-[#749B58]">
              <Feather className="h-3.5 w-3.5" />
              Catatan &amp; refleksi
            </p>
            <h1
              className={`${playfair.className} mt-1.5 text-balance text-[38px] font-semibold leading-none tracking-tight`}
            >
              Jurnal<span className="text-[#749B58]">.</span>
            </h1>
            <p className="mt-2 text-xs font-medium text-[#4A3B32]/75">
              {notes.length} catatan • {pinnedCount} disematkan
            </p>
          </div>
          <m.button
            type="button"
            aria-label="Buat catatan baru"
            onClick={() => openCompose()}
            whileTap={{ scale: 0.9 }}
            className="mt-1 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#231F1E] text-[#FAF9F6] shadow-soft transition-colors hover:bg-[#3A2E24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </m.button>
        </div>
      </m.header>

      {/* Pencarian — kartu putih di atas kanvas Warm Sand */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-5"
      >
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A3B32]/50" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari judul atau isi catatan…"
          className="h-11 rounded-xl border-[#4A3B321F] bg-white pl-10 text-sm text-[#231F1E] shadow-soft placeholder:text-[#4A3B32]/50 focus-visible:border-[#749B58]/50 focus-visible:ring-[#749B58]/20"
        />
      </m.div>

      {/* Chip filter folder — pil terang di atas Warm Sand */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-3"
      >
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {FILTERS.map((f) => {
            const active = journalFilter === f.key
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={active}
                onClick={() => setJournalFilter(f.key)}
                className={
                  'h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-[12px] font-bold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] ' +
                  (active
                    ? 'bg-[#231F1E] text-[#FAF9F6] shadow-soft'
                    : 'border border-[#4A3B321F] bg-white text-[#4A3B32] hover:bg-[#E4EFE0]')
                }
              >
                {f.label}
              </button>
            )
          })}
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#FAF9F6] to-transparent"
        />
      </m.div>

      {/* Masonry kartu catatan */}
      <section className="mt-5" aria-label="Daftar catatan jurnal">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E4EFE0]">
              <BookOpen className="h-6 w-6 text-[#658A4C]" />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-[#231F1E]">
              Tidak ada catatan
            </p>
            <p className="mt-1 text-xs text-[#4A3B32]/70">
              Coba kata kunci lain atau buat catatan baru.
            </p>
          </div>
        ) : (
          <m.div
            variants={journalList}
            initial="hidden"
            animate="show"
            className="columns-2 gap-3 sm:columns-3 xl:columns-4"
          >
            {sorted.map((n) => (
              <m.article
                key={n.id}
                variants={journalCard}
                role="button"
                tabIndex={0}
                aria-label={`Baca catatan: ${n.title}`}
                onClick={() => openReading(n.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openReading(n.id)
                  }
                }}
                whileTap={{ scale: 0.97 }}
                className={`mb-3 break-inside-avoid cursor-pointer rounded-[14px] p-4 shadow-ink transition-shadow duration-300 hover:shadow-ink-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] [content-visibility:auto] [contain-intrinsic-size:auto_180px] ${NOTE_TONES[n.tone % 3]}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={`${playfair.className} flex-1 text-[15px] font-semibold leading-snug text-[#231F1E]`}
                  >
                    {n.title}
                  </h3>
                  <button
                    type="button"
                    aria-label={n.pinned ? 'Lepas sematan catatan' : 'Sematkan catatan'}
                    onClick={(e) => {
                      e.stopPropagation()
                      togglePin(n.id)
                    }}
                    className={
                      '-mr-1 -mt-1 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-[#4A3B32]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] ' +
                      (n.pinned ? 'text-[#4A3B32]' : 'text-[#4A3B32]/40')
                    }
                  >
                    <Pin
                      className="h-3.5 w-3.5"
                      fill={n.pinned ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>
                <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-[#231F1E]/75">
                  {n.body}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4A3B32]/75">
                    {n.date}
                  </p>
                  <span className="text-[11px] font-bold text-[#4A3B32]/70">
                    {FOLDER_SHORT[n.folder]}
                  </span>
                </div>
              </m.article>
            ))}
          </m.div>
        )}
      </section>
    </div>
  )
}
