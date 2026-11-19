'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  useDragControls,
} from 'motion/react'
import * as m from 'motion/react-m'
import {
  Archive,
  ArchiveRestore,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Link2,
  Minus,
  Plus,
  Snowflake,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { motionTokens } from '@/lib/motion/tokens'
import { fade, sheetSpring } from '@/lib/motion/transitions'
import { CONTENT_W } from './layout-widths'
import {
  addDaysISO,
  HABIT_CATS,
  scheduledOn,
  shortDateLabel,
  todayISO,
  useRutina,
  WEEKDAY_MIN,
  type HabitCat,
  type HabitInput,
} from './store'
import { useFocusTrap } from './use-focus-trap'

/** Urutan tampil hari: Senin → Minggu. */
const DISPLAY_DAYS = [1, 2, 3, 4, 5, 6, 0]

type Draft = HabitInput

const EMPTY_DRAFT: Draft = {
  title: '',
  desc: '',
  cat: 'Kebiasaan',
  schedule: [0, 1, 2, 3, 4, 5, 6],
  weeklyTarget: 7,
  reminder: null,
  restDays: [],
  afterId: null,
  mini: '',
}

/**
 * Lembar kelola kebiasaan — tambah & sunting lengkap:
 * nama, deskripsi, kategori, jadwal berulang, target pekanan,
 * pengingat, arsip, dan hapus. Fokus terkurung (focus trap),
 * Esc untuk menutup, dan seret ke bawah untuk menutup.
 */
export function HabitSheet() {
  const mode = useRutina((s) => s.habitSheetMode)
  const habitId = useRutina((s) => s.habitSheetId)
  const habits = useRutina((s) => s.habits)
  const addHabit = useRutina((s) => s.addHabit)
  const updateHabit = useRutina((s) => s.updateHabit)
  const setHabitArchived = useRutina((s) => s.setHabitArchived)
  const deleteHabit = useRutina((s) => s.deleteHabit)
  const scheduleRestDay = useRutina((s) => s.scheduleRestDay)
  const cancelRestDay = useRutina((s) => s.cancelRestDay)
  const closeHabitSheet = useRutina((s) => s.closeHabitSheet)

  const open = mode !== 'closed'
  const editing = mode === 'edit' ? habits.find((h) => h.id === habitId) : null

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [reminderOn, setReminderOn] = useState(false)
  const [prevKey, setPrevKey] = useState('')
  /* Pemilih pemicu "Susun Kebiasaan" — panel kandidat dibuka manual lewat
     "Ubah"; kueri cari menyaring daftar yang panjang. */
  const [pickTriggerOpen, setPickTriggerOpen] = useState(false)
  const [triggerQuery, setTriggerQuery] = useState('')
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(open, panelRef)

  /* Muat draf setiap kali lembar dibuka / berganti target.
     Pola "sesuaikan state saat render" — sama dengan ComposeSheet. */
  const openKey = open ? `${mode}:${habitId ?? ''}` : 'closed'
  if (openKey !== prevKey) {
    setPrevKey(openKey)
    setPickTriggerOpen(false)
    setTriggerQuery('')
    if (open) {
      if (editing) {
        setDraft({
          title: editing.title,
          desc: editing.desc,
          cat: editing.cat,
          schedule: editing.schedule.length
            ? [...editing.schedule]
            : [0, 1, 2, 3, 4, 5, 6],
          weeklyTarget: editing.weeklyTarget,
          reminder: editing.reminder,
          restDays: [...(editing.restDays ?? [])],
          afterId: editing.afterId ?? null,
          mini: editing.mini ?? '',
        })
        setReminderOn(Boolean(editing.reminder))
      } else {
        setDraft(EMPTY_DRAFT)
        setReminderOn(false)
      }
    }
  }

  /* Tutup dengan Escape */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeHabitSheet()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeHabitSheet])

  const maxTarget = draft.schedule.length || 7

  const toggleDay = (d: number) => {
    setDraft((prev) => {
      const has = prev.schedule.includes(d)
      const next = has
        ? prev.schedule.filter((x) => x !== d)
        : [...prev.schedule, d]
      if (next.length === 0) return prev /* minimal satu hari */
      const target = Math.min(prev.weeklyTarget, next.length)
      return { ...prev, schedule: next, weeklyTarget: target }
    })
  }

  const setPreset = (days: number[]) => {
    setDraft((prev) => ({
      ...prev,
      schedule: days,
      weeklyTarget: Math.min(prev.weeklyTarget, days.length),
    }))
  }

  /* Susun Kebiasaan — kandidat pemicu: kebiasaan aktif lain, kecuali
     kebiasaan yang sedang disunting (tidak menumpuk pada dirinya sendiri). */
  const stackCandidates = habits.filter(
    (x) => !x.archived && x.id !== editing?.id,
  )
  const triggerTitle = draft.afterId
    ? (habits.find((x) => x.id === draft.afterId)?.title ?? null)
    : null
  /* Kandidat yang cocok dengan kueri cari — dipakai daftar pemicu. */
  const triggerQueryQ = triggerQuery.trim().toLowerCase()
  const filteredCandidates = stackCandidates.filter((x) =>
    x.title.toLowerCase().includes(triggerQueryQ),
  )

  /* Jeda Runtun Aman — 14 hari ke depan yang terjadwal saja. */
  const today = todayISO()
  const restDayOptions: string[] = []
  if (mode === 'edit' && editing) {
    for (let i = 1; i <= 14; i++) {
      const iso = addDaysISO(today, i)
      if (scheduledOn(editing, iso)) restDayOptions.push(iso)
    }
  }
  const upcomingRestDays = [...(editing?.restDays ?? [])]
    .filter((d) => d > today)
    .sort()

  const submit = () => {
    const title = draft.title.trim()
    if (!title) {
      toast.warning('Nama kebiasaan masih kosong')
      return
    }
    const payload: HabitInput = {
      ...draft,
      title,
      desc: draft.desc.trim(),
      reminder: reminderOn ? draft.reminder ?? '07:00' : null,
      mini: draft.mini.trim(),
      afterId: draft.afterId || null,
      /* Jeda Runtun dikelola langsung lewat bagiannya (scheduleRestDay /
         cancelRestDay memutasi store saat itu juga) — kirim nilai TERKINI
         milik kebiasaan, bukan draf yang mungkin basi. */
      restDays:
        mode === 'edit' && editing
          ? [...(editing.restDays ?? [])]
          : [...draft.restDays],
    }
    if (mode === 'edit' && editing) {
      updateHabit(editing.id, payload)
      toast.success('Kebiasaan diperbarui')
    } else {
      addHabit(payload)
      toast.success('Kebiasaan baru ditambahkan')
    }
    closeHabitSheet()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            key="backdrop"
            aria-hidden="true"
            onClick={closeHabitSheet}
            className="absolute inset-0 z-40 bg-espresso/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
          />
          <m.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            aria-label={
              mode === 'edit' ? 'Sunting kebiasaan' : 'Tambah kebiasaan baru'
            }
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 600)
                closeHabitSheet()
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={sheetSpring}
            className={`absolute inset-x-0 bottom-0 z-50 mx-auto max-h-[88%] w-full overflow-y-auto rounded-t-sheet bg-surface-primary px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2.5 no-scrollbar ${CONTENT_W}`}
          >
            {/* Pegangan seret */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-content-secondary/25" />
            </div>

            <div className="text-left">
              <h2 className="text-lead font-semibold tracking-tight text-content-primary">
                {mode === 'edit' ? 'Sunting Kebiasaan' : 'Kebiasaan Baru'}
              </h2>
              <p className="mt-0.5 text-note text-content-muted">
                {mode === 'edit'
                  ? 'Ubah detail, jadwal, atau kelola kebiasaan ini.'
                  : 'Tentukan nama, jadwal berulang, dan targetnya.'}
              </p>
              {editing?.archived && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1 text-eyebrow font-semibold text-content-secondary">
                  <Archive className="h-3 w-3" />
                  Kebiasaan ini sedang terarsip
                </p>
              )}
            </div>

            <div className="mt-4 space-y-4">
              {/* Nama */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="habit-title"
                  className="text-note font-semibold text-content-secondary"
                >
                  Nama kebiasaan
                </Label>
                <Input
                  id="habit-title"
                  value={draft.title}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="mis. Minum air putih 8 gelas"
                  className="h-11 rounded-xl border-border bg-surface-primary text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
                />
              </div>

              {/* Deskripsi */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="habit-desc"
                  className="text-note font-semibold text-content-secondary"
                >
                  Deskripsi
                </Label>
                <Textarea
                  id="habit-desc"
                  value={draft.desc}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, desc: e.target.value }))
                  }
                  placeholder="Catatan singkat cara menjalankannya…"
                  className="min-h-[70px] resize-none rounded-xl border-border bg-surface-primary text-content-primary [field-sizing:content] placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
                />
              </div>

              {/* Kategori */}
              <div className="space-y-1.5">
                <span className="text-note font-semibold text-content-secondary">
                  Kategori
                </span>
                <div className="flex flex-wrap gap-2">
                  {HABIT_CATS.map((c: HabitCat) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setDraft((p) => ({ ...p, cat: c }))}
                      aria-pressed={draft.cat === c}
                      className={`h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-meta font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        draft.cat === c
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border bg-surface-primary text-content-secondary hover:bg-secondary'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jadwal berulang */}
              <div className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-note font-semibold text-content-secondary">
                  <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
                  Jadwal berulang
                </span>
                <div className="flex gap-2">
                  {DISPLAY_DAYS.map((d) => {
                    const on = draft.schedule.includes(d)
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        aria-pressed={on}
                        aria-label={`Hari ${WEEKDAY_MIN[d]}`}
                        className={`h-10 flex-1 cursor-pointer rounded-xl text-meta font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                          on
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border bg-surface-primary text-content-muted hover:bg-secondary'
                        }`}
                      >
                        {WEEKDAY_MIN[d]}
                      </button>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { label: 'Setiap hari', days: [0, 1, 2, 3, 4, 5, 6] },
                    { label: 'Hari kerja', days: [1, 2, 3, 4, 5] },
                    { label: 'Akhir pekan', days: [0, 6] },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setPreset(p.days)}
                      className="h-8 cursor-pointer rounded-full border border-primary/35 bg-secondary/60 px-3 text-eyebrow font-semibold text-success transition-colors hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target pekanan */}
              <div className="space-y-1.5">
                <span className="text-note font-semibold text-content-secondary">
                  Target per pekan
                </span>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Kurangi target"
                    disabled={draft.weeklyTarget <= 1}
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        weeklyTarget: Math.max(1, p.weeklyTarget - 1),
                      }))
                    }
                    className="h-10 w-10 shrink-0 rounded-full border-border p-0 text-content-secondary hover:bg-surface-secondary hover:text-content-primary"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <p className="flex flex-1 items-baseline justify-center gap-1">
                    <span className="text-kpi-sm font-bold tabular-nums text-content-primary">
                      {draft.weeklyTarget}
                    </span>
                    <span className="text-meta font-semibold text-content-muted">
                      × / pekan
                    </span>
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Tambah target"
                    disabled={draft.weeklyTarget >= maxTarget}
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        weeklyTarget: Math.min(maxTarget, p.weeklyTarget + 1),
                      }))
                    }
                    className="h-10 w-10 shrink-0 rounded-full border-border p-0 text-content-secondary hover:bg-surface-secondary hover:text-content-primary"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Pengingat */}
              <div className="space-y-1.5">
                <span className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-note font-semibold text-content-secondary">
                    <Bell aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
                    Pengingat harian
                  </span>
                  <Switch
                    checked={reminderOn}
                    onCheckedChange={setReminderOn}
                    aria-label="Aktifkan pengingat harian"
                    className="data-[state=checked]:bg-primary"
                  />
                </span>
                {reminderOn && (
                  <m.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={fade}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface-primary px-3.5 py-2.5"
                  >
                    <Input
                      type="time"
                      value={draft.reminder ?? '07:00'}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, reminder: e.target.value }))
                      }
                      aria-label="Jam pengingat"
                      className="h-9 w-32 rounded-lg border-transparent bg-surface-sunken text-body font-semibold tabular-nums text-content-primary focus-visible:border-primary focus-visible:ring-primary/25"
                    />
                    <p className="text-eyebrow font-medium text-content-muted">
                      Pengingat dicatat pada jadwal kebiasaan — tanpa notifikasi
                      sistem di mode demo.
                    </p>
                  </m.div>
                )}
              </div>

              {/* Versi 2 Menit — bentuk terkecil kebiasaan */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="habit-mini"
                  className="flex items-center gap-1.5 text-note font-semibold text-content-secondary"
                >
                  <Zap aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
                  Versi 2 Menit
                </Label>
                <Input
                  id="habit-mini"
                  value={draft.mini}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, mini: e.target.value }))
                  }
                  placeholder="Contoh: baca satu halaman"
                  className="h-11 rounded-xl border-border bg-surface-primary text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
                />
                <p className="text-meta text-content-muted">
                  Bentuk terkecil kebiasaan ini — cukup dua menit untuk memulai.
                </p>
              </div>

              {/* Susun Kebiasaan — pasang menempel pada kebiasaan pemicu.
                  Ringkas: pemicu terpilih tampil sebagai SATU baris; daftar
                  kandidat dibuka lewat "Ubah" — dapat dicari dan dibatasi
                  tinggi (max-h-64), tidak menumbuhkan chip tanpa batas. */}
              <div className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-note font-semibold text-content-secondary">
                  <Link2
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-primary"
                  />
                  Susun Kebiasaan
                </span>
                {stackCandidates.length > 0 ? (
                  <>
                    {/* Baris pemicu terpilih — satu ketukan membuka pilihan. */}
                    <button
                      type="button"
                      onClick={() => setPickTriggerOpen((v) => !v)}
                      aria-expanded={pickTriggerOpen}
                      aria-controls="habit-trigger-picker"
                      className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-primary px-3.5 py-2.5 text-left transition-colors hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-success">
                        <Link2
                          aria-hidden="true"
                          className="h-4 w-4"
                          strokeWidth={2.2}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
                          Pemicu
                        </span>
                        <span className="block line-clamp-2 break-words text-note font-semibold leading-snug text-content-primary">
                          {triggerTitle ?? 'Tanpa pemicu'}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-meta font-bold text-success">
                        Ubah
                        <m.span
                          aria-hidden="true"
                          animate={{ rotate: pickTriggerOpen ? 180 : 0 }}
                          transition={{ duration: 0.25 }}
                          className="flex"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </m.span>
                      </span>
                    </button>

                    {/* Daftar kandidat — "Tanpa pemicu" selalu di urutan
                        pertama; pencarian menyaring kebiasaan; tinggi
                        dibatasi agar sheet tetap ringkas. */}
                    <AnimatePresence initial={false}>
                      {pickTriggerOpen && (
                        <m.div
                          id="habit-trigger-picker"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{
                            duration: motionTokens.duration.normal,
                            ease: motionTokens.easing.standard,
                          }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 pt-2">
                            <Input
                              value={triggerQuery}
                              onChange={(e) => setTriggerQuery(e.target.value)}
                              placeholder="Cari kebiasaan pemicu…"
                              aria-label="Cari kebiasaan pemicu"
                              className="h-11 rounded-xl border-border bg-surface-primary text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
                            />
                            <div
                              role="listbox"
                              aria-label="Kandidat kebiasaan pemicu"
                              className="max-h-64 space-y-1.5 overflow-y-auto no-scrollbar rounded-xl border border-border bg-surface-sunken/50 p-1.5"
                            >
                              <button
                                type="button"
                                role="option"
                                aria-selected={draft.afterId === null}
                                onClick={() => {
                                  setDraft((p) => ({ ...p, afterId: null }))
                                  setPickTriggerOpen(false)
                                }}
                                className={
                                  'flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 text-left text-note font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
                                  (draft.afterId === null
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-surface-primary text-content-secondary hover:bg-secondary hover:text-content-primary')
                                }
                              >
                                Tanpa pemicu
                              </button>
                              {filteredCandidates.map((x) => (
                                <button
                                  key={x.id}
                                  type="button"
                                  role="option"
                                  aria-selected={draft.afterId === x.id}
                                  onClick={() => {
                                    setDraft((p) => ({ ...p, afterId: x.id }))
                                    setPickTriggerOpen(false)
                                  }}
                                  className={
                                    'flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 text-left text-note font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
                                    (draft.afterId === x.id
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-surface-primary text-content-secondary hover:bg-secondary hover:text-content-primary')
                                  }
                                >
                                  <span className="min-w-0 flex-1 line-clamp-2 break-words text-left leading-snug">
                                    {x.title}
                                  </span>
                                  {draft.afterId === x.id && (
                                    <Check
                                      aria-hidden="true"
                                      className="h-4 w-4 shrink-0"
                                      strokeWidth={2.6}
                                    />
                                  )}
                                </button>
                              ))}
                              {filteredCandidates.length === 0 && (
                                <p className="px-2.5 py-2 text-meta text-content-muted">
                                  Tidak ada kebiasaan yang cocok dengan
                                  pencarian.
                                </p>
                              )}
                            </div>
                          </div>
                        </m.div>
                      )}
                    </AnimatePresence>

                    <p className="text-meta leading-relaxed text-content-muted">
                      {triggerTitle
                        ? `Setelah "${triggerTitle}", saya akan menjalankan kebiasaan ini.`
                        : 'Pilih kebiasaan pemicu — kebiasaan ini menyusul tepat setelahnya.'}
                    </p>
                  </>
                ) : (
                  <p className="text-meta text-content-muted">
                    Belum ada kebiasaan lain untuk dijadikan pemicu — tambahkan
                    dulu kebiasaan lainnya.
                  </p>
                )}
              </div>

              {/* Jeda Runtun Aman — butuh kebiasaan yang sudah ada */}
              {mode === 'edit' && editing && (
                <div className="space-y-2.5 rounded-2xl border border-border bg-surface-sunken/70 p-3.5">
                  <span className="flex items-center gap-1.5 text-note font-semibold text-content-secondary">
                    <Snowflake
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-primary"
                    />
                    Jeda Runtun Aman
                  </span>
                  <p className="text-meta leading-relaxed text-content-muted">
                    Satu hari jeda per pekan, ditetapkan sebelum tanggalnya
                    tiba. Streak tidak bertambah, tetapi juga tidak putus.
                  </p>

                  {/* Jeda terjadwal yang akan datang */}
                  {upcomingRestDays.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {upcomingRestDays.map((iso) => (
                        <span
                          key={iso}
                          className="inline-flex items-center gap-1 rounded-full bg-gold/25 px-2.5 py-1 text-eyebrow font-semibold text-espresso"
                        >
                          <Snowflake
                            aria-hidden="true"
                            className="h-3 w-3"
                          />
                          {shortDateLabel(iso)}
                        </span>
                      ))}
                    </div>
                  )}

                  {restDayOptions.length > 0 ? (
                    <div className="space-y-1.5">
                      {restDayOptions.map((iso) => {
                        const scheduled = (editing.restDays ?? []).includes(
                          iso,
                        )
                        return (
                          <div
                            key={iso}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-primary px-3 py-1.5"
                          >
                            <span className="min-w-0 truncate text-meta font-semibold text-content-primary">
                              {shortDateLabel(iso)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (scheduled) {
                                  cancelRestDay(editing.id, iso)
                                  toast(
                                    `Jeda ${shortDateLabel(iso)} dibatalkan.`,
                                  )
                                } else {
                                  const res = scheduleRestDay(editing.id, iso)
                                  if (!res.ok) {
                                    toast.error(
                                      res.error ??
                                        'Jeda tidak bisa dijadwalkan.',
                                    )
                                  } else {
                                    toast.success(
                                      `Jeda ${shortDateLabel(iso)} dijadwalkan — streak tetap aman.`,
                                    )
                                  }
                                }
                              }}
                              className={
                                'h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-eyebrow font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
                                (scheduled
                                  ? 'border border-gold/50 bg-gold/20 text-warning hover:bg-gold/30'
                                  : 'border border-primary/35 bg-surface-primary text-success hover:bg-secondary')
                              }
                            >
                              {scheduled ? 'Batalkan' : 'Jadwalkan jeda'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-meta text-content-muted">
                      Tidak ada hari terjadwal dalam 14 hari ke depan.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Aksi utama */}
            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={closeHabitSheet}
                className="h-11 flex-1 rounded-full font-semibold text-content-secondary hover:bg-surface-secondary hover:text-content-primary"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={submit}
                className="h-11 flex-1 rounded-full bg-primary font-semibold text-primary-foreground hover:bg-action-hover"
              >
                {mode === 'edit' ? (
                  <>
                    <Check className="h-4 w-4" />
                    Simpan
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Tambahkan
                  </>
                )}
              </Button>
            </div>

            {/* Zona kelola — hanya saat menyunting */}
            {mode === 'edit' && editing && (
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setHabitArchived(editing.id, !editing.archived)
                    toast.success(
                      editing.archived
                        ? 'Kebiasaan dipulihkan dari arsip'
                        : 'Kebiasaan diarsipkan',
                    )
                    closeHabitSheet()
                  }}
                  className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-surface-primary text-note font-semibold text-content-secondary transition-colors hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {editing.archived ? (
                    <>
                      <ArchiveRestore className="h-4 w-4" />
                      Pulihkan dari Arsip
                    </>
                  ) : (
                    <>
                      <Archive className="h-4 w-4" />
                      Arsipkan Kebiasaan
                    </>
                  )}
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-destructive/30 bg-surface-primary text-note font-semibold text-content-danger transition-colors hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Hapus Permanen
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[400px] rounded-sheet border-border bg-surface-primary p-6">
                    <AlertDialogHeader className="text-left">
                      <AlertDialogTitle className="text-lead tracking-tight text-content-primary">
                        Hapus kebiasaan ini?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-note text-content-muted">
                        &ldquo;{editing.title}&rdquo; beserta seluruh riwayat
                        penyelesaiannya akan dihapus. Tindakan ini tidak bisa
                        dibatalkan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-3 flex flex-row gap-2">
                      <AlertDialogCancel className="h-10 flex-1 rounded-full border-border text-note font-semibold text-content-secondary hover:bg-surface-secondary">
                        Batal
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          deleteHabit(editing.id)
                          toast.info('Kebiasaan dihapus')
                          closeHabitSheet()
                        }}
                        className="h-10 flex-1 rounded-full bg-destructive text-note font-semibold text-destructive-foreground hover:bg-destructive/90"
                      >
                        Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
