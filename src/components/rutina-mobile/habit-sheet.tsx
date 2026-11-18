'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useDragControls,
} from 'motion/react'
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
          <motion.div
            key="backdrop"
            aria-hidden="true"
            onClick={closeHabitSheet}
            className="absolute inset-0 z-40 bg-[#231F1E]/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
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
            className={`absolute inset-x-0 bottom-0 z-50 mx-auto max-h-[88%] w-full overflow-y-auto rounded-t-[28px] bg-[#FAF9F6] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2.5 no-scrollbar ${CONTENT_W}`}
          >
            {/* Pegangan seret */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-[#4A3B32]/15" />
            </div>

            <div className="text-left">
              <h2 className="text-lg font-semibold tracking-tight text-[#231F1E]">
                {mode === 'edit' ? 'Sunting Kebiasaan' : 'Kebiasaan Baru'}
              </h2>
              <p className="mt-0.5 text-[13px] text-[#4A3B32]/75">
                {mode === 'edit'
                  ? 'Ubah detail, jadwal, atau kelola kebiasaan ini.'
                  : 'Tentukan nama, jadwal berulang, dan targetnya.'}
              </p>
              {editing?.archived && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#EAE5D9] px-3 py-1 text-[11px] font-bold text-[#4A3B32]">
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
                  className="text-[13px] font-semibold text-[#4A3B32]"
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
                  className="h-11 rounded-xl border-[#4A3B3233] bg-white text-[#231F1E] placeholder:text-[#4A3B32]/40 focus-visible:border-[#749B58] focus-visible:ring-[#749B58]/25"
                />
              </div>

              {/* Deskripsi */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="habit-desc"
                  className="text-[13px] font-semibold text-[#4A3B32]"
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
                  className="min-h-[70px] resize-none rounded-xl border-[#4A3B3233] bg-white text-[#231F1E] [field-sizing:content] placeholder:text-[#4A3B32]/40 focus-visible:border-[#749B58] focus-visible:ring-[#749B58]/25"
                />
              </div>

              {/* Kategori */}
              <div className="space-y-1.5">
                <span className="text-[13px] font-semibold text-[#4A3B32]">
                  Kategori
                </span>
                <div className="flex flex-wrap gap-2">
                  {HABIT_CATS.map((c: HabitCat) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setDraft((p) => ({ ...p, cat: c }))}
                      aria-pressed={draft.cat === c}
                      className={`h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-[12px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] ${
                        draft.cat === c
                          ? 'bg-[#749B58] text-white'
                          : 'border border-[#4A3B321F] bg-white text-[#4A3B32] hover:bg-[#E4EFE0]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jadwal berulang */}
              <div className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#4A3B32]">
                  <CalendarDays className="h-3.5 w-3.5 text-[#749B58]" />
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
                        className={`h-10 flex-1 cursor-pointer rounded-xl text-[12px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] ${
                          on
                            ? 'bg-[#749B58] text-white'
                            : 'border border-[#4A3B321F] bg-white text-[#4A3B32]/60 hover:bg-[#E4EFE0]'
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
                      className="h-8 cursor-pointer rounded-full border border-[#749B58]/35 bg-[#E4EFE0]/60 px-3 text-[11px] font-bold text-[#658A4C] transition-colors hover:bg-[#E4EFE0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target pekanan */}
              <div className="space-y-1.5">
                <span className="text-[13px] font-semibold text-[#4A3B32]">
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
                    className="h-10 w-10 shrink-0 rounded-full border-[#4A3B3233] p-0 text-[#4A3B32] hover:bg-[#EAE5D9] hover:text-[#231F1E]"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <p className="flex flex-1 items-baseline justify-center gap-1">
                    <span className="text-[22px] font-bold tabular-nums text-[#231F1E]">
                      {draft.weeklyTarget}
                    </span>
                    <span className="text-[12px] font-semibold text-[#4A3B32]/70">
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
                    className="h-10 w-10 shrink-0 rounded-full border-[#4A3B3233] p-0 text-[#4A3B32] hover:bg-[#EAE5D9] hover:text-[#231F1E]"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Pengingat */}
              <div className="space-y-1.5">
                <span className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#4A3B32]">
                    <Bell className="h-3.5 w-3.5 text-[#749B58]" />
                    Pengingat harian
                  </span>
                  <Switch
                    checked={reminderOn}
                    onCheckedChange={setReminderOn}
                    aria-label="Aktifkan pengingat harian"
                    className="data-[state=checked]:bg-[#749B58]"
                  />
                </span>
                {reminderOn && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-3 rounded-xl border border-[#4A3B321F] bg-white px-3.5 py-2.5"
                  >
                    <Input
                      type="time"
                      value={draft.reminder ?? '07:00'}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, reminder: e.target.value }))
                      }
                      aria-label="Jam pengingat"
                      className="h-9 w-32 rounded-lg border-transparent bg-[#F5F3EE] text-[14px] font-semibold tabular-nums text-[#231F1E] focus-visible:border-[#749B58] focus-visible:ring-[#749B58]/25"
                    />
                    <p className="text-[11px] font-medium text-[#4A3B32]/70">
                      Pengingat dicatat pada jadwal kebiasaan — tanpa notifikasi
                      sistem di mode demo.
                    </p>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Aksi utama */}
            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={closeHabitSheet}
                className="h-11 flex-1 rounded-full font-semibold text-[#4A3B32] hover:bg-[#EAE5D9] hover:text-[#231F1E]"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={submit}
                className="h-11 flex-1 rounded-full bg-[#749B58] font-semibold text-white hover:bg-[#658A4C]"
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
              <div className="mt-4 space-y-2 border-t border-[#4A3B3214] pt-4">
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
                  className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[#4A3B32]/25 bg-white text-[13px] font-semibold text-[#4A3B32] transition-colors hover:bg-[#EAE5D9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
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
                      className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[#B25E3F]/30 bg-white text-[13px] font-semibold text-[#B25E3F] transition-colors hover:bg-[#B25E3F]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B25E3F]"
                    >
                      <Trash2 className="h-4 w-4" />
                      Hapus Permanen
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[400px] rounded-[28px] border-[#4A3B32]/10 bg-[#FAF9F6] p-6">
                    <AlertDialogHeader className="text-left">
                      <AlertDialogTitle className="text-lg tracking-tight text-[#231F1E]">
                        Hapus kebiasaan ini?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-[13px] text-[#4A3B32]/75">
                        &ldquo;{editing.title}&rdquo; beserta seluruh riwayat
                        penyelesaiannya akan dihapus. Tindakan ini tidak bisa
                        dibatalkan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-3 flex flex-row gap-2">
                      <AlertDialogCancel className="h-10 flex-1 rounded-full border-[#4A3B32]/20 text-[13px] font-semibold text-[#4A3B32] hover:bg-[#EAE5D9]">
                        Batal
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          deleteHabit(editing.id)
                          toast.info('Kebiasaan dihapus')
                          closeHabitSheet()
                        }}
                        className="h-10 flex-1 rounded-full bg-[#B25E3F] text-[13px] font-semibold text-white hover:bg-[#9E4E33]"
                      >
                        Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
