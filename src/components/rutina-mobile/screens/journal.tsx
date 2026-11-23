'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import * as m from 'motion/react-m'
import { ChevronDown, Feather, PenLine, Pin, Search, SlidersHorizontal, Smile, X } from 'lucide-react'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { pressSnappy } from '@/lib/motion/transitions'
import { journalCard, journalList } from '@/lib/motion/variants'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { motionTokens } from '@/lib/motion/tokens'

import { playfair } from '../serif'
import { MOOD_DOT, countWords, isDraftNote, liveMoodCounts, noteFirstLine, useJournalUi } from '../journal-ui'
import {
  FOLDERS,
  FOLDER_SHORT,
  addDaysISO,
  folderCount,
  longDateLabel,
  noteDateISO,
  noteDateLabel,
  shortDateLabel,
  todayISO,
  weekStartISO,
  useRutina,
  type FolderKey,
  type Note,
} from '../store'
import { RutinaEmptyState } from '../rutina-empty-state'
import { RutinaIllustration } from '../rutina-illustration'
import { RutinaSectionHeader } from '../rutina-section-header'
import { SmoothScrollArea } from '../smooth-scroll-area'
import { WordReveal } from '../word-reveal'
import { MotionCard } from '../rutina-motion-card'
import { InkDot, InkStroke } from '../visualizations/journal/ink-stroke'
import { MoodWheel } from '../visualizations/journal/mood-wheel'

/* ===== Aktivitas Menulis — kalender mini + distribusi (audit
   visualisasi v2.36, Tahap 4) =====

   Jejak menulis bulanan di halaman DAFTAR (kanvas menulis tetap bebas
   gangguan): sel kalender berintensitas jumlah catatan per tanggal —
   tanggal dipilih untuk memfilter daftar. Distribusi folder jadi satu
   segmented bar kecil; mood hanya diringkas bila benar-benar tercatat.
   Catatan tanpa tanggal pasti (impor lama) TIDAK diperkirakan — tidak
   menambah sel apa pun. */
const WRITE_LEVELS = [
  'var(--surface-secondary)',
  'color-mix(in oklab, var(--module-accent) 35%, var(--surface-primary))',
  'color-mix(in oklab, var(--module-accent) 60%, var(--surface-primary))',
  'var(--module-accent-strong)',
] as const

function writeLevelOf(count: number): number {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  return 3
}

const MONTHS_ID_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function WritingActivityCard({
  notes,
  noteMoods,
  dayFilter,
  onPickDay,
  weekFilter,
  onPickWeek,
  selectedMood = null,
}: {
  notes: Note[]
  noteMoods: Record<string, string>
  dayFilter: string | null
  onPickDay: (iso: string | null) => void
  /** v2.45 (review — J4): batang kata bisa dibedah → filter daftar ke
   *  rentang pekan itu. */
  weekFilter: string | null
  onPickWeek: (start: string | null) => void
  /** Filter mood aktif layar Jurnal (null = semua) — diteruskan ke roda
   *  suasana agar arc yang sedang disaring tersorot (roda tetap membawa
   *  distribusi penuh, bukan hanya yang terfilter). */
  selectedMood?: string | null
}) {
  const today = todayISO()
  const [viewYm, setViewYm] = useState(today.slice(0, 7))
  /* Mode baca (review UI/UX v2.44): kalender jumlah catatan (lama) /
     volume KATA per pekan — jumlah catatan ≠ produktivitas menulis.
     v2.45 (audit J3): mode terakhir DIINGAT antar kunjungan via toko
     persist journal-ui — rehidrasi pasca-mount ditangani shell
     (rutina-app), bukan setState dalam efek di sini. */
  const view = useJournalUi((s) => s.activityView)
  const setView = useJournalUi((s) => s.setActivityView)
  /* v2.37 P1 (audit UX density): kartu dilipat secara default — pemicu
     selalu menampilkan ringkasan satu baris. Dipaksa tetap terbuka selama
     filter tanggal aktif agar chip penghapusnya tidak tersembunyi. */
  const [activityOpen, setActivityOpen] = useState(false)

  /* Jumlah catatan per tanggal ISO — hanya tanggal yang dapat dipastikan. */
  const byDate = useMemo(() => {
    const m = new Map<string, number>()
    for (const n of notes) {
      const iso = noteDateISO(n)
      if (iso != null) m.set(iso, (m.get(iso) ?? 0) + 1)
    }
    return m
  }, [notes])

  /* Sel kalender (Senin-kolom pertama), null = pengisi awal pekan. */
  const cells = useMemo(() => {
    const [y, mo] = viewYm.split('-').map(Number)
    const lead = (new Date(y, mo - 1, 1).getDay() + 6) % 7
    const daysInMonth = new Date(y, mo, 0).getDate()
    const out: (string | null)[] = Array.from({ length: lead }, () => null)
    for (let d = 1; d <= daysInMonth; d++)
      out.push(`${viewYm}-${String(d).padStart(2, '0')}`)
    return out
  }, [viewYm])

  const monthLabel = (() => {
    const [y, mo] = viewYm.split('-').map(Number)
    return `${MONTHS_ID_FULL[mo - 1]} ${y}`
  })()
  const curYm = today.slice(0, 7)
  const canNext = viewYm < curYm
  const monthCount = cells.filter((c) => c != null && byDate.has(c)).length
  const monthNotes = cells.reduce(
    (a, c) => a + (c != null ? (byDate.get(c) ?? 0) : 0),
    0,
  )

  /* Distribusi folder — segmented bar kecil, satu rumpun warna aksen
     modul dengan tingkat intensitas berbeda (tenang, bukan pelangi). */
  const folderSegs = FOLDERS.map((f, i) => ({
    ...f,
    count: folderCount(notes, f.key),
    seg:
      i === 0
        ? 'bg-module-accent-strong'
        : i === 1
          ? 'bg-module-accent/70'
          : i === 2
            ? 'bg-module-accent/45'
            : 'bg-module-accent/25',
  }))
  const totalNotes = notes.length

  /* Ringkasan mood — hanya mood yang benar-benar tercatat.
     v2.49 (audit): helper bersama liveMoodCounts (satu implementasi
     bersama JournalScreen — sebelumnya dua salinan identik). */
  const moodCounts = useMemo(
    () => liveMoodCounts(notes, noteMoods),
    [notes, noteMoods],
  )

  /* Streak menulis — hari berturut-turut yang punya catatan, berakhir
     hari ini atau kemarin (hari berjalan belum memutus streak). Bahan
     ringkasan satu baris di pemicu lipat (v2.37 P1). */
  const streak = useMemo(() => {
    let cursor = byDate.has(today) ? today : addDaysISO(today, -1)
    if (!byDate.has(cursor)) return 0
    let n = 0
    while (byDate.has(cursor)) {
      n += 1
      cursor = addDaysISO(cursor, -1)
    }
    return n
  }, [byDate, today])

  /* Volume kata per pekan (review v2.44) — 4 pekan Senin–Minggu,
     pekan berjalan sampai hari ini; kata dihitung dari isi catatan
     ber-tanggal pasti (impor lama tanpa tanggal tidak dikira-kira). */
  const wordWeeks = useMemo(() => {
    const wordsByDate = new Map<string, number>()
    const notesByDate = new Map<string, number>()
    for (const n of notes) {
      const iso = noteDateISO(n)
      if (iso == null) continue
      /* v2.45 (audit J5): hitung kata via countWords bersama — simbol
         markdown bukan kata (toolbar kanvas menyisipkannya). */
      const words = countWords(n.body)
      wordsByDate.set(iso, (wordsByDate.get(iso) ?? 0) + words)
      notesByDate.set(iso, (notesByDate.get(iso) ?? 0) + 1)
    }
    const weeks = []
    for (let k = 3; k >= 0; k--) {
      const start = weekStartISO(addDaysISO(today, -k * 7))
      let words = 0
      let days = 0
      for (let d = 0; d < 7; d++) {
        const iso = addDaysISO(start, d)
        if (iso > today) break
        if ((notesByDate.get(iso) ?? 0) > 0) {
          days++
          words += wordsByDate.get(iso) ?? 0
        }
      }
      weeks.push({ start, words, days })
    }
    return weeks
  }, [notes, today])
  const totalWords = wordWeeks.reduce((a, w) => a + w.words, 0)
  const activeWriteDays = wordWeeks.reduce((a, w) => a + w.days, 0)
  const avgWordsPerDay =
    activeWriteDays > 0 ? Math.round(totalWords / activeWriteDays) : 0

  /* Audit v2.47 (3-d): jumlah kata pekan terfilter untuk chip — angka
     PERSIS (id-ID, mis. "1.234"), dihitung dari sumber yang sama dengan
     wordWeeks (countWords atas catatan ber-tanggal pasti; pekan berjalan
     sampai hari ini) sehingga tetap jujur untuk rentang pekan apa pun,
     bukan hanya jendela 4 pekan terakhir. */
  const selWeekWords = useMemo(() => {
    if (weekFilter === null) return 0
    const end = addDaysISO(weekFilter, 6)
    let sum = 0
    for (const n of notes) {
      const iso = noteDateISO(n)
      if (iso == null || iso < weekFilter || iso > end) continue
      if (iso > today) continue
      sum += countWords(n.body)
    }
    return sum
  }, [notes, weekFilter, today])

  /* Tanggal terakhir menulis — pengganti streak bila masih pendek. */
  const lastWrite = useMemo(() => {
    let last: string | null = null
    for (const iso of byDate.keys()) if (last === null || iso > last) last = iso
    return last
  }, [byDate])

  const summaryLine = [
    `${totalNotes} catatan`,
    streak >= 2
      ? `streak menulis ${streak} hari`
      : lastWrite !== null
        ? `terakhir menulis ${noteDateLabel({ id: 'x', date: lastWrite } as Note, today)}`
        : null,
  ]
    .filter(Boolean)
    .join(' · ')

  /* v2.87: kartu aktivitas kini MotionCard — masuk saat terlihat +
     hover halus (motion.dev). */
  return (
    <MotionCard
      as="section"
      aria-label="Aktivitas menulis"
      visitKey="jurnal-aktivitas"
      className="rounded-lg border border-border bg-surface-primary p-4"
    >
      {/* Dilipat secara default (audit UX density v2.37, P1): pemicu
          selalu menampilkan judul + ringkasan satu baris; kalender,
          distribusi folder, dan mood dibuka hanya bila dibutuhkan.
          Dipaksa tetap terbuka selama filter tanggal aktif supaya chip
          penghapus filter tidak tersembunyi. */}
      {/* v2.49 (audit): dipaksa terbuka juga saat filter PEKAN aktif —
          tanpa ini chip penghapus filter pekan bisa tersembunyi sementara
          daftar catatan tetap terfilter (indikator tak terlihat). */}
      <Collapsible
        open={activityOpen || dayFilter !== null || weekFilter !== null}
        onOpenChange={setActivityOpen}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="interactive group flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="min-w-0">
              <span className="block text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
                Aktivitas Menulis
              </span>
              <span className="mt-0.5 block truncate text-meta font-medium text-content-muted">
                {summaryLine}
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-content-muted transition-transform duration-300 group-data-[state=open]:rotate-180"
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          {/* Mode baca (review v2.44): kalender jumlah catatan / volume
              kata per pekan — jumlah catatan ≠ produktivitas menulis.
              Audit v2.47 (3-d): h-6.5 (26px) → h-9 (36px) — target sentuh
              nyaman; lebar pill tidak berubah. */}
          <div
            role="group"
            aria-label="Mode aktivitas menulis"
            className="flex justify-end"
          >
            <div className="flex gap-1 rounded-full bg-surface-sunken p-0.5">
              {(['kalender', 'kata'] as const).map((v) => {
                const on = view === v
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    aria-pressed={on}
                    className={
                      'interactive h-9 cursor-pointer rounded-full px-3 text-eyebrow font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
                      (on
                        ? 'bg-surface-inverse text-content-inverse shadow-soft'
                        : 'text-content-secondary hover:text-content-primary')
                    }
                  >
                    {v === 'kalender' ? 'Kalender' : 'Jumlah Kata'}
                  </button>
                )
              })}
            </div>
          </div>

          {view === 'kalender' ? (
          <>
          {/* Navigasi bulan — ikut terlipat bersama kalendernya. Audit
              v2.47 (3-d): h-8 w-8 (32px) → h-9 w-9 (36px) — target sentuh;
              label bulan tetap muat di 320px. */}
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              aria-label="Bulan sebelumnya"
              onClick={() => {
                const [y, mo] = viewYm.split('-').map(Number)
                const prev = mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`
                setViewYm(prev)
              }}
              className="interactive flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-content-muted hover:bg-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="min-w-[118px] text-center text-eyebrow font-semibold uppercase tracking-[0.14em] tabular-nums text-content-muted">
              {monthLabel}
            </span>
            <button
              type="button"
              aria-label="Bulan berikutnya"
              disabled={!canNext}
              onClick={() => {
                const [y, mo] = viewYm.split('-').map(Number)
                const next = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`
                setViewYm(next)
              }}
              className="interactive flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-content-muted hover:bg-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Kalender mini — intensitas = jumlah catatan; ketuk untuk filter. */}
          <div
            className="mt-3 grid grid-cols-7 gap-1.5"
            role="group"
            aria-label={`Kalender aktivitas menulis ${monthLabel}: ${monthNotes} catatan pada ${monthCount} hari`}
          >
            {cells.map((iso, i) => {
              if (iso == null) return <span key={`pad-${i}`} aria-hidden="true" />
              const count = byDate.get(iso) ?? 0
              const level = writeLevelOf(count)
              const isFuture = iso > today
              const isSel = dayFilter === iso
              const d = Number(iso.slice(8))
              return (
                <button
                  key={iso}
                  type="button"
                  aria-pressed={isSel}
                  aria-label={
                    isFuture
                      ? `${d} — belum terjadi`
                      : `${d} ${MONTHS_ID_FULL[Number(iso.slice(5, 7)) - 1]} — ${
                          count === 0 ? 'tidak ada catatan' : `${count} catatan`
                        }`
                  }
                  onClick={() => onPickDay(isSel ? null : iso)}
                  className={
                    /* Audit v2.47 (3-d) & v2.66: h-9 (36px) target sentuh
                        sel kalender + label kini text-meta (12px, bukan
                        10px) — kontrol interaktif minimal 12px. */
                    'interactive h-9 w-full cursor-pointer rounded-[5px] text-meta font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ' +
                    (isSel
                      ? 'ring-2 ring-primary ring-offset-1 ring-offset-surface-primary '
                      : iso === today
                        ? 'ring-1 ring-module-accent/40 '
                        : '') +
                    (isFuture
                      ? 'text-content-muted/50'
                      : count > 0
                        ? 'text-content-primary'
                        : 'text-content-muted') +
                    (count === 1 ? ' ' : ' tabular-nums')
                  }
                  style={{
                    backgroundColor: isFuture ? undefined : WRITE_LEVELS[level],
                  }}
                >
                  {d}
                </button>
              )
            })}
          </div>
          </>
          ) : (
            (() => {
              /* Mode kata — 4 batang kata per pekan; pekan berjalan
                 dihitung sampai hari ini saja. */
              const max = Math.max(...wordWeeks.map((w) => w.words), 0)
              if (max <= 0) {
                return (
                  <p className="mt-3 rounded-lg bg-surface-sunken px-3.5 py-3 text-meta leading-relaxed text-content-muted">
                    Belum ada tulisan ber-tanggal dalam 4 pekan terakhir —
                    jumlah kata dihitung dari isi catatan tersimpan.
                  </p>
                )
              }
              return (
                <div className="mt-3">
                  <div
                    className="flex h-24 gap-1.5"
                    role="group"
                    aria-label={`Jumlah kata per pekan: ${wordWeeks
                      .map(
                        (w, i) =>
                          `${
                            i === wordWeeks.length - 1
                              ? 'pekan ini'
                              : /* v2.45 (audit J7): tanggal pendek yang
                                   terbaca — bukan ISO mentah. */
                                `pekan ${shortDateLabel(w.start)}`
                          } ${w.words} kata di ${w.days} hari aktif`,
                      )
                      .join(', ')}`}
                  >
                    {wordWeeks.map((w, i) => {
                      const isCurrent = i === wordWeeks.length - 1
                      /* Audit v2.47 (3-d): cabang mati `w.words <= 0 ? 4`
                         dihapus — pekan tanpa kata merender InkDot di bawah,
                         bukan sapuan; max > 0 terjamin early-return atas. */
                      const h = Math.max(10, Math.round((w.words / max) * 100))
                      const isSel = weekFilter === w.start
                      return (
                        <button
                          key={w.start}
                          type="button"
                          /* v2.45 (review — J4): batang bisa dibedah — ketuk
                             memfilter daftar catatan ke rentang pekan itu
                             (ketuk ulang untuk melepas). */
                          aria-pressed={isSel}
                          aria-label={`Pekan ${shortDateLabel(w.start)} — ${w.words} kata di ${w.days} hari aktif${isSel ? ', filter aktif' : ''}`}
                          onClick={() =>
                            onPickWeek(isSel ? null : w.start)
                          }
                          className={
                            'group flex h-full min-w-0 flex-1 cursor-pointer flex-col gap-1 rounded-lg p-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
                            (isSel ? 'bg-module-accent/10' : 'hover:bg-surface-sunken/70')
                          }
                        >
                          {/* v2.47 (Quiet Atelier): sapuan tinta menggantikan
                              batang polos — tinggi luar tetap = tinggi nilai;
                              pekan tanpa kata menjadi titik tinta kecil.
                              min-h-0 menjaga area isi patuh pada baris h-24
                              (flex item boleh menyusut di bawah kontennya). */}
                          <div className="flex min-h-0 w-full flex-1 items-end">
                            {w.words <= 0 ? (
                              <InkDot delay={i * motionTokens.stagger.normal} />
                            ) : (
                              <InkStroke
                                heightPct={h}
                                isCurrent={isCurrent}
                                /* Gradasi usia: pekan lampau makin tua makin
                                   pudar (≥50%); pekan berjalan tinta penuh. */
                                ageOpacity={Math.min(0.75, 0.5 + 0.125 * i)}
                                selected={isSel}
                                delay={i * motionTokens.stagger.normal}
                              />
                            )}
                          </div>
                          <span
                            className={
                              'text-center text-chart-label font-semibold ' +
                              (isCurrent
                                ? 'text-module-accent-strong'
                                : 'text-content-muted')
                            }
                          >
                            {isCurrent ? 'ini' : `P${i + 1}`}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {/* Audit v2.47 (3-d): angka kata PERSIS per pekan
                      ("1.234", bukan "1,2 rb") — sapuan tinta adalah
                      hero mode 'kata'; deret angka utama tidak boleh
                      membulatkan nilai. */}
                  <p className="mt-1.5 text-chart-label tabular-nums text-content-muted">
                    {wordWeeks
                      .map(
                        (w, i) =>
                          `${i === wordWeeks.length - 1 ? 'ini' : `P${i + 1}`} ${w.words.toLocaleString('id-ID')}`,
                      )
                      .join(' · ')}{' '}
                    kata
                  </p>
                  <p className="mt-1 text-meta text-content-muted">
                    {totalWords.toLocaleString('id-ID')} kata · {activeWriteDays} hari aktif
                    menulis · rata² {avgWordsPerDay.toLocaleString('id-ID')} kata/hari
                  </p>
                </div>
              )
            })()
          )}

          {/* Distribusi folder — segmented bar kecil + label jumlah. */}
          {totalNotes > 0 && (
            <div className="mt-3.5">
              <div
                className="flex h-1.5 overflow-hidden rounded-full bg-surface-sunken"
                role="img"
                aria-label={`Distribusi folder: ${folderSegs
                  .map((f) => `${f.label} ${f.count}`)
                  .join(', ')}`}
              >
                {folderSegs.map(
                  (f) =>
                    f.count > 0 && (
                      <span
                        key={f.key}
                        className={f.seg}
                        style={{ width: `${(f.count / totalNotes) * 100}%` }}
                      />
                    ),
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                {folderSegs.map(
                  (f) =>
                    f.count > 0 && (
                      <span
                        key={f.key}
                        className="flex items-center gap-1 text-chart-label font-medium text-content-muted"
                      >
                        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${f.seg}`} />
                        {f.label.split(' ')[0]} {f.count}
                      </span>
                    ),
                )}
              </div>
            </div>
          )}

          {/* Ringkasan mood — roda distribusi (v2.47 Quiet Atelier):
              arc ∝ jumlah/total, warna mengacu MOOD_DOT; angka N× tetap
              dibawa legenda teks. Hanya mood yang benar-benar tercatat.
              Arc mood yang sedang difilter tersorot halus di roda. */}
          {moodCounts.length > 0 && (
            <div className="mt-2.5">
              <div className="flex items-center gap-4">
                <MoodWheel counts={moodCounts} selectedMood={selectedMood} />
                <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-chart-label font-medium text-content-muted">
                  {moodCounts.map(([mood, n]) => (
                    <span key={mood} className="flex items-center gap-1">
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full ${MOOD_DOT[mood] ?? 'bg-cocoa/40'}`}
                      />
                      {mood} {n}×
                    </span>
                  ))}
                </p>
              </div>
            </div>
          )}

          {dayFilter && (
            <button
              type="button"
              onClick={() => onPickDay(null)}
              className="interactive mt-3 flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border px-3.5 text-meta font-semibold text-content-secondary hover:bg-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Filter aktif: {noteDateLabel({ id: 'x', date: dayFilter } as Note, today)}
              <span aria-hidden="true">✕</span>
              <span className="sr-only">Hapus filter tanggal</span>
            </button>
          )}

          {/* v2.45 (review — J4): chip penghapus filter pekan (dari batang
              kata) — pekan Senin–Minggu, label pendek terbaca. */}
          {weekFilter && (
            <button
              type="button"
              onClick={() => onPickWeek(null)}
              className="interactive mt-3 ml-2 flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border px-3.5 text-meta font-semibold text-content-secondary hover:bg-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Filter pekan: {shortDateLabel(weekFilter)}–
              {shortDateLabel(addDaysISO(weekFilter, 6))} ·{' '}
              {/* Audit v2.47 (3-d): chip membawa jumlah kata PERSIS
                  pekan terpilih — nilai sama dengan batangnya. */}
              {selWeekWords.toLocaleString('id-ID')} kata
              <span aria-hidden="true">✕</span>
              <span className="sr-only">Hapus filter pekan</span>
            </button>
          )}
        </CollapsibleContent>
      </Collapsible>
    </MotionCard>
  )
}

const FILTERS: { key: FolderKey | 'semua'; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  ...FOLDERS.map((f) => ({ key: f.key, label: FOLDER_SHORT[f.key] })),
]

/* ===== Pagar densitas daftar catatan (audit UX density v2.37, P1) =====
   Gulir awal layar Jurnal dibuat ringkas: maksimum 3 sematan + 3 draf,
   lalu "Catatan lain" mengisi sisa hingga total 10 kartu. Setiap seksi
   yang terpangkas memuat bertahap: +5 (sematan/draf), +10 (lainnya).
   Pagar hanya hidup di kondisi awal — pencarian atau filter aktif adalah
   permintaan eksplisit pengguna, semua hasil langsung tampil penuh. */
const PINNED_CAP = 3
const DRAFT_CAP = 3
const LIST_TOTAL_CAP = 10
const SECTION_STEP = 5
const REST_STEP = 10

export default function JournalScreen() {
  const [query, setQuery] = useState('')
  /* v2.36: filter tanggal dari kalender aktivitas menulis — null = semua. */
  const [dayFilter, setDayFilter] = useState<string | null>(null)
  /* v2.45 (review — J4): filter rentang PEKAN dari batang kata — Senin
     s.d. Minggu pekan terpilih. */
  const [weekFilter, setWeekFilter] = useState<string | null>(null)
  const weekEnd = weekFilter ? addDaysISO(weekFilter, 6) : null
  /* Filter mood (review UI/UX v2.44 Tahap 2) — null = semua mood;
     hanya mood yang benar-benar tercatat pada catatan hidup. */
  const [moodFilter, setMoodFilter] = useState<string | null>(null)
  /* v2.83 (audit UX §E): deret chip folder tidak lagi permanen — SATU
     tombol Filter membuka panel (folder + suasana); filter aktif tampil
     sebagai chip yang bisa dilepas. Pencarian tetap tersedia. */
  const [filterOpen, setFilterOpen] = useState(false)
  /* Filter suasana tersembunyi secara default (v2.61) — di dalam panel
     filter; chip mood dibuka lewat pemicu "Suasana". */
  const [moodPickerOpen, setMoodPickerOpen] = useState(false)
  const notes = useRutina((s) => s.notes)
  const journalFilter = useRutina((s) => s.journalFilter)
  const setJournalFilter = useRutina((s) => s.setJournalFilter)
  const togglePin = useRutina((s) => s.togglePin)
  const openReading = useRutina((s) => s.openReading)
  const noteMoods = useJournalUi((s) => s.noteMoods)
  const openCanvas = useJournalUi((s) => s.openCanvas)

  /* Opsi mood dari catatan yang masih hidup — pasangan [mood, jumlah]
     (helper bersama liveMoodCounts, audit v2.49). */
  const moodOptions = useMemo(
    () => liveMoodCounts(notes, noteMoods),
    [notes, noteMoods],
  )

  /* Pulihkan metadata suasana hati tersimpan (pola skipHydration —
     dipanggil pasca-mount agar tidak ada hydration mismatch). */
  useEffect(() => {
    void useJournalUi.persist.rehydrate()
  }, [])

  const total = notes.length
  /* Hari ini sudah tercatat? — penggoda menulis di bawah hanya hidup
      bila pengguna PERNAH menulis tapi hari ini belum (bukan duplikasi
      CTA atas: ini penanda status harian yang pamit setelah catatan
      pertama hari ini lahir). */
  const todayHasNote = notes.some((n) => noteDateISO(n) === todayISO())
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
        (dayFilter === null || noteDateISO(n) === dayFilter) &&
        (weekFilter === null ||
          (() => {
            const iso = noteDateISO(n)
            return iso != null && iso >= weekFilter && iso <= weekEnd!
          })()) &&
        (moodFilter === null || noteMoods[n.id] === moodFilter) &&
        (q === '' ||
          (n.title + ' ' + n.body).toLowerCase().includes(q)),
    )
    return {
      pinned: filtered.filter((n) => n.pinned),
      drafts: filtered.filter((n) => !n.pinned && isDraftNote(n)),
      rest: filtered.filter((n) => !n.pinned && !isDraftNote(n)),
    }
  }, [notes, journalFilter, query, dayFilter, weekFilter, weekEnd, moodFilter, noteMoods])

  /* v2.37 P1: pagar densitas hanya hidup di kondisi awal (tanpa pencarian,
     tanpa filter folder/tanggal/mood) — total kartu awal maksimal 10.
     Pencarian atau filter aktif melonggarkan pagar: seluruh hasil tampil. */
  const fenceRelaxed =
    query.trim() !== '' ||
    journalFilter !== 'semua' ||
    dayFilter !== null ||
    weekFilter !== null ||
    moodFilter !== null
  const pinnedLimit = fenceRelaxed ? undefined : Math.min(pinned.length, PINNED_CAP)
  const draftsLimit = fenceRelaxed ? undefined : Math.min(drafts.length, DRAFT_CAP)
  const restLimit = fenceRelaxed
    ? undefined
    : Math.max(
        0,
        LIST_TOTAL_CAP -
          Math.min(pinned.length, PINNED_CAP) -
          Math.min(drafts.length, DRAFT_CAP),
      )

  /* v2.35 anti-replay: pembuka Writing Room hanya kunjungan pertama —
     remount antar-tab tampil instan, transisi layar ringan mengambil alih. */
  const playEntrance = useFirstVisit('journal-writing')

  return (
    <SmoothScrollArea
      data-module="journal"
      data-layout="writing-room"
      /* v2.33 Writing Room: lebar kanvas mengikuti token layout grammar
         (--layout-content-max, 720px — v2.35), ritme antar-blok memakai
         token layout-gap (bukan mt-4 ad-hoc).
         v2.87: gulir halus Lenis per-wadah + ScrollTrigger. */
      className="mx-auto w-full max-w-[var(--layout-content-max)] overscroll-contain"
      contentClassName="px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] text-content-primary [&>*+*]:mt-[var(--layout-gap)]"
    >
      {/* Judul layar untuk pembaca layar — satu-satunya layar tanpa h1;
         kepala editorial visual tetap dipimpin RutinaSectionHeader. */}
      <h1 className="sr-only">Jurnal</h1>
      {/* Kepala editorial tenang — tanggal kecil kapital + judul seksi */}
      <m.header
        initial={playEntrance ? { opacity: 0, y: 12 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={motionTokens.preset.panelReveal}
      >
        <RutinaSectionHeader
          eyebrow={longDateLabel(todayISO())}
          title="Jurnal"
          description={summary}
          accent
          reveal
          visitKey="jurnal-title"
        />
      </m.header>

      {/* Ajakan menulis — pintu utama ke kanvas menulis */}
      <m.button
        type="button"
        onClick={() => openCanvas()}
        whileTap={{ scale: 0.97 }}
        initial={playEntrance ? { opacity: 0, y: 12 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          ...motionTokens.preset.panelReveal,
          delay: motionTokens.delay.tight,
        }}
        className="interactive mt-4 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary text-section font-bold text-primary-foreground shadow-soft hover:bg-action-hover"
      >
        <PenLine className="h-[18px] w-[18px]" strokeWidth={2.4} />
        Tulis catatan
      </m.button>

      {/* Bilah pencarian + Filter — MENEMPEL di tepi atas agar pencarian
          selalu mudah dijangkau (v2.83, audit UX §E: pencarian TETAP
          tersedia; filter folder/suasana/tanggal/pekan kini di balik SATU
          tombol Filter — bukan deret chip permanen; filter aktif tampil
          sebagai chip yang bisa dilepas). Latar solid parchment. */}
      <div className="sticky top-0 z-30 -mx-4 mt-4 border-b border-border-default bg-surface-primary px-4 pb-2.5 pt-2">
        <div className="flex gap-2">
          <m.div
            initial={playEntrance ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              ...motionTokens.preset.data,
              delay: motionTokens.delay.normal,
            }}
            className="relative min-w-0 flex-1"
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
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
            aria-controls="jurnal-filter"
            className="interactive flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface-primary px-3.5 text-meta font-bold text-content-secondary shadow-soft transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <SlidersHorizontal
              className="h-3.5 w-3.5"
              aria-hidden="true"
              strokeWidth={2.2}
            />
            Filter
            {(journalFilter !== 'semua' ||
              moodFilter != null ||
              dayFilter != null ||
              weekFilter != null) && (
              <span className="rounded-full bg-primary px-1.5 text-chart-label font-bold tabular-nums text-primary-foreground">
                {(journalFilter !== 'semua' ? 1 : 0) +
                  (moodFilter != null ? 1 : 0) +
                  (dayFilter != null ? 1 : 0) +
                  (weekFilter != null ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Chip aktif yang bisa dilepas — selalu terlihat walau panel
            tertutup: status saringan tidak pernah tersembunyi. */}
        {(journalFilter !== 'semua' ||
          moodFilter != null ||
          dayFilter != null ||
          weekFilter != null) && (
          <div
            role="group"
            aria-label="Saringan aktif"
            className="mt-2 flex flex-wrap gap-1.5"
          >
            {journalFilter !== 'semua' && (
              <button
                type="button"
                onClick={() => setJournalFilter('semua')}
                aria-label={`Lepas saringan folder ${
                  FILTERS.find((f) => f.key === journalFilter)?.label ?? ''
                }`}
                className="interactive flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-module-accent/35 bg-module-accent/15 px-3 text-meta font-bold text-module-accent-strong transition-colors hover:bg-module-accent/25"
              >
                {FILTERS.find((f) => f.key === journalFilter)?.label}
                <X className="h-3 w-3" aria-hidden="true" strokeWidth={2.4} />
              </button>
            )}
            {moodFilter != null && (
              <button
                type="button"
                onClick={() => setMoodFilter(null)}
                aria-label={`Lepas saringan suasana ${moodFilter}`}
                className="interactive flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-module-accent/35 bg-module-accent/15 px-3 text-meta font-bold text-module-accent-strong transition-colors hover:bg-module-accent/25"
              >
                {moodFilter}
                <X className="h-3 w-3" aria-hidden="true" strokeWidth={2.4} />
              </button>
            )}
            {dayFilter != null && (
              <button
                type="button"
                onClick={() => setDayFilter(null)}
                aria-label={`Lepas saringan tanggal ${shortDateLabel(dayFilter)}`}
                className="interactive flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-module-accent/35 bg-module-accent/15 px-3 text-meta font-bold text-module-accent-strong transition-colors hover:bg-module-accent/25"
              >
                {shortDateLabel(dayFilter)}
                <X className="h-3 w-3" aria-hidden="true" strokeWidth={2.4} />
              </button>
            )}
            {weekFilter != null && (
              <button
                type="button"
                onClick={() => setWeekFilter(null)}
                aria-label="Lepas saringan rentang pekan"
                className="interactive flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-module-accent/35 bg-module-accent/15 px-3 text-meta font-bold text-module-accent-strong transition-colors hover:bg-module-accent/25"
              >
                Pekan {shortDateLabel(weekFilter)}
                <X className="h-3 w-3" aria-hidden="true" strokeWidth={2.4} />
              </button>
            )}
          </div>
        )}

        {/* Panel filter — dibuka lewat tombol Filter: folder, suasana. */}
        {filterOpen && (
          <div id="jurnal-filter" className="mt-2.5">
            {/* Chip filter kategori + jumlah catatan nyata */}
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
              {moodOptions.length > 0 && (
                <button
                  type="button"
                  aria-pressed={moodPickerOpen}
                  aria-expanded={moodPickerOpen}
                  onClick={() => setMoodPickerOpen((v) => !v)}
                  className={
                    'interactive h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-meta font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
                    (moodPickerOpen || moodFilter != null
                      ? 'border border-module-accent/35 bg-module-accent/15 text-module-accent-strong'
                      : 'border border-border bg-surface-primary text-content-secondary hover:bg-secondary')
                  }
                >
                  <Smile
                    className="mr-1 inline h-3.5 w-3.5"
                    aria-hidden="true"
                    strokeWidth={2.2}
                  />
                  Suasana
                  {moodFilter != null && (
                    <span className="ml-1.5 opacity-70">· {moodFilter}</span>
                  )}
                </button>
              )}
            </div>

            {/* v2.61 (audit Tahap 2): chip mood — filter sekunder di dalam
                panel, dibuka lewat pemicu "Suasana". */}
            {moodPickerOpen && moodOptions.length > 0 && (
              <div
                role="group"
                aria-label="Filter suasana hati catatan"
                className="mt-2 flex gap-2 overflow-x-auto no-scrollbar pb-0.5"
              >
                {moodOptions.map(([mood, n]) => {
                  const active = moodFilter === mood
                  return (
                    <button
                      key={mood}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setMoodFilter(active ? null : mood)}
                      className={
                        'interactive h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-meta font-bold ' +
                        (active
                          ? 'border border-module-accent/35 bg-module-accent/15 text-module-accent-strong'
                          : 'border border-border bg-surface-primary text-content-secondary hover:bg-secondary')
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                          MOOD_DOT[mood] ?? 'bg-cocoa/40'
                        }`}
                      />
                      {mood}
                      <span className="ml-1.5 tabular-nums opacity-60">{n}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Penggoda hari ini (aset 18 — buku terbuka) — muncul hanya bila
          sudah pernah menulis tapi hari ini belum; ketuk untuk membuka
          kanvas menulis. */}
      {total > 0 && !todayHasNote && (
        <m.button
          type="button"
          onClick={() => openCanvas()}
          whileTap={{ scale: 0.98 }}
          initial={playEntrance ? { opacity: 0, y: 10 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            ...motionTokens.preset.panelReveal,
            delay: motionTokens.delay.tight,
          }}
          className="interactive mt-4 flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border border-module-accent/25 bg-module-accent-soft/40 p-3.5 text-left hover:bg-module-accent-soft/70"
        >
          <RutinaIllustration
            name="18-journal-open-notebook"
            size={128}
            className="size-12 shrink-0"
          />
          <span className="min-w-0">
            <span className="block text-body font-semibold text-content-primary">
              Hari ini belum ada catatan
            </span>
            <span className="mt-0.5 block text-meta font-medium leading-snug text-content-muted">
              Satu kalimat pun berarti — buka halaman barumu.
            </span>
          </span>
        </m.button>
      )}

      {/* Aktivitas menulis — jejak bulanan + distribusi (audit v2.36
          Tahap 4); hanya muncul bila sudah ada catatan. Dilipat secara
          default dengan ringkasan di pemicu (audit densitas v2.37 P1).
          Kanvas menulis tetap bebas gangguan — visual hanya hidup di
          daftar. */}
      {total > 0 && (
        <WritingActivityCard
          notes={notes}
          noteMoods={noteMoods}
          dayFilter={dayFilter}
          weekFilter={weekFilter}
          onPickWeek={setWeekFilter}
          onPickDay={setDayFilter}
          selectedMood={moodFilter}
        />
      )}

      {/* Daftar catatan — hierarki tenang: sematan, lalu draf yang belum
          diberi nama, lalu catatan tersimpan. Pagar densitas v2.37:
          kondisi awal ringkas (total ≤ 10 kartu), muat bertahap per
          seksi; key NoteList mengikuti mode pagar agar batas internal
          ter-reset saat kembali dari pencarian/filter. */}
      <section className="mt-6" aria-label="Daftar catatan jurnal">
        {pinned.length > 0 && (
          <div className="mt-2 first:mt-0">
            <SectionLabel>Disematkan · {pinned.length}</SectionLabel>
            <NoteList
              key={fenceRelaxed ? 'bebas' : 'pagar'}
              items={pinned}
              noteMoods={noteMoods}
              onOpen={openReading}
              onEdit={openCanvas}
              onTogglePin={togglePin}
              initialLimit={pinnedLimit}
              step={SECTION_STEP}
            />
          </div>
        )}
        {drafts.length > 0 && (
          <div className="mt-6 first:mt-0">
            <SectionLabel>Draf · {drafts.length}</SectionLabel>
            <NoteList
              key={fenceRelaxed ? 'bebas' : 'pagar'}
              items={drafts}
              noteMoods={noteMoods}
              onOpen={openReading}
              onEdit={openCanvas}
              onTogglePin={togglePin}
              initialLimit={draftsLimit}
              step={SECTION_STEP}
            />
          </div>
        )}
        {rest.length > 0 && (
          <div className="mt-6 first:mt-0">
            <SectionLabel>
              {pinned.length > 0 || drafts.length > 0 ? 'Catatan lain' : 'Catatan'} ·{' '}
              {rest.length}
            </SectionLabel>
            {/* Pagar densitas v2.37: mengisi sisa kuota total 10 kartu
                awal; muat bertahap +10 per ketukan. */}
            <NoteList
              key={fenceRelaxed ? 'bebas' : 'pagar'}
              items={rest}
              noteMoods={noteMoods}
              onOpen={openReading}
              onEdit={openCanvas}
              onTogglePin={togglePin}
              initialLimit={restLimit}
              step={REST_STEP}
            />
          </div>
        )}

        {pinned.length === 0 && drafts.length === 0 && rest.length === 0 && (
          <>
            {total === 0 ? (
              <RutinaEmptyState
                image="19-journal-ink-and-pen"
                title="Belum ada catatan"
                description="Mulailah dengan satu kalimat jujur — cukup tulis apa yang ada di pikiranmu."
                action={
                  <m.button
                    type="button"
                    onClick={() => openCanvas()}
                    whileTap={{ scale: 0.96 }}
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
                      whileTap={{ scale: 0.96 }}
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
    </SmoothScrollArea>
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
   *  tanpa batas = semua item tampil (hasil pencarian/filter, v2.37). */
  initialLimit?: number
  /** Loncatan muat bertahap per ketukan tombol (audit densitas v2.37) —
   *  default mengikuti initialLimit; tanpa keduanya semua sisa dimuat. */
  step?: number
}

function NoteList({
  items,
  noteMoods,
  onOpen,
  onEdit,
  onTogglePin,
  initialLimit,
  step,
}: NoteListProps) {
  /* v2.37: batas diturunkan (bukan state awal mentah) — daftar tanpa
     pagar (hasil pencarian/filter) selalu tampil penuh walau items
     berubah; extra hanya bertambah lewat tombol muat bertahap. */
  const [extra, setExtra] = useState(0)
  const limit = initialLimit === undefined ? items.length : initialLimit + extra
  const visible = items.slice(0, limit)
  const hidden = items.length - visible.length
  const inc = step ?? initialLimit ?? hidden
  /* v2.35 anti-replay: deretan kartu naik beruntun hanya pada kunjungan
     pertama; remount/filter tampil instan. "Muat lagi" menambah kartu TANPA
     mengulang entrance karena wadah tidak berganti (state extra, bukan key
     — key hanya berganti saat mode pagar/pencarian beralih, v2.37). */
  const playEntrance = useFirstVisit('journal-notes')
  return (
    <m.div
      variants={journalList}
      initial={playEntrance ? 'hidden' : 'show'}
      animate="show"
      /* Semantik daftar — pembaca layar mengumumkan jumlah item & memungkinkan
         navigasi penuh daftar; tiap kartu jadi listitem (lihat NoteCard). */
      role="list"
      /* v2.61 (audit Tahap 2): DAFTAR KERTAS — SATU permukaan kertas per
         kelompok dengan pembatas hairline antar catatan; bukan tumpukan
         kartu berbingkai-berbayang per catatan (aturan global sprint). */
      className="divide-y divide-border/60 rounded-2xl border border-border bg-surface-primary px-1 shadow-soft"
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
        /* Pembungkus presentasional — tombol tetap dapat diakses namun
           tidak dihitung sebagai butir daftar catatan. */
        <div role="presentation" className="px-3 py-2.5">
          <button
            type="button"
            onClick={() => setExtra((e) => e + inc)}
            className="interactive w-full cursor-pointer rounded-full border border-border bg-surface-primary py-2.5 text-meta font-semibold text-content-secondary hover:bg-surface-sunken hover:text-content-primary"
          >
            Tampilkan {Math.min(inc, hidden)} catatan lagi
            {hidden > inc ? ` (${hidden} tersisa)` : ''}
          </button>
        </div>
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
      /* Butir daftar catatan (padanan role=list di NoteList) — semantik
         listitem memberi pembaca layar posisi & jumlah di daftar. */
      role="listitem"
      /* Tanpa whileTap pada article: Motion menyuntikkan tabindex pada
         elemen non-interaktif — umpan balik ketuk hidup di tombol buka. */
      /* v2.61: baris kertas — tanpa bingkai/bayangan sendiri (permukaan
         & pembatas hairline datang dari daftar); sematan ditandai sorot
         emas tipis di sisi kiri baris (subtil, bukan blok). */
      className={
        'relative px-3.5 py-3.5 transition-colors duration-200 hover:bg-surface-sunken/40 ' +
        (note.pinned ? 'shadow-[inset_3px_0_0_0_var(--palette-gold)]' : '')
      }
    >
      {/* A11Y: tombol "baca catatan" absolut inset-0 (z-0) di bawah konten;
          tombol aksi relative z-10 — dua kontrol bersaudara tanpa tombol
          dalam tombol. Konten pointer-events-none agar sentuhan jatuh ke
          tombol buka. */}
      <button
        type="button"
        aria-label={`Baca catatan: ${note.title || firstLine || 'tanpa judul'}`}
        onClick={onOpen}
        className="interactive absolute inset-0 z-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary"
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
              {/* v2.45 (audit J8): konsisten — di mana-mana "draf". */}
              Draf
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
            {/* v2.36: label diturunkan dari tanggal ISO — "Hari ini"/
                "Kemarin"/"5 Jan"; catatan lawas tanpa tanggal pasti
                jujur ditandai "Tanpa tanggal". */}
            {noteDateLabel(note)}
          </span>
        </div>
      </div>
    </m.article>
  )
}
