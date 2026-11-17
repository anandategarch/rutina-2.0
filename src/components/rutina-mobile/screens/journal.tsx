'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { BookOpen, Pin, Plus, Search } from 'lucide-react'

import { Input } from '@/components/ui/input'

import { playfair } from '../serif'
import { FOLDERS, FOLDER_SHORT, useRutina, type FolderKey } from '../store'

/** Variasi latar kartu jurnal: putih bergaris tipis, pistachio, warm sand gelap. */
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

  const listRef = useRef<HTMLDivElement>(null)

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
    <div className="h-full overflow-y-auto no-scrollbar px-4 pb-28 pt-5">
      {/* Header + tombol buat catatan */}
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-[19px] font-bold tracking-tight text-[#231F1E]">
            Jurnal
          </h1>
          <p className="mt-0.5 text-xs font-medium text-[#4A3B32]/70">
            {notes.length} catatan • {pinnedCount} disematkan
          </p>
        </div>
        <button
          type="button"
          aria-label="Buat catatan baru"
          onClick={() => openCompose()}
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#749B58] text-white shadow-[0_6px_16px_rgba(116,155,88,0.35)] transition-colors hover:bg-[#658A4C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </header>

      {/* Pencarian */}
      <div className="relative mt-4">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A3B32]/45" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari judul atau isi catatan…"
          className="h-11 rounded-xl border-[#4A3B321F] bg-white pl-10 text-sm text-[#231F1E] placeholder:text-[#4A3B32]/40 focus-visible:border-[#749B58] focus-visible:ring-[#749B58]/25"
        />
      </div>

      {/* Chip filter folder — gradien kanan memberi isyarat bisa digulir */}
      <div className="relative mt-3">
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
                  'h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-[12px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] ' +
                  (active
                    ? 'bg-[#749B58] text-white'
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
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#F5F3EE] to-transparent"
        />
      </div>

      {/* Masonry kartu catatan */}
      <section className="mt-5" aria-label="Daftar catatan jurnal">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E4EFE0]">
              <BookOpen className="h-6 w-6 text-[#4A3B32]" />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-[#231F1E]">
              Tidak ada catatan
            </p>
            <p className="mt-1 text-xs text-[#4A3B32]/60">
              Coba kata kunci lain atau buat catatan baru.
            </p>
          </div>
        ) : (
          <div ref={listRef} className="columns-2 gap-3">
            {sorted.map((n) => (
              <article
                key={n.id}
                className={`mb-3 break-inside-avoid rounded-[14px] p-4 ${NOTE_TONES[n.tone % 3]}`}
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
                    onClick={() => togglePin(n.id)}
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
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
