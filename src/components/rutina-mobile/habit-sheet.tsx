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
  Minus,
  Plus,
  Sparkles,
  Trash2,
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
import { CONTENT_W } from './layout-widths'
import {
  HABIT_CATS,
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
  const closeHabitSheet = useRutina((s) => s.closeHabitSheet)

  const open = mode !== 'closed'
  const editing = mode === 'edit' ? habits.find((h) => h.id === habitId) : null

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [reminderOn, setReminderOn] = useState(false)
  const [prevKey, setPrevKey] = useState('')
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(open, panelRef)

  /* Muat draf setiap kali lembar dibuka / berganti target.
     Pola "sesuaikan state saat render" — sama dengan ComposeSheet. */
  const openKey = open ? `${mode}:${habitId ?? ''}` : 'closed'
  if (openKey !== prevKey) {
    setPrevKey(openKey)
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
            className="absolute inset-0 z-40 bg-espresso/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
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
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className={`absolute inset-x-0 bottom-0 z-50 mx-auto max-h-[88%] w-full overflow-y-auto rounded-t-[28px] bg-surface-primary px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2.5 no-scrollbar ${CONTENT_W}`}
          >
            {/* Pegangan seret */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-content-secondary/15" />
            </div>

            <div className="text-left">
              <h2 className="text-lg font-semibold tracking-tight text-content-primary">
                {mode === 'edit' ? 'Sunting Kebiasaan' : 'Kebiasaan Baru'}
              </h2>
              <p className="mt-0.5 text-[13px] text-content-muted">
                {mode === 'edit'
                  ? 'Ubah detail, jadwal, atau kelola kebiasaan ini.'
                  : 'Tentukan nama, jadwal berulang, dan targetnya.'}
              </p>
              {editing?.archived && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1 text-[11px] font-bold text-content-secondary">
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
                  className="text-[13px] font-semibold text-content-secondary"
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
                  className="text-[13px] font-semibold text-content-secondary"
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
                <span className="text-[13px] font-semibold text-content-secondary">
                  Kategori
                </span>
                <div className="flex flex-wrap gap-2">
                  {HABIT_CATS.map((c: HabitCat) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setDraft((p) => ({ ...p, cat: c }))}
                      aria-pressed={draft.cat === c}
                      className={`h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-[12px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
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
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-content-secondary">
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
                        className={`h-10 flex-1 cursor-pointer rounded-xl text-[12px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
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
                      className="h-8 cursor-pointer rounded-full border border-primary/35 bg-secondary/60 px-3 text-[11px] font-bold text-success transition-colors hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target pekanan */}
              <div className="space-y-1.5">
                <span className="text-[13px] font-semibold text-content-secondary">
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
                    <span className="text-[22px] font-bold tabular-nums text-content-primary">
                      {draft.weeklyTarget}
                    </span>
                    <span className="text-[12px] font-semibold text-content-muted">
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
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-content-secondary">
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
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface-primary px-3.5 py-2.5"
                  >
                    <Input
                      type="time"
                      value={draft.reminder ?? '07:00'}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, reminder: e.target.value }))
                      }
                      aria-label="Jam pengingat"
                      className="h-9 w-32 rounded-lg border-transparent bg-surface-sunken text-[14px] font-semibold tabular-nums text-content-primary focus-visible:border-primary focus-visible:ring-primary/25"
                    />
                    <p className="text-[11px] font-medium text-content-muted">
                      Pengingat dicatat pada jadwal kebiasaan — tanpa notifikasi
                      sistem di mode demo.
                    </p>
                  </m.div>
                )}
              </div>
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
                  className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-surface-primary text-[13px] font-semibold text-content-secondary transition-colors hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
                      className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-destructive/30 bg-surface-primary text-[13px] font-semibold text-content-danger transition-colors hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Hapus Permanen
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[400px] rounded-[28px] border-border bg-surface-primary p-6">
                    <AlertDialogHeader className="text-left">
                      <AlertDialogTitle className="text-lg tracking-tight text-content-primary">
                        Hapus kebiasaan ini?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-[13px] text-content-muted">
                        &ldquo;{editing.title}&rdquo; beserta seluruh riwayat
                        penyelesaiannya akan dihapus. Tindakan ini tidak bisa
                        dibatalkan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-3 flex flex-row gap-2">
                      <AlertDialogCancel className="h-10 flex-1 rounded-full border-border text-[13px] font-semibold text-content-secondary hover:bg-surface-secondary">
                        Batal
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          deleteHabit(editing.id)
                          toast.info('Kebiasaan dihapus')
                          closeHabitSheet()
                        }}
                        className="h-10 flex-1 rounded-full bg-destructive text-[13px] font-semibold text-destructive-foreground hover:bg-destructive/90"
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
