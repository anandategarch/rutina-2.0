'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import * as m from 'motion/react-m'
import { Feather, PenLine, Pin, Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { pressSnappy } from '@/lib/motion/transitions'
import { journalCard, journalList } from '@/lib/motion/variants'
import { motionTokens } from '@/lib/motion/tokens'

import { playfair } from '../serif'
import { MOOD_DOT, isDraftNote, noteFirstLine, useJournalUi } from '../journal-ui'
import {
  FOLDERS,
  FOLDER_SHORT,
  folderCount,
  longDateLabel,
  todayISO,
  useRutina,
  type FolderKey,
  type Note,
} from '../store'
import { RutinaEmptyState } from '../rutina-empty-state'
import { RutinaSectionHeader } from '../rutina-section-header'

const FILTERS: { key: FolderKey | 'semua'; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  ...FOLDERS.map((f) => ({ key: f.key, label: FOLDER_SHORT[f.key] })),
]

export default function JournalScreen() {
  const [query, setQuery] = useState('')
  const notes = useRutina((s) => s.notes)
  const journalFilter = useRutina((s) => s.journalFilter)
  const setJournalFilter = useRutina((s) => s.setJournalFilter)
  const togglePin = useRutina((s) => s.togglePin)
  const openReading = useRutina((s) => s.openReading)
  const noteMoods = useJournalUi((s) => s.noteMoods)
  const openCanvas = useJournalUi((s) => s.openCanvas)

  /* Pulihkan metadata suasana hati tersimpan (pola skipHydration —
     dipanggil pasca-mount agar tidak ada hydration mismatch). */
  useEffect(() => {
    void useJournalUi.persist.rehydrate()
  }, [])

  const total = notes.length
  const pinnedCount = notes.filter((n) => n.pinned).length
  const draftCount = notes.filter((n) => isDraftNote(n)).length

  /* Ringkasan kepala seksi — bagian kosong disembunyikan agar tenang. */
  const summary = [
    `${total} catatan`,
    draftCount > 0 ? `${draftCount} draf` : null,
    pinnedCount > 0 ? `${pinnedCount} disematkan` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  /* Pencarian + filter kategori bekerja bersama; catatan terbaru tetap
     di depan (addNote menambah di awal daftar). Draf (tanpa judul, lahir
     dari kanvas menulis) mendapat kelompok sendiri agar mudah dikenali. */
  const { pinned, drafts, rest } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = notes.filter(
      (n) =>
        (journalFilter === 'semua' || n.folder === journalFilter) &&
        (q === '' ||
          (n.title + ' ' + n.body).toLowerCase().includes(q)),
    )
    return {
      pinned: filtered.filter((n) => n.pinned),
      drafts: filtered.filter((n) => !n.pinned && isDraftNote(n)),
      rest: filtered.filter((n) => !n.pinned && !isDraftNote(n)),
    }
  }, [notes, journalFilter, query])

  return (
    <div
      data-module="journal"
      data-layout="writing-room"
      /* v2.33 Writing Room: lebar kanvas 720px (dari lantai 680), ritme
         antar-blok mengikuti token layout-gap (bukan mt-4 ad-hoc). */
      className="mx-auto h-full w-full max-w-[720px] overflow-y-auto no-scrollbar overscroll-contain px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] text-content-primary [&>*+*]:mt-[var(--layout-gap)]"
    >
      {/* Kepala editorial tenang — tanggal kecil kapital + judul seksi */}
      <m.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.45,
          ease: motionTokens.easing.standard,
        }}
      >
        <RutinaSectionHeader
          eyebrow={longDateLabel(todayISO())}
          title="Jurnal"
          description={summary}
          accent
        />
      </m.header>

      {/* Ajakan menulis — pintu utama ke kanvas menulis */}
      <m.button
        type="button"
        onClick={() => openCanvas()}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.45,
          delay: 0.06,
          ease: motionTokens.easing.standard,
        }}
        className="interactive mt-4 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary text-section font-bold text-primary-foreground shadow-soft hover:bg-action-hover"
      >
        <PenLine className="h-[18px] w-[18px]" strokeWidth={2.4} />
        Tulis catatan
      </m.button>

      {/* Bilah pencarian + folder — MENEMPEL di tepi atas agar pencarian
          dan kategori selalu mudah dijangkau sambil menelusuri catatan.
          Latar solid parchment (tanpa blur) — ruang jurnal tetap tenang. */}
      <div className="sticky top-0 z-30 -mx-4 mt-4 border-b border-border-default bg-surface-primary px-4 pb-2.5 pt-2">
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.1,
            ease: motionTokens.easing.standard,
          }}
          className="relative"
        >
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari judul atau isi catatan…"
            aria-label="Cari catatan jurnal"
            className="h-11 rounded-xl border-border bg-surface-primary pl-10 text-body text-content-primary shadow-soft placeholder:text-content-muted focus-visible:border-primary/50 focus-visible:ring-primary/20"
          />
        </m.div>

        {/* Chip filter kategori + jumlah catatan nyata */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.14,
            ease: motionTokens.easing.standard,
          }}
          className="relative mt-2.5"
        >
          <div
            role="group"
            aria-label="Filter kategori catatan"
            className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5"
          >
            {FILTERS.map((f) => {
              const active = journalFilter === f.key
              const count =
                f.key === 'semua' ? total : folderCount(notes, f.key)
              return (
                <m.button
                  key={f.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setJournalFilter(f.key)}
                  whileTap={{ scale: 0.96 }}
                  transition={pressSnappy}
                  className={
                    'interactive h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-meta font-bold ' +
                    (active
                      ? 'border border-module-accent/35 bg-module-accent/15 text-module-accent-strong'
                      : 'border border-border bg-surface-primary text-content-secondary hover:bg-secondary')
                  }
                >
                  {f.label}
                  <span className="ml-1.5 tabular-nums opacity-60">
                    {count}
                  </span>
                </m.button>
              )
            })}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface-primary to-transparent"
          />
        </m.div>
      </div>

      {/* Daftar catatan — hierarki tenang: sematan, lalu draf yang belum
          diberi nama, lalu catatan tersimpan. */}
      <section className="mt-6" aria-label="Daftar catatan jurnal">
        {pinned.length > 0 && (
          <div className="mt-2 first:mt-0">
            <SectionLabel>Disematkan · {pinned.length}</SectionLabel>
            <NoteList
              items={pinned}
              noteMoods={noteMoods}
              onOpen={openReading}
              onEdit={openCanvas}
              onTogglePin={togglePin}
            />
          </div>
        )}
        {drafts.length > 0 && (
          <div className="mt-6 first:mt-0">
            <SectionLabel>Draf · {drafts.length}</SectionLabel>
            <NoteList
              items={drafts}
              noteMoods={noteMoods}
              onOpen={openReading}
              onEdit={openCanvas}
              onTogglePin={togglePin}
            />
          </div>
        )}
        {rest.length > 0 && (
          <div className="mt-6 first:mt-0">
            <SectionLabel>
              {pinned.length > 0 || drafts.length > 0 ? 'Catatan lain' : 'Catatan'} ·{' '}
              {rest.length}
            </SectionLabel>
            {/* Batas awal 30 kartu — jurnal panjang (ratusan catatan)
                dimuat bertahap agar render pertama tetap ringan. */}
            <NoteList
              items={rest}
              noteMoods={noteMoods}
              onOpen={openReading}
              onEdit={openCanvas}
              onTogglePin={togglePin}
              initialLimit={30}
            />
          </div>
        )}

        {pinned.length === 0 && drafts.length === 0 && rest.length === 0 && (
          <>
            {total === 0 ? (
              <RutinaEmptyState
                icon={<Feather />}
                title="Belum ada catatan"
                description="Mulailah dengan satu kalimat jujur — cukup tulis apa yang ada di pikiranmu."
                action={
                  <m.button
                    type="button"
                    onClick={() => openCanvas()}
                    whileTap={{ scale: 0.95 }}
                    className="interactive flex h-10 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-note font-bold text-primary-foreground shadow-soft hover:bg-action-hover"
                  >
                    <PenLine className="h-4 w-4" strokeWidth={2.4} />
                    Tulis catatan pertama
                  </m.button>
                }
                className="mt-2"
              />
            ) : (
              <RutinaEmptyState
                icon={<Search />}
                title="Tidak ada catatan yang cocok"
                description="Coba kata kunci lain atau ganti kategori."
                className="mt-2"
                action={
                  query.trim() !== '' ? (
                    <m.button
                      type="button"
                      onClick={() => setQuery('')}
                      whileTap={{ scale: 0.95 }}
                      className="interactive flex h-10 cursor-pointer items-center rounded-full border border-border bg-surface-primary px-5 text-note font-semibold text-content-secondary hover:bg-secondary"
                    >
                      Hapus pencarian
                    </m.button>
                  ) : undefined
                }
              />
            )}
          </>
        )}
      </section>
    </div>
  )
}

/* ===== Bagian kecil layar ===== */

/** Label seksi kecil kapital — pemisah tenang antar kelompok catatan. */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2.5 text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
      {children}
    </p>
  )
}

interface NoteListProps {
  items: Note[]
  noteMoods: Record<string, string>
  onOpen: (id: string) => void
  onEdit: (note: Note) => void
  onTogglePin: (id: string) => void
  /** Batas awal render — sisanya dimuat bertahap (audit performa v2.13);
   *  default tanpa batas untuk daftar kecil (mis. sematan). */
  initialLimit?: number
}

function NoteList({
  items,
  noteMoods,
  onOpen,
  onEdit,
  onTogglePin,
  initialLimit,
}: NoteListProps) {
  const [limit, setLimit] = useState(initialLimit ?? items.length)
  const visible = items.slice(0, limit)
  const hidden = items.length - visible.length
  return (
    <m.div
      variants={journalList}
      initial="hidden"
      animate="show"
      className="space-y-3"
    >
      {visible.map((n) => (
        <NoteCard
          key={n.id}
          note={n}
          mood={noteMoods[n.id]}
          onOpen={() => onOpen(n.id)}
          onEdit={() => onEdit(n)}
          onTogglePin={() => onTogglePin(n.id)}
        />
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setLimit((n) => n + (initialLimit ?? hidden))}
          className="interactive w-full cursor-pointer rounded-full border border-border py-2.5 text-meta font-semibold text-content-secondary hover:bg-surface-sunken hover:text-content-primary"
        >
          Tampilkan {Math.min(initialLimit ?? hidden, hidden)} catatan lagi
          {hidden > (initialLimit ?? hidden) ? ` (${hidden} tersisa)` : ''}
        </button>
      )}
    </m.div>
  )
}

/**
 * Kartu catatan tenang: judul tegas, cuplikan dua baris redup, metadata
 * (kategori, draf, suasana hati, tanggal) di kaki kartu. Kartu dibuka ke
 * mode baca; sematan & sunting tetap satu ketukan. Draf (tanpa judul)
 * memakai baris pertama isi sebagai judul efektif — pola aplikasi
 * catatan premium — plus chip "Draft" Dusty Mauve yang jelas.
 */
function NoteCard({
  note,
  mood,
  onOpen,
  onEdit,
  onTogglePin,
}: {
  note: Note
  mood?: string
  onOpen: () => void
  onEdit: () => void
  onTogglePin: () => void
}) {
  const draft = isDraftNote(note)
  const firstLine = noteFirstLine(note)
  /* Draf: cuplikan menampilkan isi SETELAH baris pertama (baris pertama
     sudah menjadi judul) agar tidak ada pengulangan teks. */
  const snippet = draft
    ? note.body
        .trim()
        .split('\n')
        .slice(1)
        .join(' ')
        .trim()
    : note.body

  return (
    <m.article
      variants={journalCard}
      /* Tanpa whileTap pada article: Motion menyuntikkan tabindex pada
         elemen non-interaktif — umpan balik ketuk hidup di tombol buka. */
      className="relative rounded-lg border border-border bg-surface-primary p-4 transition-shadow duration-300 hover:shadow-soft [content-visibility:auto] [contain-intrinsic-size:auto_120px]"
    >
      {/* A11Y: tombol "baca catatan" absolut inset-0 (z-0) di bawah konten;
          tombol aksi relative z-10 — dua kontrol bersaudara tanpa tombol
          dalam tombol. Konten pointer-events-none agar sentuhan jatuh ke
          tombol buka. */}
      <button
        type="button"
        aria-label={`Baca catatan: ${note.title || firstLine || 'tanpa judul'}`}
        onClick={onOpen}
        className="interactive absolute inset-0 z-0 cursor-pointer rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
      <div className="pointer-events-none relative z-10">
        <div className="flex items-start justify-between gap-1">
          <h3
            className={`${playfair.className} line-clamp-2 min-w-0 flex-1 text-section font-semibold leading-snug text-content-primary`}
          >
            {note.title !== '' ? (
              note.title
            ) : (
              <span className="italic text-content-secondary">
                {firstLine !== '' ? firstLine : 'Tanpa judul'}
              </span>
            )}
          </h3>
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              aria-label={
                note.pinned ? 'Lepas sematan catatan' : 'Sematkan catatan'
              }
              onClick={(e) => {
                e.stopPropagation()
                onTogglePin()
              }}
              className={
                'interactive pointer-events-auto -mr-1.5 -mt-1.5 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full hover:bg-cocoa/10 ' +
                (note.pinned
                  ? 'text-content-secondary'
                  : 'text-content-muted')
              }
            >
              <Pin
                className="h-4 w-4"
                fill={note.pinned ? 'currentColor' : 'none'}
              />
            </button>
            <button
              type="button"
              aria-label={`Sunting catatan: ${note.title || firstLine || 'tanpa judul'}`}
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="interactive pointer-events-auto -mr-1.5 -mt-1.5 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-content-muted hover:bg-cocoa/10 hover:text-content-secondary"
            >
              <PenLine className="h-4 w-4" />
            </button>
          </div>
        </div>
        {snippet !== '' && (
          <p className="mt-1 line-clamp-2 text-note leading-relaxed text-content-muted">
            {snippet}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-chart-label font-semibold uppercase tracking-[0.1em] text-content-secondary">
            {FOLDER_SHORT[note.folder]}
          </span>
          {draft && (
            <span className="flex items-center gap-1 rounded-full bg-module-accent-soft px-2 py-0.5 text-chart-label font-semibold uppercase tracking-[0.1em] text-module-accent-strong">
              <PenLine className="h-3 w-3" aria-hidden="true" />
              Draft
            </span>
          )}
          {mood ? (
            <span className="flex items-center gap-1.5 text-eyebrow font-semibold text-content-muted">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${MOOD_DOT[mood] ?? 'bg-cocoa/40'}`}
              />
              {mood}
            </span>
          ) : null}
          <span className="ml-auto text-eyebrow font-semibold uppercase tracking-[0.12em] text-content-muted">
            {note.date}
          </span>
        </div>
      </div>
    </m.article>
  )
}
