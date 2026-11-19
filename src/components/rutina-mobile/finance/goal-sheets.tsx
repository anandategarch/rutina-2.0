'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, useDragControls } from 'motion/react'
import * as m from 'motion/react-m'
import { CheckCircle2, Pencil, Sparkles, Trash2 } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { fade, sheetSpring, barFill } from '@/lib/motion/transitions'
import { CONTENT_W } from '../layout-widths'
import { RutinaDialog } from '../rutina-dialog'
import { useRutina } from '../store'
import { useFocusTrap } from '../use-focus-trap'
import { formatIDR, formatIDRShort } from './utils'

/* ================================================================= */
/* Lembar "isi tabungan" — slider + tombol cepat.                     */
/* ================================================================= */

const QUICK = [50_000, 100_000, 250_000, 500_000, 1_000_000]

const quickLabel = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toLocaleString('id-ID')} jt` : `${v / 1000} rb`

export function ContributeGoalSheet() {
  const goalSheetId = useRutina((s) => s.goalSheetId)
  const closeGoalSheet = useRutina((s) => s.closeGoalSheet)
  const contributeGoal = useRutina((s) => s.contributeGoal)
  const openGoalEdit = useRutina((s) => s.openGoalEdit)
  const deleteGoal = useRutina((s) => s.deleteGoal)
  const goals = useRutina((s) => s.goals)

  const goal = goals.find((g) => g.id === goalSheetId) ?? null
  const [amount, setAmount] = useState(100_000)
  const [prevId, setPrevId] = useState<string | null>(null)
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)

  /* Focus management: fokus awal, trap Tab, kembalikan fokus saat tutup. */
  useFocusTrap(Boolean(goal), panelRef)

  /* Reset draf tiap kali target lembar berganti. */
  if (goalSheetId !== prevId) {
    setPrevId(goalSheetId)
    if (goalSheetId) setAmount(100_000)
  }

  useEffect(() => {
    if (!goalSheetId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGoalSheet()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goalSheetId, closeGoalSheet])

  const open = Boolean(goal)
  const complete = goal ? goal.saved >= goal.target : false
  const after = goal ? Math.min(goal.target, goal.saved + amount) : 0
  const afterPct = goal ? Math.min(100, Math.round((after / goal.target) * 100)) : 0
  const beforePct = goal ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0

  const submit = () => {
    if (!goal || complete) return
    contributeGoal(goal.id, amount)
    closeGoalSheet()
    if (goal.saved + amount >= goal.target) {
      toast.success(`Target "${goal.name}" tercapai — tabungan lengkap!`)
    } else {
      toast.success(`${formatIDR(amount)} masuk ke "${goal.name}"`)
    }
  }

  return (
    <AnimatePresence>
      {open && goal && (
        <>
          <m.div
            key="backdrop"
            aria-hidden="true"
            onClick={closeGoalSheet}
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
            aria-label={`Isi tabungan ${goal.name}`}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 600) closeGoalSheet()
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={sheetSpring}
            className={`absolute inset-x-0 bottom-0 z-50 mx-auto w-full rounded-t-sheet bg-surface-primary px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 ${CONTENT_W}`}
          >
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-content-secondary/25" />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="text-left">
                <h2 className="text-lead font-semibold tracking-tight text-content-primary">
                  Isi Tabungan
                </h2>
                <p className="mt-0.5 text-note text-content-muted">
                  {goal.name} · target {formatIDRShort(goal.target)}
                </p>
              </div>
              {complete ? (
                <Badge className="border-transparent bg-pistachio/30 text-success hover:bg-pistachio/30">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Tercapai
                </Badge>
              ) : null}
            </div>

            {complete ? (
              <p className="mt-6 rounded-2xl bg-secondary px-4 py-5 text-center text-note font-medium text-success">
                Target sudah tercapai — {formatIDR(goal.saved)} terkumpul.
                Waktunya menetapkan tujuan berikutnya.
              </p>
            ) : (
              <>
                {/* Nilai terpilih */}
                <div className="mt-4 text-center">
                  <span className="text-kpi-lg font-bold leading-none tabular-nums text-success">
                    {formatIDR(amount)}
                  </span>
                  <p className="mt-1 text-eyebrow text-content-muted">
                    geser atau pilih nominal cepat
                  </p>
                </div>

                {/* Slider */}
                <Slider
                  value={[amount]}
                  onValueChange={(v) => setAmount(v[0] ?? 10_000)}
                  min={10_000}
                  max={2_000_000}
                  step={10_000}
                  aria-label="Nominal tabungan"
                  className="mt-4 [&_[data-slot=slider-range]]:bg-primary [&_[data-slot=slider-thumb]]:border-action-hover [&_[data-slot=slider-thumb]]:bg-secondary"
                />

                {/* Tombol cepat */}
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {QUICK.map((q) => {
                    const on = amount === q
                    return (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setAmount(q)}
                        aria-pressed={on}
                        className={`h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-meta font-bold transition-colors active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                          on
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border bg-surface-sunken text-content-secondary hover:bg-secondary'
                        }`}
                      >
                        {quickLabel(q)}
                      </button>
                    )
                  })}
                </div>

                {/* Pratinjau setelah menabung */}
                <div className="mt-4 rounded-2xl bg-surface-sunken px-4 py-3.5 text-left">
                  <div className="flex items-baseline justify-between text-meta text-content-muted">
                    <span>Perkiraan tabungan</span>
                    <span className="font-bold tabular-nums text-content-primary">
                      {formatIDRShort(after)} · {afterPct}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
                    <m.div
                      className="h-full origin-left rounded-full bg-gradient-to-r from-primary to-pistachio"
                      style={{ width: '100%' }}
                      initial={false}
                      animate={{ scaleX: afterPct / 100 }}
                      transition={barFill}
                    />
                  </div>
                  <p className="mt-1.5 text-eyebrow text-content-muted">
                    dari {beforePct}% sekarang — naik {afterPct - beforePct} poin
                  </p>
                </div>
              </>
            )}

            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={closeGoalSheet}
                className="h-11 flex-1 rounded-full font-semibold text-content-secondary hover:bg-surface-secondary hover:text-content-primary"
              >
                Batal
              </Button>
              {!complete && (
                <Button
                  type="button"
                  onClick={submit}
                  className="h-11 flex-1 rounded-full bg-primary font-semibold text-primary-foreground hover:bg-action-hover"
                >
                  Tabung {formatIDRShort(amount)}
                </Button>
              )}
            </div>

            {/* Zona kelola tujuan (audit CRUD v2.26) — sunting & hapus
                selalu terjangkau, termasuk tujuan yang sudah tercapai
                (dulu buntu total: tak bisa dihapus/diubah selamanya). */}
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => {
                  /* Tutup sheet dulu agar dialog sunting tidak menumpuk
                     di atasnya — pola satu lapis overlay demi satu. */
                  closeGoalSheet()
                  openGoalEdit(goal.id)
                }}
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-surface-primary text-note font-semibold text-content-secondary transition-colors hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Pencil className="h-4 w-4" />
                Sunting Tujuan
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-destructive/30 bg-surface-primary text-note font-semibold text-content-danger transition-colors hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Hapus Tujuan
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-[400px] rounded-sheet border-border bg-surface-primary p-6">
                  <AlertDialogHeader className="text-left">
                    <AlertDialogTitle className="text-lead tracking-tight text-content-primary">
                      Hapus tujuan ini?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-note text-content-muted">
                      &ldquo;{goal.name}&rdquo; beserta riwayat tabungannya
                      ({formatIDR(goal.saved)} terkumpul) akan dihapus.
                      Tindakan ini tidak bisa dibatalkan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-3 flex flex-row gap-2">
                    <AlertDialogCancel className="h-10 flex-1 rounded-full border-border text-note font-semibold text-content-secondary hover:bg-surface-secondary">
                      Batal
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        deleteGoal(goal.id)
                        closeGoalSheet()
                        toast.info('Tujuan tabungan dihapus')
                      }}
                      className="h-10 flex-1 rounded-full bg-destructive text-note font-semibold text-destructive-foreground hover:bg-destructive/90"
                    >
                      Hapus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ================================================================= */
/* Dialog "tujuan baru" — RutinaDialog (tetap di dalam bingkai      */
/* ponsel, tidak di-portal ke body).                                  */
/* ================================================================= */

const MIN_TARGET = 100_000

export function NewGoalDialog() {
  const goalDialogOpen = useRutina((s) => s.goalDialogOpen)
  const closeGoalDialog = useRutina((s) => s.closeGoalDialog)
  const addGoal = useRutina((s) => s.addGoal)

  const [name, setName] = useState('')
  const [targetDigits, setTargetDigits] = useState('')
  const [prevOpen, setPrevOpen] = useState(false)

  if (goalDialogOpen !== prevOpen) {
    setPrevOpen(goalDialogOpen)
    if (goalDialogOpen) {
      setName('')
      setTargetDigits('')
    }
  }

  const target = Number(targetDigits || '0')

  const setTarget = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 10)
    setTargetDigits(digits)
  }

  const submit = () => {
    const n = name.trim()
    if (!n) {
      toast.warning('Beri nama dulu tujuannya')
      return
    }
    if (target < MIN_TARGET) {
      toast.warning(`Target minimal ${formatIDR(MIN_TARGET)}`)
      return
    }
    addGoal(n, target)
    closeGoalDialog()
    toast.success(`Tujuan "${n}" dibuat — mulai menabung!`)
  }

  return (
    <RutinaDialog
      open={goalDialogOpen}
      onClose={closeGoalDialog}
      label="Tujuan tabungan baru"
      className="max-w-[400px] p-6"
    >
      <h2 className="flex items-center gap-2 text-lead font-semibold tracking-tight text-content-primary">
        <Sparkles className="h-5 w-5 text-success" />
        Tujuan Tabungan Baru
      </h2>
      <p className="mt-0.5 text-note text-content-muted">
        Tetapkan nama dan target — cincin progresnya muncul di tab Keuangan.
      </p>

      <div className="mt-2 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="goal-name" className="text-note font-semibold text-content-secondary">
            Nama tujuan
          </Label>
          <Input
            id="goal-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="mis. DP rumah"
            maxLength={24}
            className="h-11 rounded-xl border-input bg-surface-sunken text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="goal-target" className="text-note font-semibold text-content-secondary">
            Target <span className="font-normal text-content-muted">(min. Rp100 rb)</span>
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-section font-semibold text-content-muted">
              Rp
            </span>
            <Input
              id="goal-target"
              inputMode="numeric"
              value={targetDigits ? Number(targetDigits).toLocaleString('id-ID') : ''}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="5.000.000"
              className="h-11 rounded-xl border-input bg-surface-sunken pl-10 text-right tabular-nums text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={closeGoalDialog}
          className="h-11 flex-1 rounded-full font-semibold text-content-secondary hover:bg-surface-secondary hover:text-content-primary"
        >
          Batal
        </Button>
        <Button
          type="button"
          onClick={submit}
          className="h-11 flex-1 rounded-full bg-primary font-semibold text-primary-foreground hover:bg-action-hover"
        >
          Buat Tujuan
        </Button>
      </div>
    </RutinaDialog>
  )
}

/* ================================================================= */
/* Dialog "sunting tujuan" (audit CRUD v2.26) — praisi nama/target;  */
/* tabungan terkumpul tetap utuh.                                     */
/* ================================================================= */

export function EditGoalDialog() {
  const goalEditId = useRutina((s) => s.goalEditId)
  const closeGoalEdit = useRutina((s) => s.closeGoalEdit)
  const updateGoal = useRutina((s) => s.updateGoal)
  const goals = useRutina((s) => s.goals)

  const goal = goals.find((g) => g.id === goalEditId) ?? null
  const [name, setName] = useState('')
  const [targetDigits, setTargetDigits] = useState('')
  const [prevId, setPrevId] = useState<string | null>(null)

  /* Muat draf setiap kali target sunting berganti (pola NewGoalDialog). */
  if (goalEditId !== prevId) {
    setPrevId(goalEditId)
    if (goal) {
      setName(goal.name)
      setTargetDigits(String(goal.target))
    }
  }

  const target = Number(targetDigits || '0')

  const setTarget = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 10)
    setTargetDigits(digits)
  }

  const submit = () => {
    if (!goal) return
    const n = name.trim()
    if (!n) {
      toast.warning('Nama tujuan tidak boleh kosong')
      return
    }
    if (target < MIN_TARGET) {
      toast.warning(`Target minimal ${formatIDR(MIN_TARGET)}`)
      return
    }
    updateGoal(goal.id, { name: n, target })
    closeGoalEdit()
    toast.success('Tujuan diperbarui')
  }

  return (
    <RutinaDialog
      open={Boolean(goal)}
      onClose={closeGoalEdit}
      label="Sunting tujuan tabungan"
      className="max-w-[400px] p-6"
    >
      <h2 className="flex items-center gap-2 text-lead font-semibold tracking-tight text-content-primary">
        <Pencil className="h-5 w-5 text-content-secondary" />
        Sunting Tujuan
      </h2>
      <p className="mt-0.5 text-note text-content-muted">
        Ubah nama atau target — {formatIDRShort(goal?.saved ?? 0)} yang sudah
        terkumpul tetap utuh.
      </p>

      <div className="mt-2 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="goal-edit-name" className="text-note font-semibold text-content-secondary">
            Nama tujuan
          </Label>
          <Input
            id="goal-edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            className="h-11 rounded-xl border-input bg-surface-sunken text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="goal-edit-target" className="text-note font-semibold text-content-secondary">
            Target <span className="font-normal text-content-muted">(min. Rp100 rb)</span>
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-section font-semibold text-content-muted">
              Rp
            </span>
            <Input
              id="goal-edit-target"
              inputMode="numeric"
              value={targetDigits ? Number(targetDigits).toLocaleString('id-ID') : ''}
              onChange={(e) => setTarget(e.target.value)}
              className="h-11 rounded-xl border-input bg-surface-sunken pl-10 text-right tabular-nums text-content-primary focus-visible:border-primary focus-visible:ring-primary/25"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={closeGoalEdit}
          className="h-11 flex-1 rounded-full font-semibold text-content-secondary hover:bg-surface-secondary hover:text-content-primary"
        >
          Batal
        </Button>
        <Button
          type="button"
          onClick={submit}
          className="h-11 flex-1 rounded-full bg-primary font-semibold text-primary-foreground hover:bg-action-hover"
        >
          Simpan
        </Button>
      </div>
    </RutinaDialog>
  )
}
