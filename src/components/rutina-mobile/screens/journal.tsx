'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { animate, stagger } from 'animejs'
import { BookOpen, Feather, Pin, Plus, Search } from 'lucide-react'

import { Input } from '@/components/ui/input'

import { playfair } from '../serif'
import { FOLDERS, FOLDER_SHORT, useRutina, type FolderKey } from '../store'

/** Variasi latar kartu jurnal: putih, pistachio muda, warm sand —
    semuanya kontras di atas kanvas matcha. */
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

  const listRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  /* Parallax editorial: judul serif bergeser & memudar saat menggulir */
  const { scrollY } = useScroll({ container: scrollRef })
  const titleY = useTransform(scrollY, [0, 120], [0, -28])
  const titleOpacity = useTransform(scrollY, [0, 110], [1, 0.25])

  // anime.js — orkestrasi masuk kartu jurnal saat filter/pencarian berubah
  useEffect(() => {
    if (!listRef.current) return
    const anim = animate(listRef.current.querySelectorAll(':scope > article'), {
      translateY: [16, 0],
      opacity: [0, 1],
      delay: stagger(50),
      duration: 600,
      ease: 'outExpo',
    })
    return () => {
      anim.revert()
    }
  }, [journalFilter, query])

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
      className="h-full overflow-y-auto no-scrollbar overscroll-contain px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] text-[#FAF9F6]"
    >
      {/* Header editorial — serif besar, gaya Clean Typography */}
      <motion.header style={{ y: titleY, opacity: titleOpacity }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-[#FAF9F6]/65">
              <Feather className="h-3.5 w-3.5" />
              Catatan &amp; refleksi
            </p>
            <h1
              className={`${playfair.className} mt-1.5 text-balance text-[38px] font-semibold leading-none tracking-tight`}
            >
              Jurnal<span className="text-[#231F1E]/50">.</span>
            </h1>
            <p className="mt-2 text-xs font-medium text-[#FAF9F6]/75">
              {notes.length} catatan • {pinnedCount} disematkan
            </p>
          </div>
          <motion.button
            type="button"
            aria-label="Buat catatan baru"
            onClick={() => openCompose()}
            whileTap={{ scale: 0.9 }}
            className="mt-1 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#FAF9F6] text-[#231F1E] shadow-[0_8px_20px_rgba(35,31,30,0.28)] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAF9F6]"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </motion.button>
        </div>
      </motion.header>

      {/* Pencarian — kaca susu di atas kanvas hijau */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-5"
      >
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#231F1E]/45" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari judul atau isi catatan…"
          className="h-11 rounded-xl border-transparent bg-[#FAF9F6]/95 pl-10 text-sm text-[#231F1E] shadow-sm placeholder:text-[#4A3B32]/40 focus-visible:border-[#231F1E]/20 focus-visible:ring-[#231F1E]/15"
        />
      </motion.div>

      {/* Chip filter folder — pil kaca di atas hijau */}
      <motion.div
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
                  'h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-[12px] font-bold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAF9F6] ' +
                  (active
                    ? 'bg-[#FAF9F6] text-[#231F1E] shadow-[0_4px_12px_rgba(35,31,30,0.2)]'
                    : 'border border-[#FAF9F6]/40 bg-[#FAF9F6]/10 text-[#FAF9F6] backdrop-blur-sm hover:bg-[#FAF9F6]/20')
                }
              >
                {f.label}
              </button>
            )
          })}
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#749B58] to-transparent"
        />
      </motion.div>

      {/* Masonry kartu catatan */}
      <section className="mt-5" aria-label="Daftar catatan jurnal">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FAF9F6]/15">
              <BookOpen className="h-6 w-6 text-[#FAF9F6]" />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-[#FAF9F6]">
              Tidak ada catatan
            </p>
            <p className="mt-1 text-xs text-[#FAF9F6]/65">
              Coba kata kunci lain atau buat catatan baru.
            </p>
          </div>
        ) : (
          <div ref={listRef} className="columns-2 gap-3 sm:columns-3 xl:columns-4">
            {sorted.map((n) => (
              <motion.article
                key={n.id}
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
                className={`mb-3 break-inside-avoid cursor-pointer rounded-[14px] p-4 transition-shadow duration-300 hover:shadow-[0_10px_26px_rgba(35,31,30,0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAF9F6] [content-visibility:auto] [contain-intrinsic-size:auto_180px] ${NOTE_TONES[n.tone % 3]}`}
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
                <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-[#231F1E]/65">
                  {n.body}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4A3B32]/75">
                    {n.date}
                  </p>
                  <span className="text-[10px] font-bold text-[#4A3B32]/55">
                    {FOLDER_SHORT[n.folder]}
                  </span>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
